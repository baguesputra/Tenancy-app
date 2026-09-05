<?php

namespace App\Services;

use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Str;

class PermitRequestService
{
    public function __construct(private ApprovalService $approvalService) {}

    public function create(array $data, User|TenantUser $requestedBy): PermitRequest
    {
        $tenant = isset($data['tenant_id']) ? Tenant::with('activeTenancy.unit')->find($data['tenant_id']) : null;

        $locationSnapshot = $this->resolveLocationSnapshot($tenant, $data);

        $branchId = $tenant?->branch_id
            ?? ($requestedBy instanceof User ? $requestedBy->branch_id : $requestedBy->tenant?->branch_id);

        $permit = PermitRequest::create([
            'permit_number' => $data['permit_number'],
            'activity_types' => $data['activity_types'],
            'request_date' => $data['request_date'],
            'tenant_id' => $tenant?->id,
            'branch_id' => $branchId,
            ...$locationSnapshot,
            'pic_name' => $data['pic_name'] ?? null,
            'pic_phone' => $data['pic_phone'] ?? null,
            'is_external' => $data['is_external'] ?? false,
            'contractor_company' => $data['contractor_company'] ?? null,
            'contractor_pic' => $data['contractor_pic'] ?? null,
            'contractor_address' => $data['contractor_address'] ?? null,
            'contractor_phone' => $data['contractor_phone'] ?? null,
            'job_type' => $data['job_type'] ?? null,
            'work_start_date' => $data['work_start_date'] ?? null,
            'work_end_date' => $data['work_end_date'] ?? null,
            'work_start_time' => $data['work_start_time'] ?? null,
            'work_end_time' => $data['work_end_time'] ?? null,
            'access_route' => $data['access_route'] ?? null,
            'notes' => $data['notes'] ?? null,
            'requested_by_type' => get_class($requestedBy),
            'requested_by_id' => $requestedBy->id,
            'status' => 'pending',
            'barcode_token' => (string) Str::uuid(),
        ]);

        foreach ($data['workers'] ?? [] as $index => $worker) {
            if (empty($worker['name'])) continue;
            $permit->workers()->create(['name' => $worker['name'], 'order' => $index + 1]);
        }

        foreach ($data['goods'] ?? [] as $good) {
            if (empty($good['description'])) continue;
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
            ]);
        }

        if (! empty($data['accompanying_department_ids'])) {
            $permit->accompanyingDepartments()->sync($data['accompanying_department_ids']);
        }

        $this->setupApprovalSteps($permit);

        return $permit;
    }

    private function resolveLocationSnapshot(?Tenant $tenant, array $data): array
    {
        if ($tenant) {
            $unit = $tenant->activeTenancy?->unit;
            return [
                'store_name_snapshot' => $tenant->name,
                'floor_snapshot' => $unit?->floor,
                'block_snapshot' => $unit?->block,
                'unit_number_snapshot' => $unit?->unit_number,
            ];
        }

        // Area umum mall — manual
        return [
            'store_name_snapshot' => $data['store_name_snapshot'] ?? 'Area Umum Mall',
            'floor_snapshot' => $data['floor_snapshot'] ?? null,
            'block_snapshot' => $data['block_snapshot'] ?? null,
            'unit_number_snapshot' => $data['unit_number_snapshot'] ?? null,
        ];
    }

    private function setupApprovalSteps(PermitRequest $permit): void
    {
        $tenancyDept = Department::where('name', 'Tenancy')->first();
        $bsDept = Department::where('name', 'Building Service')->first();
        $securityDept = Department::where('name', 'Security')->first();

        $this->approvalService->setupSteps($permit, [
            ['step_key' => 'tenancy', 'label' => 'Approval Tenancy', 'department_id' => $tenancyDept?->id],
            ['step_key' => 'bs', 'label' => 'Approval Building Service', 'department_id' => $bsDept?->id],
            ['step_key' => 'security', 'label' => 'Cek Fisik Security', 'department_id' => $securityDept?->id],
        ]);
    }

    public function syncStatus(PermitRequest $permit): void
    {
        if ($this->approvalService->hasRejection($permit)) {
            $permit->update(['status' => 'rejected']);
        } elseif ($this->approvalService->isFullyApproved($permit)) {
            $permit->update(['status' => 'completed']);
        } else {
            $permit->update(['status' => 'pending']);
        }
    }
}