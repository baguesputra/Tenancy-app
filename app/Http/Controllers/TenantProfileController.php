<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Services\BranchScopeService;
use App\Services\TenantScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class TenantProfileController extends Controller
{
    public function __construct(private BranchScopeService $branchScope, private TenantScopeService $tenantScope) {}

    public function index(Request $request)
    {
        $query = Tenant::select(['id', 'branch_id', 'name', 'logo_path', 'tenant_category_id', 'product_category_id', 'is_active'])
            ->with(['branch:id,name', 'tenantCategory:id,name', 'productCategory:id,name', 'activeTenancy:id,tenant_id,unit_id,status', 'activeTenancy.unit:id,unit_code'])
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
            'branch:id,name', 'tenantCategory:id,name', 'productCategory:id,name',
            'contacts:id,tenant_id,name,position,phone,email,type',
            'activeTenancy:id,tenant_id,unit_id,status', 'activeTenancy.unit:id,unit_code',
            'tenancies' => fn ($q) => $q->select(['id', 'tenant_id', 'unit_id', 'status', 'start_date', 'end_date', 'contract_number'])->with('unit:id,unit_code')->latest('start_date')->take(20),
            'inspections' => fn ($q) => $q->select(['id', 'tenant_id', 'inspection_session_id', 'checklist_snapshot', 'status', 'is_flagged'])->with('session:id,status,started_at')->withCount(['answers as answered_count' => fn ($aq) => $aq->whereNotNull('value')->where('value', '!=', '')])->latest()->take(20),
            'permitRequests' => fn ($q) => $q->select(['id', 'tenant_id', 'permit_number', 'status', 'job_type', 'request_date'])->latest()->take(20),
        ]);

        $inspections = $tenant->inspections->map(fn ($i) => [
            'id' => $i->id,
            'template_name' => $i->checklist_snapshot['template_name'] ?? '—',
            'status' => $i->status,
            'is_flagged' => $i->is_flagged,
            'session_status' => $i->session->status,
            'session_started_at' => $i->session->started_at?->toDateTimeString(),
            'answered' => $i->answered_count ?? 0,
            'total' => collect($i->checklist_snapshot['sections'] ?? [])->sum(fn ($s) => count($s['items'] ?? [])),
        ])->values();

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'logo_url' => $tenant->logo_url,
                'legal_entity_name' => $tenant->legal_entity_name,
                'company_phone' => $tenant->company_phone,
                'company_email' => $tenant->company_email,
                'company_address' => $tenant->company_address,
                'npwp_number' => $tenant->npwp_number,
                'siup_number' => $tenant->siup_number,
                'contacts' => $tenant->contacts,
                'tenancies' => $tenant->tenancies,
                'permit_requests' => $tenant->permitRequests,
            ],
            'inspections' => $inspections,
        ]);
    }

    public function showInspection(Tenant $tenant, Inspection $inspection, Request $request)
    {
        $this->authorizeView($tenant, $request);
        abort_unless($inspection->tenant_id === $tenant->id, 404);

        $inspection->load(['session.user', 'answers.photos']);
        $snapshot = $this->mergeSnapshot($inspection);

        $failed = 0;
        $photoCount = 0;
        foreach ($snapshot['sections'] as $section) {
            foreach ($section['items'] ?? [] as $item) {
                if (($item['answer']['value'] ?? null) === ($item['option_negative'] ?? "\0")) {
                    $failed++;
                }
                $photoCount += count($item['answer']['photos'] ?? []);
            }
        }

        return response()->json([
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'is_flagged' => $inspection->is_flagged,
                'notes' => $inspection->notes,
                'other_notes' => $inspection->other_notes,
                'synced_at' => $inspection->synced_at?->toDateTimeString(),
                'session_status' => $inspection->session->status,
                'session_started_at' => $inspection->session->started_at?->toDateTimeString(),
                'session_ended_at' => $inspection->session->ended_at?->toDateTimeString(),
                'session_officer' => $inspection->session->user?->name,
                'failed_count' => $failed,
                'photo_count' => $photoCount,
            ],
            'checklistSnapshot' => $snapshot,
        ]);
    }

    public function full(Tenant $tenant, Request $request)
    {
        $this->authorizeView($tenant, $request);

        $tenant->load([
            'branch:id,name', 'tenantCategory:id,name', 'productCategory:id,name',
            'contacts:id,tenant_id,name,position,phone,email,type',
            'tenantUser:id,tenant_id,username,is_active',
            'activeTenancy:id,tenant_id,unit_id,status,start_date,end_date',
            'activeTenancy.unit:id,unit_code',
            'activeTenancy.unit.scannableCode:scannable_type,scannable_id,token',
            'tenancies' => fn ($q) => $q->with(['unit:id,unit_code,size,floor,block', 'unit.scannableCode:scannable_type,scannable_id,token'])->latest('start_date')->take(30),
            'inspections' => fn ($q) => $q->select(['id', 'tenant_id', 'inspection_session_id', 'checklist_snapshot', 'status', 'is_flagged', 'synced_at'])->with('session.user:id,name')->withCount(['answers as answered_count' => fn ($aq) => $aq->whereNotNull('value')->where('value', '!=', '')])->latest()->take(30),
            'permitRequests' => fn ($q) => $q->with(['workers:permit_request_id,name,is_present,mismatch_note', 'goods:permit_request_id,description,quantity_note,photo_path,is_verified,mismatch_note', 'approvals.approvedBy:id,name'])->latest()->take(30),
        ]);

        $now = now()->startOfDay();
        $tenancies = $tenant->tenancies->map(fn ($c) => [
            'id' => $c->id,
            'status' => $c->status,
            'start_date' => $c->start_date?->toDateString(),
            'end_date' => $c->end_date?->toDateString(),
            'signed_date' => $c->signed_date?->toDateString(),
            'contract_number' => $c->contract_number,
            'contract_document_path' => $c->contract_document_path,
            'rent_value' => $c->rent_value,
            'rent_period' => $c->rent_period,
            'service_charge' => $c->service_charge,
            'deposit_value' => $c->deposit_value,
            'payment_term' => $c->payment_term,
            'percentage_rent_rate' => $c->percentage_rent_rate,
            'percentage_rent_breakpoint' => $c->percentage_rent_breakpoint,
            'notes' => $c->notes,
            'days_remaining' => $c->end_date ? (int) $now->diffInDays($c->end_date->copy()->startOfDay(), false) : null,
            'unit' => $c->unit ? [
                'unit_code' => $c->unit->unit_code,
                'size' => $c->unit->size,
                'floor' => $c->unit->floor,
                'block' => $c->unit->block,
                'scan_url' => $c->unit->scanUrl,
            ] : null,
        ])->values();

        $inspections = $tenant->inspections->map(function ($i) {
            $total = collect($i->checklist_snapshot['sections'] ?? [])->sum(fn ($s) => count($s['items'] ?? []));

            return [
                'id' => $i->id,
                'template_name' => $i->checklist_snapshot['template_name'] ?? '—',
                'status' => $i->status,
                'is_flagged' => $i->is_flagged,
                'synced_at' => $i->synced_at?->toDateTimeString(),
                'session_status' => $i->session->status,
                'session_started_at' => $i->session->started_at?->toDateTimeString(),
                'session_ended_at' => $i->session->ended_at?->toDateTimeString(),
                'session_officer' => $i->session->user?->name,
                'answered' => $i->answered_count ?? 0,
                'total' => $total,
            ];
        })->values();

        $permits = $tenant->permitRequests->map(function ($p) {
            $workers = $p->workers;
            $goods = $p->goods;

            return [
                'id' => $p->id,
                'permit_number' => $p->permit_number,
                'status' => $p->status,
                'is_flagged' => $p->is_flagged,
                'is_expired' => $p->is_expired,
                'expires_at' => $p->expires_at?->toDateTimeString(),
                'job_type' => $p->job_type,
                'activity_types' => $p->activity_types,
                'request_date' => $p->request_date?->toDateString(),
                'work_start_date' => $p->work_start_date?->toDateString(),
                'work_end_date' => $p->work_end_date?->toDateString(),
                'work_start_time' => $p->work_start_time?->format('H:i'),
                'work_end_time' => $p->work_end_time?->format('H:i'),
                'location' => trim(collect([$p->floor_snapshot, $p->block_snapshot, $p->unit_number_snapshot])->filter()->implode(' / ')) ?: null,
                'pic_name' => $p->pic_name,
                'pic_phone' => $p->pic_phone,
                'is_external' => $p->is_external,
                'contractor_company' => $p->contractor_company,
                'contractor_pic' => $p->contractor_pic,
                'contractor_phone' => $p->contractor_phone,
                'access_route' => $p->access_route,
                'notes' => $p->notes,
                'workers_present' => $workers->where('is_present', true)->count(),
                'workers_total' => $workers->count(),
                'goods_verified' => $goods->where('is_verified', true)->count(),
                'goods_total' => $goods->count(),
                'approvals' => $p->approvals->map(fn ($a) => [
                    'label' => $a->label,
                    'status' => $a->status,
                    'notes' => $a->notes,
                    'approved_by' => $a->approvedBy?->name,
                    'approved_at' => $a->approved_at?->toDateTimeString(),
                ])->values(),
            ];
        })->values();

        $activeUnit = $tenant->activeTenancy?->unit;
        $scanUrl = $activeUnit?->scanUrl;
        // ponytail: QR svg ~2.4KB tapi generate P50 42ms — cache 60m per scanUrl
        $unitQr = $scanUrl
            ? Cache::remember('tenant-qr.'.md5($scanUrl), 3600, fn () => 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(220)->generate($scanUrl)))
            : null;

        $contactsByType = $tenant->contacts->groupBy(fn ($c) => $c->type ?: 'Umum')->map->values();

        // ponytail: kirim kolom yg dipakai FE saja — toArray() full bawa relasi duplikat
        $tenantArr = $tenant->only(['id', 'name', 'logo_url', 'legal_entity_name', 'npwp_number', 'siup_number', 'company_phone', 'company_email', 'company_address', 'is_active'])
            + ['tenant_user' => $tenant->tenantUser?->only(['username', 'is_active'])]
            + ['tenant_category' => $tenant->tenantCategory?->only(['name'])]
            + ['product_category' => $tenant->productCategory?->only(['name'])]
            + ['branch' => $tenant->branch?->only(['name'])];

        return Inertia::render('TenantProfiles/Show', [
            'tenant' => $tenantArr,
            'tenancies' => $tenancies,
            'inspections' => $inspections,
            'permits' => $permits,
            'contactsByType' => $contactsByType,
            'unitQr' => $unitQr,
            'filters' => $request->only(['search', 'product_category_id', 'status']),
        ]);
    }

    public function showPermit(Tenant $tenant, PermitRequest $permit, Request $request)
    {
        $this->authorizeView($tenant, $request);
        abort_unless($permit->tenant_id === $tenant->id, 404);

        $permit->load(['workers', 'goods', 'approvals.approvedBy', 'scannableCode']);

        return response()->json([
            'permit' => array_merge($permit->toArray(), [
                'scan_url' => $permit->scan_url,
                'expires_at' => $permit->expires_at?->toDateTimeString(),
                'location_snapshot' => trim(collect([$permit->floor_snapshot, $permit->block_snapshot, $permit->unit_number_snapshot])->filter()->implode(' / ')) ?: null,
                'workers_present' => $permit->workers->where('is_present', true)->count(),
                'workers_total' => $permit->workers->count(),
                'goods_verified' => $permit->goods->where('is_verified', true)->count(),
                'goods_total' => $permit->goods->count(),
                'workers_detail' => $permit->workers->map(fn ($w) => [
                    'id' => $w->id,
                    'name' => $w->name,
                    'is_present' => $w->is_present,
                    'mismatch_note' => $w->mismatch_note,
                ])->values(),
                'goods_detail' => $permit->goods->map(fn ($g) => [
                    'id' => $g->id,
                    'description' => $g->description,
                    'quantity_note' => $g->quantity_note,
                    'photo_url' => $g->photo_url,
                    'is_verified' => $g->is_verified,
                    'mismatch_note' => $g->mismatch_note,
                ])->values(),
                'approvals' => $permit->approvals->map(fn ($a) => [
                    'label' => $a->label,
                    'status' => $a->status,
                    'notes' => $a->notes,
                    'approved_by' => $a->approvedBy?->name,
                    'approved_at' => $a->approved_at?->toDateTimeString(),
                ])->values(),
            ]),
        ]);
    }

    private function mergeSnapshot(Inspection $inspection): array
    {
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

        return $snapshot;
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
