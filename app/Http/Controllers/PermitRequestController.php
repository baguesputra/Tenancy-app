<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\Tenant;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service) {}

    public function index(Request $request)
    {
        $permits = PermitRequest::with('tenant')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->latest()->paginate(15)->withQueryString();

        return Inertia::render('PermitRequests/Index', [
            'permits' => $permits,
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

    public function store(Request $request)
    {
        $request->merge([
            'tenant_id' => $request->tenant_id ?: null,
        ]);

        $validated = $this->validatePermit($request);

        $permit = $this->service->create($validated, $request->user());

        return redirect()->route('permit-requests.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan atas nama tenant.');
    }

    public function show(PermitRequest $permitRequest, Request $request)
    {
        $permitRequest->load(['tenant', 'workers', 'goods', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy']);

        return Inertia::render('PermitRequests/Show', [
            'permit' => $permitRequest,
            'currentUserDepartmentId' => $request->user()->department_id,
        ]);
    }

    private function validatePermit(Request $request): array
    {
        return $request->validate([
            'tenant_id' => 'nullable|exists:tenants,id',
            'store_name_snapshot' => 'nullable|required_without:tenant_id|string|max:255',
            'floor_snapshot' => 'nullable|string|max:50',
            'block_snapshot' => 'nullable|string|max:50',
            'unit_number_snapshot' => 'nullable|string|max:50',
            'permit_number' => 'required|string|max:100',
            'activity_types' => 'required|array|min:1',
            'request_date' => 'required|date',
            'pic_name' => 'nullable|string|max:255',
            'pic_phone' => 'nullable|string|max:30',
            'is_external' => 'boolean',
            'contractor_company' => 'nullable|string|max:255',
            'contractor_pic' => 'nullable|string|max:255',
            'contractor_address' => 'nullable|string',
            'contractor_phone' => 'nullable|string|max:30',
            'job_type' => 'nullable|string|max:255',
            'work_start_date' => 'nullable|date',
            'work_end_date' => 'nullable|date',
            'work_start_time' => 'nullable',
            'work_end_time' => 'nullable',
            'access_route' => 'nullable|string',
            'notes' => 'nullable|string',
            'workers' => 'nullable|array',
            'workers.*.name' => 'nullable|string|max:255',
            'goods' => 'nullable|array',
            'goods.*.description' => 'nullable|string|max:255',
            'goods.*.quantity_note' => 'nullable|string|max:100',
            'accompanying_department_ids' => 'nullable|array',
        ]);
    }
}