<?php

namespace App\Http\Controllers;

use App\Http\Requests\RevisePermitRequestRequest;
use App\Http\Requests\StorePermitRequestRequest;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\PermitRequestService;
use App\Services\TenantScopeService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service, private TenantScopeService $tenantScope) {}

    private const ACTIVITY_TYPES = [
        ['value' => 'kerja', 'label' => 'Kerja'],
        ['value' => 'lembur', 'label' => 'Lembur'],
        ['value' => 'masuk_keluar_barang', 'label' => 'Masuk/Keluar Barang'],
        ['value' => 'masuk_keluar_alat', 'label' => 'Masuk/Keluar Alat Kerja/Properti'],
        ['value' => 'fit_out_pull_out_renovasi', 'label' => 'Fit Out/Pull Out/Renovasi'],
        ['value' => 'pameran', 'label' => 'Pameran / Open Counter', 'code' => 'E&P'],
    ];

    public function index(Request $request)
    {
        $isMarketing = $request->user()->hasRole('marketing_staff');

        $base = PermitRequest::with(['tenant', 'requestedBy', 'approvals' => fn ($q) => $q->orderBy('order')])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->activity_type, fn ($q) => $q->where('activity_types', 'like', "%{$request->activity_type}%"))
            ->when($request->search, fn ($q) => $q->where(fn ($w) => $w
                ->where('permit_number', 'like', "%{$request->search}%")
                ->orWhere('store_name_snapshot', 'like', "%{$request->search}%")))
            ->latest();

        if ($isMarketing) {
            $base->where('activity_types', 'like', '%pameran%');
            $request->merge(['category' => 'pameran', 'activity_type' => 'pameran']);
        } else {
            $this->hideForbiddenTenantPermits($base, $request->user());
        }

        if (! $request->user()->canViewAllBranches()) {
            $base->where('branch_id', $request->user()->branch_id);
        }

        $summary = [
            'total' => (clone $base)->count(),
            'counts' => $isMarketing ? ['pameran' => (clone $base)->count()]
                : [
                    'pameran' => (clone $base)->where('activity_types', 'like', '%pameran%')->count(),
                    'tenant' => $this->applyCategory(clone $base, 'tenant')->count(),
                    'vendor' => $this->applyCategory(clone $base, 'vendor')->count(),
                    'area' => $this->applyCategory(clone $base, 'area')->count(),
                ],
        ];

        $permits = $this->applyCategory($base, $isMarketing ? 'pameran' : $request->category)->paginate(15)->withQueryString();

        $userDepartmentId = $request->user()->department_id;
        $marketingIds = Role::where('name', 'marketing_staff')->first()?->users()->pluck('users.id')->all() ?? [];

        $permits->getCollection()->transform(function (PermitRequest $permit) use ($userDepartmentId, $marketingIds) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');

            $permit->current_step_label = $currentStep?->label;
            $permit->is_my_turn = $currentStep && $currentStep->department_id === $userDepartmentId;
            $permit->step_progress = $permit->approvals->map(fn ($a) => [
                'status' => $a->status,
                'label' => $a->label,
            ]);
            $permit->category = $this->categoryOf($permit);
            $permit->activity_labels = collect($permit->activity_types ?? [])
                ->map(fn ($v) => collect(self::ACTIVITY_TYPES)->firstWhere('value', $v)['label'] ?? $v)
                ->values();
            $permit->source = str_contains($permit->requested_by_type ?? '', 'TenantUser')
                ? 'portal'
                : (in_array($permit->requested_by_id, $marketingIds) ? 'marketing' : 'staff');

            return $permit;
        });

        return Inertia::render('PermitRequests/Index', [
            'permits' => $permits,
            'filters' => array_merge(
                $request->only(['status', 'category', 'activity_type', 'search']),
                $isMarketing ? ['category' => 'pameran'] : []
            ),
            'activityTypes' => self::ACTIVITY_TYPES,
            'summary' => $summary,
            'categoryLocked' => $isMarketing ? 'pameran' : null,
            'hiddenCategories' => $isMarketing ? [] : $this->hiddenCategories($request->user()),
        ]);
    }

    private function applyCategory($query, ?string $category)
    {
        return match ($category) {
            'pameran' => $query->where('activity_types', 'like', '%pameran%'),
            'tenant' => $query->whereNotNull('tenant_id')->where('activity_types', 'not like', '%pameran%'),
            'vendor' => $query->where('activity_types', 'not like', '%pameran%')
                ->where(fn ($w) => $w->where('is_external', true)->orWhereNotNull('contractor_company')),
            'area' => $query->whereNull('tenant_id')->where('activity_types', 'not like', '%pameran%')
                ->where(fn ($w) => $w->where('is_external', false)->orWhereNull('is_external'))
                ->whereNull('contractor_company'),
            default => $query,
        };
    }

    private function hiddenCategories(User $user): array
    {
        if ($user->hasRole('super_admin')) {
            return [];
        }

        $viewable = $this->tenantScope->viewableCategoryIds($user);
        if ($viewable === null) {
            return [];
        }

        $ocId = TenantCategory::where('name', 'Open Counter')->first()?->id;
        if ($ocId && ! $viewable->contains($ocId)) {
            return ['pameran'];
        }

        return [];
    }

    private function authorizeTenantPermit(PermitRequest $permit, User $user): void
    {
        if ($user->hasRole(['super_admin', 'marketing_staff'])) {
            return;
        }

        $viewable = $this->tenantScope->viewableCategoryIds($user);
        if ($viewable === null) {
            return;
        }

        if ($permit->tenant_id && ! $viewable->contains((int) $permit->loadMissing('tenant')->tenant->tenant_category_id)) {
            abort(403, 'Tidak berhak mengakses izin tenant kategori ini.');
        }

        $ocId = TenantCategory::where('name', 'Open Counter')->first()?->id;
        if ($ocId && ! $viewable->contains($ocId) && in_array('pameran', $permit->activity_types ?? [])) {
            abort(403, 'Tidak berhak mengakses izin pameran.');
        }
    }

    private function hideForbiddenTenantPermits($query, User $user): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $viewable = $this->tenantScope->viewableCategoryIds($user);
        if ($viewable === null) {
            return;
        }

        $ocId = TenantCategory::where('name', 'Open Counter')->first()?->id;
        $query->where(function ($q) use ($viewable, $ocId) {
            $q->whereNull('tenant_id')
                ->orWhereHas('tenant', fn ($t) => $t->whereIn('tenant_category_id', $viewable));
            if ($ocId && ! $viewable->contains($ocId)) {
                $q->where('activity_types', 'not like', '%pameran%');
            }
        });
    }

    private function categoryOf(PermitRequest $permit): string
    {
        if (in_array('pameran', $permit->activity_types ?? [])) {
            return 'pameran';
        }
        if ($permit->tenant_id) {
            return 'tenant';
        }
        if ($permit->is_external || $permit->contractor_company) {
            return 'vendor';
        }

        return 'area';
    }

    public function create(Request $request)
    {
        $isMarketing = $request->user()->hasRole('marketing_staff');

        $tenants = Tenant::where('is_active', true)
            ->when($isMarketing, fn ($q) => $q->whereHas('tenantCategory', fn ($c) => $c->where('name', 'Open Counter')))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('PermitRequests/Create', [
            'tenants' => $tenants,
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'isMarketingLocked' => $isMarketing,
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $isMarketing = $request->user()->hasRole('marketing_staff');

        if ($isMarketing) {
            $tenant = Tenant::with('tenantCategory')->find($request->tenant_id);
            abort_unless($tenant && $tenant->tenantCategory?->name === 'Open Counter', 403, 'Marketing hanya bisa mengajukan untuk tenant Open Counter.');
        } else {
            $request->merge(['tenant_id' => $request->tenant_id ?: null]);
        }

        $validated = $request->validated();
        if ($isMarketing) {
            $validated['activity_types'] = ['pameran'];
        }

        $permit = $this->service->create($validated, $request->user());

        return redirect()->route('permit-requests.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan atas nama tenant.');
    }

    public function show(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($permitRequest->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
        abort_if($user->hasRole('marketing_staff') && ! in_array('pameran', $permitRequest->activity_types ?? []), 403);
        $this->authorizeTenantPermit($permitRequest, $user);

        $permitRequest->load(['tenant', 'workers', 'goods', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy', 'revisions']);
        $permitRequest->currentUserDepartmentId = $user->department_id;

        $requestedBy = $permitRequest->requestedBy;
        $permitRequest->requested_by_label = $requestedBy instanceof User
            ? $requestedBy->name
            : ($permitRequest->tenant->name ?? $requestedBy?->username ?? '—');

        return Inertia::render('PermitRequests/Show', [
            'permit' => $permitRequest,
            'can_revise' => $permitRequest->status === 'pending',
        ]);
    }

    public function revise(PermitRequest $permitRequest, RevisePermitRequestRequest $request)
    {
        abort_unless($permitRequest->status === 'pending', 422, 'Hanya izin pending yang bisa direvisi.');
        abort_unless($permitRequest->branch_id === $request->user()->branch_id || $request->user()->canViewAllBranches(), 403);
        abort_if($request->user()->hasRole('marketing_staff') && ! in_array('pameran', $permitRequest->activity_types ?? []), 403);
        $this->authorizeTenantPermit($permitRequest, $request->user());

        $validated = $request->validated();

        $this->service->revise($permitRequest, $validated, $request->user());

        return back()->with('success', 'Revisi diajukan. Approval BS, Finance/Marketing, dan Security diulang.');
    }
}
