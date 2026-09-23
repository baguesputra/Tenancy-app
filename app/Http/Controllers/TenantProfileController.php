<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Services\BranchScopeService;
use App\Services\TenantScopeService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TenantProfileController extends Controller
{
    public function __construct(private BranchScopeService $branchScope, private TenantScopeService $tenantScope) {}

    public function index(Request $request)
    {
        $query = Tenant::with(['branch', 'tenantCategory', 'productCategory', 'activeTenancy.unit'])
            ->when($request->search, fn ($q) => $q->where(function ($qq) use ($request) {
                $qq->where('tenants.name', 'like', "%{$request->search}%")
                    ->orWhere('tenants.company_phone', 'like', "%{$request->search}%")
                    ->orWhereHas('activeTenancy.unit', fn ($u) => $u->where('unit_code', 'like', "%{$request->search}%"));
            }))
            ->when($request->product_category_id, fn ($q) => $q->where('tenants.product_category_id', $request->product_category_id))
            ->when($request->status === 'active', fn ($q) => $q->where('tenants.is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('tenants.is_active', false))
            ->withCount([
                'tenancies',
                'inspections as inspections_completed_count' => fn ($q) => $q->where('status', 'completed'),
                'permitRequests as permits_pending_count' => fn ($q) => $q->where('status', 'pending'),
            ])
            ->latest();

        $this->branchScope->apply($query, $request->user());
        $this->tenantScope->applyView($query, $request->user());

        return Inertia::render('TenantProfiles/Index', [
            'tenants' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only(['search', 'product_category_id', 'status']),
            'productCategories' => ProductCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Tenant $tenant, Request $request)
    {
        $this->authorizeView($tenant, $request);

        $tenant->load([
            'branch', 'tenantCategory', 'productCategory', 'contacts',
            'activeTenancy.unit.branch',
            'tenancies' => fn ($q) => $q->with('unit.branch')->latest('start_date')->take(20),
            'inspections' => fn ($q) => $q->with('session')->latest()->take(20),
            'permitRequests' => fn ($q) => $q->latest()->take(20),
        ]);

        $inspections = $tenant->inspections->map(fn ($i) => [
            'id' => $i->id,
            'template_name' => $i->checklist_snapshot['template_name'] ?? '—',
            'status' => $i->status,
            'is_flagged' => $i->is_flagged,
            'session_status' => $i->session->status,
            'session_started_at' => $i->session->started_at?->toDateTimeString(),
            'answered' => $i->answers()->whereNotNull('value')->where('value', '!=', '')->count(),
            'total' => collect($i->checklist_snapshot['sections'] ?? [])->sum(fn ($s) => count($s['items'] ?? [])),
        ])->values();

        return response()->json([
            'tenant' => $tenant,
            'inspections' => $inspections,
        ]);
    }

    public function showInspection(Tenant $tenant, Inspection $inspection, Request $request)
    {
        $this->authorizeView($tenant, $request);
        abort_unless($inspection->tenant_id === $tenant->id, 404);

        $inspection->load(['session', 'answers.photos']);

        $answersByItemId = $inspection->answers->keyBy('checklist_item_id');
        $snapshot = $inspection->checklist_snapshot;
        foreach ($snapshot['sections'] as &$section) {
            foreach ($section['items'] as &$item) {
                $existingAnswer = $answersByItemId->get($item['id']);
                $item['answer'] = $existingAnswer ? [
                    'value' => $existingAnswer->value,
                    'note' => $existingAnswer->note,
                    'photos' => $existingAnswer->photos->map(fn ($p) => [
                        'id' => $p->id,
                        'url' => $p->url(),
                    ]),
                ] : null;
            }
        }

        return response()->json([
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'is_flagged' => $inspection->is_flagged,
                'notes' => $inspection->notes,
                'other_notes' => $inspection->other_notes,
                'session_status' => $inspection->session->status,
                'session_started_at' => $inspection->session->started_at?->toDateTimeString(),
            ],
            'checklistSnapshot' => $snapshot,
        ]);
    }

    private function authorizeView(Tenant $tenant, Request $request): void
    {
        $user = $request->user();
        abort_unless($tenant->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);

        $allowed = Tenant::query();
        $this->tenantScope->applyView($allowed, $user);
        abort_unless($allowed->where('tenants.id', $tenant->id)->exists(), 403);
    }
}
