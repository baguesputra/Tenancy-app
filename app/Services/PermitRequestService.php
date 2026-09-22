<?php

namespace App\Services;

use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\PermitRevision;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Support\Str;

class PermitRequestService
{
    public function __construct(
        private ApprovalService $approvalService,
        private NotificationService $notificationService,
        private PermitNumberService $numberService,
    ) {}

    public function create(array $data, User|TenantUser $requestedBy): PermitRequest
    {
        return \DB::transaction(function () use ($data, $requestedBy) {
            return $this->createOnce($data, $requestedBy);
        }, 3);
    }

    private function createOnce(array $data, User|TenantUser $requestedBy): PermitRequest
    {
        $tenant = isset($data['tenant_id']) ? Tenant::with('activeTenancy.unit')->find($data['tenant_id']) : null;

        $locationSnapshot = $this->resolveLocationSnapshot($tenant, $data);

        $branchId = $tenant?->branch_id
            ?? ($requestedBy instanceof User ? $requestedBy->branch_id : $requestedBy->tenant?->branch_id);

        $permit = PermitRequest::create([
            'permit_number' => $this->numberService->next($data['activity_types'] ?? []),
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
            if (empty($worker['name'])) {
                continue;
            }
            $permit->workers()->create(['name' => $worker['name'], 'order' => $index + 1]);
        }

        foreach ($data['goods'] ?? [] as $good) {
            if (empty($good['description'])) {
                continue;
            }
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
            ]);
        }

