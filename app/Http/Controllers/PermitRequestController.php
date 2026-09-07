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
        $query = PermitRequest::with('tenant')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest();

        if (! $request->user()->canViewAllBranches()) {
            $query->where('branch_id', $request->user()->branch_id);
        }

        return Inertia::render('PermitRequests/Index', [
            'permits' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only('status'),
        ]);
    }

    public function create()
    {
        return Inertia::render('PermitRequests/Create', [
            'tenants' => Tenant::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $request->merge(['tenant_id' => $request->tenant_id ?: null]);

        $permit = $this->service->create($request->validated(), $request->user());

        return redirect()->route('permit-requests.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan atas nama tenant.');
    }

    public function show(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($permitRequest->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);

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