<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Unit;
use App\Models\UnitGroup;
use App\Services\BranchScopeService;
use App\Services\UnitGroupNameService;
use App\Services\UnitPackageService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UnitGroupController extends Controller
{
    public function __construct(
        private BranchScopeService $branchScope,
        private UnitGroupNameService $names,
        private UnitPackageService $packages,
    ) {}

    public function index(Request $request)
    {
        $groups = UnitGroup::with(['branch', 'units' => fn ($q) => $q->orderBy('unit_number')])
            ->orderBy('name');

        $this->branchScope->apply($groups, $request->user());

        $unitsQuery = Unit::where('usage_type', 'tenant')
            ->where('is_active', true)
            ->with(['group', 'activeTenancy.tenant'])
            ->orderBy('floor')->orderBy('unit_number');

        $this->branchScope->apply($unitsQuery, $request->user());

        $units = $unitsQuery->get(['id', 'branch_id', 'floor', 'block', 'unit_number', 'unit_code', 'size'])
            ->map(function (Unit $unit) {
                $group = $unit->group->first();

                return [
                    'id' => $unit->id,
                    'branch_id' => $unit->branch_id,
                    'floor' => $unit->floor,
                    'block' => $unit->block,
                    'unit_number' => $unit->unit_number,
                    'unit_code' => $unit->unit_code,
                    'size' => $unit->size,
                    'group_id' => $group?->id,
                    'group_name' => $group?->name,
                    'tenant_id' => $unit->activeTenancy?->tenant_id,
                    'tenant_name' => $unit->activeTenancy?->tenant?->name,
                ];
            });

        return Inertia::render('Master/Units/Groups', [
            'groups' => $groups->get(),
            'units' => $units,
            'branches' => $request->user()->canViewAllBranches() ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateGroup($request);
        $validated['branch_id'] = $validated['branch_id'] ?? $request->user()->branch_id;
        $unitIds = $this->validatedUnitIds($request, (int) $validated['branch_id']);

        $group = UnitGroup::create($this->groupAttributes($validated, $unitIds));
        $this->syncUnits($group, $unitIds, $validated['primary_unit_id'] ?? null);

        return back()->with('success', 'Area gabungan dibuat.');
    }

    public function update(int $id, Request $request)
    {
        $group = UnitGroup::findOrFail($id);
        $this->authorizeAccess($group, $request);

        $validated = $this->validateGroup($request);
        $unitIds = $this->validatedUnitIds($request, $group->branch_id, $group->id);

        $group->update($this->groupAttributes($validated, $unitIds, $group));
        $this->syncUnits($group, $unitIds, $validated['primary_unit_id'] ?? null);

        return back()->with('success', 'Area gabungan diperbarui.');
    }

    public function destroy(int $id, Request $request)
    {
        $group = UnitGroup::findOrFail($id);
        $this->authorizeAccess($group, $request);

        if ($group->activeTenancy()->exists()) {
            return back()->withErrors([
                'group' => 'Area gabungan masih punya kontrak aktif. Akhiri kontraknya dulu sebelum dihapus.',
            ]);
        }

        $group->units()->detach();
        $group->delete();

        return back()->with('success', 'Area gabungan dihapus.');
    }

    private function validateGroup(Request $request): array
    {
        $canPickBranch = $request->user()->canViewAllBranches();

        return $request->validate([
            'branch_id' => $canPickBranch ? 'required|exists:branches,id' : 'nullable',
            'name' => 'nullable|string|max:100',
            'name_auto' => 'boolean',
            'code' => 'nullable|string|max:50',
            'size' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'unit_ids' => 'required|array|min:1',
            'unit_ids.*' => 'integer|exists:units,id',
            'primary_unit_id' => 'nullable|integer|exists:units,id',
        ]);
    }

    /**
     * Semua unit harus satu cabang, jenis tenant, dan belum masuk area lain.
     *
     * @return array<int, int>
     */
    private function validatedUnitIds(Request $request, int $branchId, ?int $ignoreGroupId = null): array
    {
        // Unit milik tenant yang sama selalu satu paket: lengkapi pilihan yang
        // hanya membawa sebagian sebelum validasi bentrok area.
        $ids = $this->packages->expand(
            $request->input('unit_ids', []),
            $branchId,
            $ignoreGroupId,
        );

        $units = Unit::whereIn('id', $ids)->get(['id', 'branch_id', 'usage_type']);

        if ($units->count() !== count($ids)) {
            throw ValidationException::withMessages(['unit_ids' => 'Ada unit yang tidak ditemukan.']);
        }

        $wrongBranch = $units->firstWhere('branch_id', '!=', $branchId);
        if ($wrongBranch) {
            throw ValidationException::withMessages(['unit_ids' => 'Semua unit harus berada di cabang yang sama.']);
        }

        if ($units->contains(fn ($u) => $u->usage_type !== 'tenant')) {
            throw ValidationException::withMessages(['unit_ids' => 'Hanya unit dengan jenis pemakaian "Disewakan" yang bisa digabung.']);
        }

        $conflict = UnitGroup::whereHas('units', fn ($q) => $q->whereIn('units.id', $ids))
            ->when($ignoreGroupId, fn ($q) => $q->where('id', '!=', $ignoreGroupId))
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages(['unit_ids' => 'Ada unit yang sudah menjadi anggota area gabungan lain.']);
        }

        return $ids;
    }

    private function groupAttributes(array $validated, array $unitIds, ?UnitGroup $group = null): array
    {
        $branchId = (int) ($validated['branch_id'] ?? $group?->branch_id);
        $units = Unit::whereIn('id', $unitIds)->get(['id', 'block', 'floor', 'unit_number', 'unit_code', 'size']);
        $nameAuto = (bool) ($validated['name_auto'] ?? false);

        $name = $nameAuto
            ? $this->names->unique(
                $this->names->suggest($units),
                $branchId,
                $group?->id,
                $unitIds,
                $units->first()?->block,
            )
            : $this->manualName($validated['name'] ?? '', $branchId, $group?->id, $unitIds);

        $size = $validated['size'] ?? null;

        if ($size === null || $size === '') {
            $size = $units->sum('size') ?: null;
        }

        return [
            'branch_id' => $branchId,
            'name' => $name,
            'name_auto' => $nameAuto,
            'code' => $validated['code'] ?? null,
            'size' => $size,
            'is_active' => $validated['is_active'] ?? true,
        ];
    }

    /**
     * Nama manual tidak boleh menabrak nama area, kode unit, atau nomor unit lain.
     *
     * @param  array<int, int>  $unitIds
     */
    private function manualName(string $name, int $branchId, ?int $ignoreGroupId, array $unitIds): string
    {
        $name = trim($name);

        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Nama area wajib diisi.']);
        }

        if ($this->names->taken($name, $branchId, $ignoreGroupId, $unitIds)) {
            throw ValidationException::withMessages([
                'name' => 'Nama area bentrok dengan nama area, kode unit, atau nomor unit lain.',
            ]);
        }

        return $name;
    }

    private function syncUnits(UnitGroup $group, array $unitIds, ?int $primaryUnitId): void
    {
        $primary = $primaryUnitId && in_array($primaryUnitId, $unitIds, true) ? $primaryUnitId : $unitIds[0];

        $group->units()->sync(
            collect($unitIds)->mapWithKeys(fn ($id) => [$id => ['is_primary' => $id === $primary]])->all()
        );
    }

    private function authorizeAccess(UnitGroup $group, Request $request): void
    {
        $user = $request->user();
        abort_unless($group->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