        foreach ($data['goods_light'] ?? [] as $good) {
            if (empty($good['description'])) {
                continue;
            }
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
                'weight_class' => 'light',
            ]);
        }

        foreach ($data['goods_heavy'] ?? [] as $good) {
            if (empty($good['description'])) {
                continue;
            }
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
                'weight_class' => 'heavy',
            ]);
        }

        if (! empty($data['accompanying_department_ids'])) {
            $permit->accompanyingDepartments()->sync($data['accompanying_department_ids']);
        }

        $this->setupApprovalSteps($permit);

        $firstStep = $permit->approvals()->orderBy('order')->first();
        if ($firstStep && $firstStep->department_id) {
            $this->notificationService->notifyDepartment(
                $firstStep->department_id,
                'Surat Izin Menunggu Persetujuan',
                "{$permit->permit_number} — {$permit->store_name_snapshot} menunggu: {$firstStep->label}",
                "/permit-requests/{$permit->id}",
                'document'
            );
        }

        ScannableCode::create([
            'token' => (string) Str::uuid(),
            'scannable_type' => PermitRequest::class,
            'scannable_id' => $permit->id,
        ]);

        return $permit;
    }

    private function resolveLocationSnapshot(?Tenant $tenant, array $data): array
    {
        if ($tenant) {
            $unit = $tenant->activeTenancy?->unit;
            $standName = trim($data['stand_name'] ?? '');
            $floor = trim($data['floor_snapshot'] ?? '');
            $block = trim($data['block_snapshot'] ?? '');
            $unitNo = trim($data['unit_number_snapshot'] ?? '');

            return [
                'store_name_snapshot' => $standName !== '' ? "{$tenant->name} — {$standName}" : $tenant->name,
                'floor_snapshot' => $floor !== '' ? $floor : $unit?->floor,
                'block_snapshot' => $block !== '' ? $block : $unit?->block,
                'unit_number_snapshot' => $unitNo !== '' ? $unitNo : $unit?->unit_number,
            ];
        }

        // Vendor murni (tanpa tenant & tanpa nama area) — jangan fallback Area Umum Mall
        if (! $tenant && empty($data['store_name_snapshot'])) {
            return [
                'store_name_snapshot' => $data['contractor_company'] ?? 'Vendor',
                'floor_snapshot' => null,
                'block_snapshot' => null,
                'unit_number_snapshot' => null,
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
        $bsDept = Department::where('name', 'Building Service')->first();
        $securityDept = Department::where('name', 'Security')->first();

        if (in_array('pameran', $permit->activity_types ?? [])) {
            $marketingDept = Department::where('name', 'Marketing')->first();
            $financeDept = Department::where('name', 'Keuangan')->first();

            $this->approvalService->setupSteps($permit, [
                ['step_key' => 'marketing', 'label' => 'Approval Marketing', 'department_id' => $marketingDept?->id],
                ['step_key' => 'finance', 'label' => 'Approval Keuangan', 'department_id' => $financeDept?->id],
                ['step_key' => 'bs', 'label' => 'Approval Building Service', 'department_id' => $bsDept?->id],
                ['step_key' => 'security', 'label' => 'Cek Fisik Security', 'department_id' => $securityDept?->id],
            ]);

            return;
        }

        $tenancyDept = Department::where('name', 'Tenancy')->first();

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

    public const REVISABLE = ['work_start_date', 'work_end_date', 'work_end_time', 'access_route'];

    private const RESET_ON_REVISE = ['marketing', 'finance', 'bs', 'security'];

    public function revise(PermitRequest $permit, array $data, User|TenantUser $revisedBy): PermitRevision
    {
        return \DB::transaction(function () use ($permit, $data, $revisedBy) {
            $changes = [];
            foreach (self::REVISABLE as $field) {
                if (! array_key_exists($field, $data)) {
                    continue;
                }
                $old = $permit->getAttribute($field);
                $oldStr = $old instanceof \DateTimeInterface ? $old->format(in_array($field, ['work_start_date', 'work_end_date'], true) ? 'Y-m-d' : 'H:i') : (string) ($old ?? '');
                $newStr = (string) ($data[$field] ?? '');
                if ($oldStr !== $newStr) {
                    $changes[$field] = ['old' => $oldStr !== '' ? $oldStr : null, 'new' => $newStr !== '' ? $newStr : null];
                }
            }

            $permit->update([
                'work_start_date' => $data['work_start_date'] ?? $permit->work_start_date,
                'work_end_date' => $data['work_end_date'] ?? $permit->work_end_date,
                'work_end_time' => array_key_exists('work_end_time', $data) ? ($data['work_end_time'] ?: null) : $permit->work_end_time,
                'access_route' => array_key_exists('access_route', $data) ? ($data['access_route'] ?: null) : $permit->access_route,
            ]);

            $revision = $permit->revisions()->create([
                'revised_by_type' => get_class($revisedBy),
                'revised_by_id' => $revisedBy->id,
                'changes' => $changes,
                'reason' => $data['reason'],
                'revision_no' => ($permit->revisions()->max('revision_no') ?? 0) + 1,
            ]);

            $permit->approvals()->whereIn('step_key', self::RESET_ON_REVISE)->update([
                'status' => 'pending', 'approved_by' => null, 'approved_at' => null, 'notes' => null,
            ]);
            $this->syncStatus($permit->fresh());

            $summary = collect($changes)->map(fn ($c, $f) => $this->revisionLabel($f).': '.($c['old'] ?? '—').' → '.($c['new'] ?? '—'))->values()->join('; ');
            $bsDept = Department::where('name', 'Building Service')->first();
            if ($bsDept) {
                $this->notificationService->notifyDepartment(
                    $bsDept->id,
                    'Revisi Surat Izin',
                    "{$permit->permit_number} direvisi: {$summary}. Alasan: {$data['reason']}",
                    "/permit-requests/{$permit->id}",
                    'document'
                );
            }

            return $revision;
        }, 3);
    }

    private function revisionLabel(string $field): string
    {
        return match ($field) {
            'work_start_date' => 'Tgl mulai',
            'work_end_date' => 'Tgl selesai',
            'work_end_time' => 'Jam selesai',
            'access_route' => 'Akses',
            default => $field,
        };
    }
}
