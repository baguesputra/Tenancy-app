<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\Tenant;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;
use App\Http\Requests\StorePermitRequestRequest;
use Inertia\Inertia;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service) {}

    public function index(Request $request)
    {
        $query = PermitRequest::with(['tenant', 'approvals' => fn ($q) => $q->orderBy('order')])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest();

        if ($request->user()->hasRole('marketing_staff')) {
            $query->where('activity_types', 'like', '%pameran%');
        }

        if (! $request->user()->canViewAllBranches()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        $permits = $query->paginate(15)->withQueryString();

        $userDepartmentId = $request->user()->department_id;

        $permits->getCollection()->transform(function (PermitRequest $permit) use ($userDepartmentId) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');

            $permit->current_step_label = $currentStep?->label;
            $permit->is_my_turn = $currentStep && $currentStep->department_id === $userDepartmentId;
            $permit->step_progress = $permit->approvals->map(fn ($a) => [
                'status' => $a->status,
                'label' => $a->label,
            ]);

            return $permit;
        });

        return Inertia::render('PermitRequests/Index', [
            'permits' => $permits,
            'filters' => $request->only('status'),
        ]);
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

        $permitRequest->load(['tenant', 'workers', 'goods', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy']);
        $permitRequest->currentUserDepartmentId = $user->department_id;

        $requestedBy = $permitRequest->requestedBy;
        $permitRequest->requested_by_label = $requestedBy instanceof \App\Models\User
            ? $requestedBy->name
            : ($permitRequest->tenant->name ?? $requestedBy?->username ?? '—');

        return Inertia::render('PermitRequests/Show', [
            'permit' => $permitRequest,
        ]);
    }

}