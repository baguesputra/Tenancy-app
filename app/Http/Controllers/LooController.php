<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LooController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $query = Loo::with(['branch:id,name', 'tenant:id,name', 'tenantCategory:id,name', 'marketing:id,name'])
            ->when($request->search, fn ($q) => $q->where('loo_number', 'like', "%{$request->search}%")
                ->orWhere('prospective_tenant_name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->current_stage, fn ($q) => $q->where('current_stage', $request->current_stage))
            ->latest();

        $this->branchScope->apply($query, $request->user());

        $summary = [
            'total' => (clone $query)->count(),
            'draft' => (clone $query)->where('status', 'draft')->count(),
            'legal_review' => (clone $query)->where('status', 'legal_review')->count(),
            'accounting_review' => (clone $query)->where('status', 'accounting_review')->count(),
            'tenant_mgmt_review' => (clone $query)->where('status', 'tenant_mgmt_review')->count(),
            'measurement' => (clone $query)->where('status', 'measurement')->count(),
            'ba_handover' => (clone $query)->where('status', 'ba_handover')->count(),
            'fitout' => (clone $query)->where('status', 'fitout')->count(),
            'pre_handover' => (clone $query)->where('status', 'pre_handover')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
        ];

        return Inertia::render('Loos/Index', [
            'loos' => $query->paginate(15)->withQueryString(),
            'summary' => $summary,
            'filters' => $request->only(['search', 'status', 'current_stage']),
            'statusOptions' => [
                ['value' => 'draft', 'label' => 'Draft'],
                ['value' => 'legal_review', 'label' => 'Legal Review'],
                ['value' => 'accounting_review', 'label' => 'Accounting Review'],
                ['value' => 'tenant_mgmt_review', 'label' => 'Tenant Mgmt Review'],
                ['value' => 'measurement', 'label' => 'Measurement'],
                ['value' => 'ba_handover', 'label' => 'BA Handover'],
                ['value' => 'fitout', 'label' => 'Fitout'],
                ['value' => 'pre_handover', 'label' => 'Pre-Handover'],
                ['value' => 'completed', 'label' => 'Completed'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
            ],
            'stageOptions' => [
                ['value' => 'marketing', 'label' => 'Marketing'],
                ['value' => 'legal', 'label' => 'Legal'],
                ['value' => 'accounting', 'label' => 'Accounting'],
                ['value' => 'tenant_mgmt', 'label' => 'Tenant Mgmt'],
                ['value' => 'measurement', 'label' => 'Measurement'],
                ['value' => 'ba_handover', 'label' => 'BA Handover'],
                ['value' => 'fitout', 'label' => 'Fitout'],
                ['value' => 'pre_handover', 'label' => 'Pre-Handover'],
            ],
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Loos/Create', [
            'branches' => Branch::orderBy('name')->get(['id', 'name', 'code']),
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'marketings' => User::whereHas('roles', fn ($q) => $q->whereIn('name', ['marketing_loo_input', 'marketing_manager']))
                ->get(['id', 'name']),
            'tenants' => $user->canViewAllBranches()
                ? Tenant::where('is_active', true)->orderBy('name')->get(['id', 'name'])
                : Tenant::where('branch_id', $user->branch_id)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'marketing_id' => 'required|exists:users,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'tenant_category_id' => 'nullable|exists:tenant_categories,id',
            'prospective_tenant_name' => 'nullable|string|max:255',
            'loo_received_date' => 'nullable|date',
            'loo_distributor' => 'nullable|string|max:255',
            'cover_file' => 'nullable|file|mimes:pdf|max:10240',
            'isi_file' => 'nullable|file|mimes:pdf|max:10240',
            'loo_letter_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'loo_proposal_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('cover_file')) {
            $validated['cover_file_path'] = $request->file('cover_file')->store('loos/covers', 'public');
        }
        if ($request->hasFile('isi_file')) {
            $validated['isi_file_path'] = $request->file('isi_file')->store('loos/isi', 'public');
        }
        if ($request->hasFile('loo_letter_file')) {
            $validated['loo_letter_file_path'] = $request->file('loo_letter_file')->store('loos/letters', 'public');
        }
        if ($request->hasFile('loo_proposal_file')) {
            $validated['loo_proposal_file_path'] = $request->file('loo_proposal_file')->store('loos/proposals', 'public');
        }

        unset($validated['cover_file'], $validated['isi_file'], $validated['loo_letter_file'], $validated['loo_proposal_file']);

        $branch = Branch::find($validated['branch_id']);
        $year = now()->year;
        $validated['loo_number'] = Loo::generateLooNumber($branch->code, $year);
        $validated['status'] = 'draft';
        $validated['current_stage'] = 'marketing';

        $loo = Loo::create($validated);

        return redirect()->route('loos.show', $loo->id)->with('success', 'LOO berhasil dibuat.');
    }

    public function show(Loo $loo, Request $request)
    {
        $this->authorize('view', $loo);
        $loo->load(['branch', 'tenant', 'tenantCategory', 'marketing', 'history.user']);

        return Inertia::render('Loos/Show', [
            'loo' => $loo,
        ]);
    }

    public function edit(Loo $loo, Request $request)
    {
        $this->authorize('update', $loo);

        return Inertia::render('Loos/Edit', [
            'loo' => $loo,
            'branches' => Branch::orderBy('name')->get(['id', 'name', 'code']),
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'marketings' => User::role('marketing_loo_input')->orWhereHas('roles', fn ($q) => $q->where('name', 'marketing_manager'))->get(['id', 'name']),
            'tenants' => Tenant::where('branch_id', $loo->branch_id)->where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Loo $loo)
    {
        $this->authorize('update', $loo);
        abort_unless($loo->status === 'draft', 422, 'LOO yang sudah tidak draft tidak bisa diubah.');

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'marketing_id' => 'required|exists:users,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'tenant_category_id' => 'nullable|exists:tenant_categories,id',
            'prospective_tenant_name' => 'nullable|string|max:255',
            'loo_received_date' => 'nullable|date',
            'loo_distributor' => 'nullable|string|max:255',
            'cover_file' => 'nullable|file|mimes:pdf|max:10240',
            'isi_file' => 'nullable|file|mimes:pdf|max:10240',
            'loo_letter_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'loo_proposal_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('cover_file')) {
            if ($loo->cover_file_path) {
                Storage::disk('public')->delete($loo->cover_file_path);
            }
            $validated['cover_file_path'] = $request->file('cover_file')->store('loos/covers', 'public');
        }
        if ($request->hasFile('isi_file')) {
            if ($loo->isi_file_path) {
                Storage::disk('public')->delete($loo->isi_file_path);
            }
            $validated['isi_file_path'] = $request->file('isi_file')->store('loos/isi', 'public');
        }
        if ($request->hasFile('loo_letter_file')) {
            if ($loo->loo_letter_file_path) {
                Storage::disk('public')->delete($loo->loo_letter_file_path);
            }
            $validated['loo_letter_file_path'] = $request->file('loo_letter_file')->store('loos/letters', 'public');
        }
        if ($request->hasFile('loo_proposal_file')) {
            if ($loo->loo_proposal_file_path) {
                Storage::disk('public')->delete($loo->loo_proposal_file_path);
            }
            $validated['loo_proposal_file_path'] = $request->file('loo_proposal_file')->store('loos/proposals', 'public');
        }

        unset($validated['cover_file'], $validated['isi_file'], $validated['loo_letter_file'], $validated['loo_proposal_file']);

        $loo->update($validated);

        return back()->with('success', 'LOO berhasil diperbarui.');
    }

    public function transition(Request $request, Loo $loo)
    {
        $this->authorize('transition', $loo);

        $validated = $request->validate([
            'status' => 'required|in:legal_review,accounting_review,tenant_mgmt_review,measurement,ba_handover,fitout,pre_handover,completed,cancelled',
            'cancel_reason' => 'nullable|string',
        ]);

        $loo->updateStatus($validated['status']);
        if ($validated['status'] === 'cancelled') {
            $loo->cancel_reason = $validated['cancel_reason'];
            $loo->save();
        }

        return back()->with('success', 'Status LOO berhasil diperbarui.');
    }

    public function destroy(Loo $loo, Request $request)
    {
        $this->authorize('delete', $loo);
        abort_unless($loo->status === 'draft', 422, 'Hanya LOO draft yang bisa dihapus.');

        if ($loo->cover_file_path) {
            Storage::disk('public')->delete($loo->cover_file_path);
        }
        if ($loo->isi_file_path) {
            Storage::disk('public')->delete($loo->isi_file_path);
        }
        if ($loo->loo_letter_file_path) {
            Storage::disk('public')->delete($loo->loo_letter_file_path);
        }
        if ($loo->loo_proposal_file_path) {
            Storage::disk('public')->delete($loo->loo_proposal_file_path);
        }

        $loo->delete();

        return redirect()->route('loos.index')->with('success', 'LOO berhasil dihapus.');
    }

    private function authorize(string $ability, Loo $loo): void
    {
        $user = request()->user();
        abort_unless($loo->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
