<?php

namespace App\Services;

use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitGroup;
use Illuminate\Support\Facades\DB;

/**
 * Saat LOO masuk status `completed`, semua section sudah terisi dan disubmit.
 * Service ini materialize hasil itu jadi Tenant + Tenancy di master data.
 *
 * Idempoten: dipanggil ulang tidak menggandakan baris (cek `loo_id` dulu).
 */
class TenantSyncService
{
    public function sync(Loo $loo): array
    {
        return DB::transaction(function () use ($loo) {
            $sections = $this->sections($loo);
            $tenant = $this->syncTenant($loo, $sections);
            $tenancies = $this->syncTenancies($loo, $tenant, $sections);

            return [$tenant, $tenancies[0] ?? null];
        });
    }

    private function syncTenant(Loo $loo, array $sections): Tenant
    {
        $legal = $sections['legalitas'] ?? [];
        $mgmt = $sections['manajemen_tenant'] ?? [];
        $fitout = $sections['pre_fitout'] ?? [];

        $unitIds = $this->unitIds($loo, $mgmt);
        $units = $unitIds === []
            ? collect()
            : Unit::whereIn('id', $unitIds)->orderBy('unit_number')->get(['id', 'unit_code', 'floor']);

        $primary = $loo->unit ?? $units->first();

        $attributes = [
            'loo_id' => $loo->id,
            'branch_id' => $loo->branch_id,
            'name' => $mgmt['brand_name'] ?? $loo->prospective_tenant_name ?? 'Tenant LOO-'.$loo->loo_number,
            'trade_name' => $mgmt['trade_name'] ?? null,
            'legal_entity_name' => $legal['entity_name'] ?? null,
            'entity_type' => $legal['entity_type'] ?? null,
            'npwp_file_path' => $legal['npwp'] ?? null,
            'nib_file_path' => $legal['nib'] ?? null,
            'akta_file_path' => $legal['sk_pendirian'] ?? null,
            'akta_date' => $legal['tgl_sk_pendirian'] ?? null,
            'akta_perubahan_file_path' => $legal['akta_perubahan_terakhir'] ?? null,
            'power_of_attorney_file_path' => $legal['surat_kuasa'] ?? null,
            'ktp_file_path' => $legal['ktp'] ?? null,
            'ktp_badan_hukum_file_path' => $legal['ktp_badan_hukum'] ?? null,
            'legal_pic_name' => $legal['pic_legal_name'] ?? null,
            'legal_pic_phone' => $legal['pic_legal_phone'] ?? null,
            'legal_pic_email' => $legal['pic_legal_email'] ?? null,
            'fitout_pic_name' => $fitout['contractor_pic_name'] ?? null,
            'fitout_pic_phone' => $fitout['contractor_pic_phone'] ?? null,
            'description' => $mgmt['tenant_mgmt_notes'] ?? null,
            'floor_map' => $primary?->floor,
            'location_map' => $units->isNotEmpty()
                ? $units->pluck('unit_code')->implode(', ')
                : $loo->unit?->unit_code,
            'fitout_drawing_file_path' => $fitout['design_drawing_path'] ?? null,
            'tenant_category_id' => $loo->tenant_category_id,
            'product_category_id' => $this->firstProductCategory($mgmt) ?? $this->fallbackProductCategory($loo->branch_id),
            'is_active' => true,
            'created_by' => $loo->marketing_id,
        ];

        $tenant = Tenant::where('loo_id', $loo->id)->first();

        if ($tenant) {
            $tenant->fill($attributes)->save();
        } else {
            $tenant = Tenant::create($attributes);
            $this->syncContacts($tenant, $mgmt);
        }

        return $tenant->fresh();
    }

    /**
     * @return array<int, Tenancy>
     */
    private function syncTenancies(Loo $loo, Tenant $tenant, array $sections): array
    {
        $mgmt = $sections['manajemen_tenant'] ?? [];
        $unitIds = $this->unitIds($loo, $mgmt);

        if ($unitIds === []) {
            return [];
        }

        $acct = $sections['biaya_termin'] ?? [];
        $ba = $sections['ba_handover'] ?? [];
        $groupId = isset($mgmt['unit_group_id']) && $mgmt['unit_group_id'] !== ''
            ? (int) $mgmt['unit_group_id']
            : null;

        $group = $groupId ? UnitGroup::find($groupId) : null;

        // Area gabungan = satu kontrak, satu tenancy (unit primary grup).
        if ($group) {
            $primaryId = Unit::whereIn('id', $unitIds)
                ->orderBy('unit_number')
                ->value('id') ?? $unitIds[0];

            $tenancy = $this->syncTenancyForUnit($loo, $tenant, $primaryId, $acct, $ba, $group->id);

            // Unit lain di grup tidak boleh punya kontrak aktif lain.
            Tenancy::whereIn('unit_id', $unitIds)
                ->where('id', '!=', $tenancy->id)
                ->where('status', 'active')
                ->update(['status' => 'ended', 'end_date' => now()]);

            // Tenancy lain milik kontrak ini yang bukan tenancy grup diakhiri.
            Tenancy::where('tenant_id', $tenant->id)
                ->where('contract_number', $loo->loo_number)
                ->where('id', '!=', $tenancy->id)
                ->where('status', 'active')
                ->update(['status' => 'ended', 'end_date' => now()]);

            return [$tenancy];
        }

        $tenancies = [];

        foreach ($unitIds as $unitId) {
            $tenancies[] = $this->syncTenancyForUnit($loo, $tenant, $unitId, $acct, $ba);
        }

        // Unit yang tidak lagi dipilih untuk kontrak ini tidak boleh tetap aktif.
        Tenancy::where('tenant_id', $tenant->id)
            ->where('contract_number', $loo->loo_number)
            ->whereNotIn('unit_id', $unitIds)
            ->where('status', 'active')
            ->update(['status' => 'ended', 'end_date' => now()]);

        return $tenancies;
    }

