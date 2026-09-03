<?php

namespace App\Http\Controllers\TenantPortal;

use App\Http\Controllers\Controller;
use App\Models\PermitRequest;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service) {}

    public function index(Request $request)
    {
        $tenantUser = $request->user('tenant');

        $permits = PermitRequest::where('tenant_id', $tenantUser->tenant_id)
            ->latest()->paginate(15);

        return Inertia::render('TenantPortal/Permits/Index', ['permits' => $permits]);
    }

    public function create()
    {
        return Inertia::render('TenantPortal/Permits/Create', [
            'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $tenantUser = $request->user('tenant');

        $validated = $this->validatePermit($request);
        $validated['tenant_id'] = $tenantUser->tenant_id;

        $permit = $this->service->create($validated, $tenantUser);

        return redirect()->route('tenant-portal.permits.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan.');
    }

    public function show(PermitRequest $permit, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);

        $permit->load(['workers', 'goods', 'approvals.department']);

        return Inertia::render('TenantPortal/Permits/Show', ['permit' => $permit]);
    }

    private function validatePermit(Request $request): array
    {
        return $request->validate([
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