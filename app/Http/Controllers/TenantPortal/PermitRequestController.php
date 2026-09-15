<?php

namespace App\Http\Controllers\TenantPortal;

use App\Http\Controllers\Controller;
use App\Models\PermitRequest;
use App\Services\PermitRequestService;
use App\Http\Requests\StorePermitRequestRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service) {}

    public function index(Request $request)
    {
        $tenantUser = $request->user('tenant');

        $permits = PermitRequest::with(['approvals' => fn ($q) => $q->orderBy('order')])
            ->where('tenant_id', $tenantUser->tenant_id)
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->search, fn ($q) => $q->where(fn ($qq) => $qq
                ->where('permit_number', 'like', "%{$request->search}%")
                ->orWhere('job_type', 'like', "%{$request->search}%")))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $permits->getCollection()->transform(function (PermitRequest $permit) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');
            $permit->current_step_label = $currentStep?->label;
            $permit->step_progress = $permit->approvals->map(fn ($a) => [
                'status' => $a->status,
                'label' => $a->label,
            ]);
            return $permit;
        });

        return Inertia::render('TenantPortal/Permits/Index', [
            'permits' => $permits,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('TenantPortal/Permits/Create', [
            'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $tenantUser = $request->user('tenant');

        $validated = $request->validated();
        $validated['tenant_id'] = $tenantUser->tenant_id;

        $permit = $this->service->create($validated, $tenantUser);

        return redirect()->route('tenant-portal.permits.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan.');
    }

    public function show(PermitRequest $permit, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);

        $permit->load(['workers', 'goods', 'approvals' => fn ($q) => $q->orderBy('order')]);

        return Inertia::render('TenantPortal/Permits/Show', ['permit' => $permit]);
    }

}