    private function syncTenancyForUnit(
        Loo $loo,
        Tenant $tenant,
        int $unitId,
        array $acct,
        array $ba,
        ?int $unitGroupId = null,
    ): Tenancy {
        $existing = Tenancy::where('tenant_id', $tenant->id)
            ->where('unit_id', $unitId)
            ->whereNull('end_date')
            ->first();

        $attributes = [
            'unit_id' => $unitId,
            'unit_group_id' => $unitGroupId,
            'tenant_id' => $tenant->id,
            'contract_number' => $loo->loo_number,
            'start_date' => $acct['contract_start_date'] ?? now()->toDateString(),
            'end_date' => $acct['contract_end_date'] ?? null,
            'signed_date' => $ba['handover_date'] ?? null,
            'status' => 'active',
            'rent_value' => $acct['monthly_rent'] ?? null,
            'service_charge' => $acct['service_charge'] ?? null,
            'total_area_sqm' => $acct['area_sqm_loo'] ?? null,
            'rent_per_sqm_indoor' => $acct['rent_per_sqm'] ?? null,
            'down_payment_percent' => $acct['fitout_dp_pct'] ?? null,
            'deposit_value' => $this->depositValue($acct),
            'sp_date' => $ba['handover_date'] ?? null,
            'sp_number' => $loo->loo_number,
        ];

        if ($existing) {
            $existing->fill($attributes)->save();
        } else {
            $existing = Tenancy::create($attributes);
        }

        // Aturan bisnis inti: 1 unit hanya boleh punya 1 tenancy aktif.
        Tenancy::where('unit_id', $unitId)
            ->where('id', '!=', $existing->id)
            ->where('status', 'active')
            ->update(['status' => 'ended', 'end_date' => now()]);

        return $existing->fresh();
    }

    /**
     * Unit terpilih dari section tenant; fallback `loos.unit_id` untuk data lama.
     *
     * @return array<int, int>
     */
    private function unitIds(Loo $loo, array $mgmt): array
    {
        $ids = LooSectionService::decodeList($mgmt['unit_ids'] ?? ($mgmt['unit_id'] ?? []));

        if ($ids === [] && $loo->unit_id) {
            $ids = [$loo->unit_id];
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    private function sections(Loo $loo): array
    {
        return $loo->sections()
            ->where('is_submitted', true)
            ->get()
            ->mapWithKeys(fn ($s) => [$s->section_key => $s->data ?? []])
            ->all();
    }

    private function firstProductCategory(array $mgmt): ?int
    {
        $ids = collect(LooSectionService::decodeList($mgmt['product_categories'] ?? []))
            ->filter(fn ($v) => is_numeric($v))
            ->map(fn ($v) => (int) $v)
            ->values();

        return $ids->first();
    }

    private function fallbackProductCategory(int $branchId): ?int
    {
        return ProductCategory::query()->orderBy('id')->value('id');
    }

    private function depositValue(array $acct): ?float
    {
        $rent = (float) ($acct['monthly_rent'] ?? 0);
        $months = (float) ($acct['security_deposit'] ?? 0);

        return $rent > 0 && $months > 0 ? round($rent * $months, 2) : null;
    }

    private function syncContacts(Tenant $tenant, array $mgmt): void
    {
        $contact = trim(($mgmt['contact_person_name'] ?? '').' '.($mgmt['contact_person_phone'] ?? ''));

        if ($contact !== '' && $mgmt['contact_person_name']) {
            $tenant->contacts()->updateOrCreate(
                ['type' => 'operasional'],
                [
                    'name' => $mgmt['contact_person_name'],
                    'phone' => $mgmt['contact_person_phone'] ?? null,
                    'email' => $mgmt['contact_person_email'] ?? null,
                    'position' => 'Contact Person',
                ]
            );
        }

        $emergency = $mgmt['emergency_contact_name'] ?? null;
        if ($emergency) {
            $tenant->contacts()->updateOrCreate(
                ['type' => 'darurat'],
                [
                    'name' => $emergency,
                    'phone' => $mgmt['emergency_contact_phone'] ?? null,
                ]
            );
        }
    }
}
