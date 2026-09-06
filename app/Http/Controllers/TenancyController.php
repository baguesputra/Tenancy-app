<?php

namespace App\Http\Controllers;

use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TenancyController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenancy::with(['unit.branch', 'tenant'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->search, fn ($q) => $q->whereHas('tenant', fn ($qq) => $qq->where('name', 'like', "%{$request->search}%")))
            ->latest('start_date');

        $this->applyBranchScope($query, $request->user());

        $unitQuery = Unit::query()->where('is_active', true);
        $this->applyBranchScopeToUnits($unitQuery, $request->user());

        $tenantQuery = Tenant::query()->where('is_active', true);
        if (! $request->user()->canViewAllBranches()) {
            $tenantQuery->where('branch_id', $request->user()->branch_id);
        }

        return Inertia::render('Master/Tenancies/Index', [
            'tenancies' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only(['search', 'status']),
            'units' => $unitQuery->orderBy('unit_code')->get(['id', 'unit_code', 'branch_id']),
            'tenants' => $tenantQuery->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('Master/Tenancies/Create', $this->formProps($request));
    }

    public function store(Request $request)
    {
        $validated = $this->validateTenancy($request);
        $unit = Unit::findOrFail($validated['unit_id']);
        $this->authorizeUnitAccess($unit, $request);

        if ($request->hasFile('contract_document')) {
            $validated['contract_document_path'] = $request->file('contract_document')
                ->store('tenancy-contracts', 'public');
        }

        $tenancy = Tenancy::create($validated);

        if ($tenancy->status === 'active') {
            $this->endOtherActiveTenancies($tenancy->unit_id, $tenancy->id);
        }

        return redirect()->route('tenancies.index')->with('success', 'Tenancy berhasil ditambahkan.');
    }

    public function update($id, Request $request)
    {
        $tenancy = Tenancy::findOrFail($id);
        $this->authorizeUnitAccess($tenancy->unit, $request);

        $validated = $this->validateTenancy($request);

        if ($request->hasFile('contract_document')) {
            if ($tenancy->contract_document_path) {
                \Storage::disk('public')->delete($tenancy->contract_document_path);
            }
            $validated['contract_document_path'] = $request->file('contract_document')->store('tenancy-contracts', 'public');
        } else {
            unset($validated['contract_document_path']);
        }

        $tenancy->update($validated);

        if ($tenancy->status === 'active') {
            $this->endOtherActiveTenancies($tenancy->unit_id, $tenancy->id);
        }

        return back()->with('success', 'Data tenancy berhasil diperbarui.');
    }

    public function destroy($id, Request $request)
    {
        $tenancy = Tenancy::findOrFail($id);
        $this->authorizeUnitAccess($tenancy->unit, $request);

        if ($tenancy->status !== 'draft') {
            return back()->withErrors(['tenancy' => 'Tenancy yang sudah aktif/berakhir tidak bisa dihapus, hanya boleh diubah statusnya jadi "terminated".']);
        }

        $tenancy->delete();

        return back()->with('success', 'Tenancy berhasil dihapus.');
    }

    /**
     * Aturan bisnis inti: 1 unit cuma boleh punya 1 tenancy aktif.
     * Begitu tenancy baru/diedit jadi 'active', tenancy aktif lain
     * di unit yang sama otomatis diakhiri.
     */
    private function endOtherActiveTenancies(int $unitId, int $exceptTenancyId): void
    {
        Tenancy::where('unit_id', $unitId)
            ->where('id', '!=', $exceptTenancyId)
            ->where('status', 'active')
            ->update([
                'status' => 'ended',
                'end_date' => now(),
            ]);
    }

    private function validateTenancy(Request $request): array
    {
        return $request->validate([
            'unit_id' => 'required|exists:units,id',
            'tenant_id' => 'required|exists:tenants,id',
            'contract_number' => 'nullable|string|max:100',
            'contract_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'signed_date' => 'nullable|date',
            'status' => 'required|in:draft,active,ended,terminated',
            'rent_value' => 'nullable|numeric|min:0',
            'rent_period' => 'nullable|string|max:50',
            'service_charge' => 'nullable|numeric|min:0',
            'deposit_value' => 'nullable|numeric|min:0',
            'payment_term' => 'nullable|string|max:100',
            'percentage_rent_rate' => 'nullable|numeric|min:0|max:100',
            'percentage_rent_breakpoint' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);
    }

    private function formProps(Request $request): array
    {
        $query = Unit::query()->where('is_active', true);
        $this->applyBranchScopeToUnits($query, $request->user());

        $tenantQuery = Tenant::query()->where('is_active', true);
        if (! $request->user()->canViewAllBranches()) {
            $tenantQuery->where('branch_id', $request->user()->branch_id);
        }

        return [
            'units' => $query->orderBy('unit_code')->get(['id', 'unit_code', 'branch_id']),
            'tenants' => $tenantQuery->orderBy('name')->get(['id', 'name']),
        ];
    }

    private function applyBranchScope($query, $user): void
    {
        if (! $user->canViewAllBranches()) {
            $query->whereHas('unit', fn ($q) => $q->where('branch_id', $user->branch_id));
        }
    }

    private function applyBranchScopeToUnits($query, $user): void
    {
        if (! $user->canViewAllBranches()) {
            $query->where('branch_id', $user->branch_id);
        }
    }

    private function authorizeUnitAccess(Unit $unit, Request $request): void
    {
        $user = $request->user();
        abort_unless($unit->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}