<?php

namespace App\Services;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Builder;

/**
 * Paket tenant: satu tenant bisa menempati beberapa unit yang belum digabung
 * jadi area. Memilih satu unit menarik seluruh unit tenant tersebut.
 */
class UnitPackageService
{
    /**
     * Unit layak masuk paket: unit tenant aktif, belum menjadi anggota area
     * gabungan lain (area yang sedang diedit tetap dihitung).
     */
    private function eligibleQuery(int $tenantId, int $branchId, ?int $ignoreGroupId = null): Builder
    {
        return Unit::query()
            ->where('branch_id', $branchId)
            ->where('usage_type', 'tenant')
            ->where('is_active', true)
            ->whereHas('activeTenancy', fn (Builder $q) => $q->where('tenant_id', $tenantId))
            ->when(
                $ignoreGroupId,
                fn (Builder $q) => $q->where(fn (Builder $w) => $w
                    ->whereDoesntHave('group')
                    ->orWhereHas('group', fn (Builder $g) => $g->where('unit_groups.id', $ignoreGroupId))),
                fn (Builder $q) => $q->whereDoesntHave('group'),
            );
    }

    /**
     * @return array<int, int>
     */
    public function eligibleUnitIds(int $tenantId, int $branchId, ?int $ignoreGroupId = null): array
    {
        return $this->eligibleQuery($tenantId, $branchId, $ignoreGroupId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Lengkapi pilihan dengan seluruh unit paket tenant. Tenant dengan kurang
     * dari 2 unit layak tidak dianggap paket sehingga pilihan tidak berubah.
     *
     * @param  array<int, int|string>  $unitIds
     * @return array<int, int>
     */
    public function expand(array $unitIds, int $branchId, ?int $ignoreGroupId = null): array
    {
        return $this->expandForTenants($unitIds, null, $branchId, $ignoreGroupId);
    }

    /**
     * Ekspansi khusus LOO: hanya bila tenant pemilik unit sama dengan tenant
     * LOO. LOO untuk tenant baru tidak menarik unit tenant lama.
     *
     * @param  array<int, int|string>  $unitIds
     * @return array<int, int>
     */
    public function expandForTenant(array $unitIds, ?int $tenantId, int $branchId): array
    {
        if (! $tenantId) {
            return $this->normalize($unitIds);
        }

        return $this->expandForTenants($unitIds, $tenantId, $branchId);
    }

    /**
     * Paket unit per tenant (hanya tenant dengan minimal 2 unit layak).
     *
     * @param  array<int, int>  $tenantIds
     * @return array<int, array<int, array{id: int, name: string}>>
     */
    public function packagesForTenants(array $tenantIds, int $branchId): array
    {
        $tenantIds = array_values(array_unique(array_filter(array_map('intval', $tenantIds))));

        if ($tenantIds === []) {
            return [];
        }

        $units = Unit::query()
            ->where('branch_id', $branchId)
            ->where('usage_type', 'tenant')
            ->where('is_active', true)
            ->whereDoesntHave('group')
            ->whereHas('activeTenancy', fn (Builder $q) => $q->whereIn('tenant_id', $tenantIds))
            ->with(['activeTenancy' => fn ($q) => $q->select('id', 'unit_id', 'tenant_id')])
            ->orderBy('floor')
            ->orderBy('block')
            ->orderBy('unit_number')
            ->get(['id', 'unit_code']);

        $packages = [];

        foreach ($units as $unit) {
            $tenantId = (int) ($unit->activeTenancy?->tenant_id ?? 0);

            if ($tenantId === 0) {
                continue;
            }

            $packages[$tenantId][] = [
                'id' => (int) $unit->id,
                'name' => (string) $unit->unit_code,
            ];
        }

        return array_filter($packages, fn (array $items) => count($items) >= 2);
    }

    /**
     * @param  array<int, int|string>  $unitIds
     * @return array<int, int>
     */
    private function expandForTenants(
        array $unitIds,
        ?int $onlyTenantId,
        int $branchId,
        ?int $ignoreGroupId = null,
    ): array {
        $ids = $this->normalize($unitIds);

        if ($ids === []) {
            return [];
        }

        $tenantIds = Unit::whereIn('id', $ids)
            ->with(['activeTenancy' => fn ($q) => $q->select('id', 'unit_id', 'tenant_id')])
            ->get(['id'])
            ->map(fn (Unit $unit) => $unit->activeTenancy?->tenant_id)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        foreach ($tenantIds as $tenantId) {
            if ($onlyTenantId !== null && $tenantId !== $onlyTenantId) {
                continue;
            }

            $eligible = $this->eligibleUnitIds($tenantId, $branchId, $ignoreGroupId);

            if (count($eligible) >= 2) {
                $ids = array_merge($ids, $eligible);
            }
        }

        return $this->normalize($ids);
    }

    /**
     * @param  array<int, int|string>  $ids
     * @return array<int, int>
     */
    private function normalize(array $ids): array
    {
        return array_values(array_unique(array_map('intval', $ids)));
    }
}
