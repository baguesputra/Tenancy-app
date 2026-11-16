<?php

namespace App\Http\Controllers;

use App\Models\InspectionFinding;
use App\Models\Tenant;
use App\Services\BranchScopeService;
use App\Services\InspectionFindingService;
use App\Services\TenantScopeService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InspectionFindingController extends Controller
{
    public function __construct(
        private BranchScopeService $branchScope,
        private TenantScopeService $tenantScope,
        private InspectionFindingService $findings,
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();

        $base = InspectionFinding::query();
        $this->branchScope->apply($base, $user, 'inspection_findings.branch_id');
        if ($this->tenantScope->hasAnyScope($user)) {
            $base->whereHas('tenant', fn ($t) => $this->tenantScope->applyView($t, $user));
        }

        $agg = (clone $base)->toBase()->selectRaw("
            count(*) as total,
            sum(status = 'open') as open_count,
            sum(status = 'submitted') as submitted_count,
            sum(status = 'verified') as verified_count,
            sum(status = 'rejected') as rejected_count,
            sum(status != 'verified' and due_date is not null and due_date < ?) as overdue_count
        ", [$today])->first();

        $query = (clone $base)
            ->with([
                'tenant:id,name',
                'tenant.activeTenancy:id,tenant_id,unit_id',
                'tenant.activeTenancy.unit:id,unit_code',
                'branch:id,name',
                'verifier:id,name',
                'inspection:id,inspection_session_id,completed_at',
            ])
            ->when($request->search, fn ($q) => $q->where(function ($w) use ($request) {
                $term = "%{$request->search}%";
                $w->where('item_label', 'like', $term)
                    ->orWhere('section_name', 'like', $term)
                    ->orWhereHas('tenant', fn ($t) => $t->where('name', 'like', $term));
            }))
            ->when($request->severity, fn ($q) => $q->where('severity', $request->severity))
            ->when($request->status === 'overdue', fn ($q) => $q->where('status', '!=', 'verified')
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', $today))
            ->when($request->status && $request->status !== 'overdue', fn ($q) => $q->where('status', $request->status))
            ->orderByRaw("case when status = 'submitted' then 0 when status = 'rejected' then 1 when status = 'open' then 2 else 3 end")
            ->orderByRaw('case when due_date is null then 1 else 0 end')
            ->orderBy('due_date')
            ->latest('created_at');

        $findings = $query->paginate(15)->withQueryString()->through(function (InspectionFinding $finding) {
            return array_merge($this->findings->serialize($finding), [
                'tenant_name' => $finding->tenant?->name ?? '—',
                'tenant_id' => $finding->tenant_id,
                'unit_code' => $finding->tenant?->activeTenancy?->unit?->unit_code,
                'branch_name' => $finding->branch?->name,
                'inspection_url' => "/inspections/{$finding->inspection_id}",
                'created_at' => $finding->created_at?->toISOString(),
            ]);
        });

        return Inertia::render('InspectionFindings/Index', [
            'findings' => $findings,
            'summary' => [
                'total' => (int) ($agg->total ?? 0),
                'open' => (int) ($agg->open_count ?? 0),
                'submitted' => (int) ($agg->submitted_count ?? 0),
                'overdue' => (int) ($agg->overdue_count ?? 0),
                'verified' => (int) ($agg->verified_count ?? 0),
                'rejected' => (int) ($agg->rejected_count ?? 0),
            ],
            'filters' => $request->only(['search', 'status', 'severity']),
        ]);
    }

    public function update(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'severity' => 'required|in:'.implode(',', InspectionFinding::SEVERITIES),
            'due_date' => 'nullable|date',
            'action_required' => 'nullable|string|max:2000',
        ]);

        $this->findings->updateDetails($finding, $validated);

        return back()->with('success', 'Detail tindak lanjut temuan diperbarui.');
    }

    public function resolve(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'resolution_note' => 'required|string|max:2000',
            'resolved_by_name' => 'nullable|string|max:120',
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $this->findings->submitResolution(
            $finding,
            $validated['resolution_note'],
            $validated['resolved_by_name'] ?: $request->user()->name,
            $request->file('photo'),
            true
        );

        return back()->with('success', 'Bukti perbaikan dicatat dan menunggu verifikasi.');
    }

    public function verify(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'verification_note' => 'nullable|string|max:2000',
        ]);

        $this->findings->verify($finding, $request->user(), $validated['verification_note'] ?? null);

        return back()->with('success', 'Temuan CAPA telah diverifikasi dan ditutup.');
    }

    public function reject(InspectionFinding $finding, Request $request)
    {
        $this->authorizeAccess($finding, $request);

        $validated = $request->validate([
            'verification_note' => 'required|string|max:2000',
        ]);

        $this->findings->reject($finding, $request->user(), $validated['verification_note']);

        return back()->with('success', 'Perbaikan ditolak dan dikembalikan untuk ditindaklanjuti.');
    }

    private function authorizeAccess(InspectionFinding $finding, Request $request): void
    {
        $user = $request->user();
        abort_unless((int) $finding->branch_id === (int) $user->branch_id || $user->canViewAllBranches(), 403);

        if ($this->tenantScope->hasAnyScope($user) && $finding->tenant_id) {
            $allowed = Tenant::query()->whereKey($finding->tenant_id);
            $this->tenantScope->applyView($allowed, $user);
            abort_unless($allowed->exists(), 403);
        }
    }
}
