<?php

namespace App\Services;

use App\Models\PermitRequest;
use App\Models\PermitRevision;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PermitRequestService
{
    public function __construct(
        private ApprovalService $approvalService,
        private NotificationService $notificationService,
        private PermitNumberService $numberService,
        private DepartmentResolver $departmentResolver,
    ) {}

    public function create(array $data, User $requestedBy): PermitRequest
    {
        return \DB::transaction(function () use ($data, $requestedBy) {
            return $this->createOnce($data, $requestedBy);
        }, 3);
    }

    private function createOnce(array $data, User $requestedBy): PermitRequest
    {
        $tenant = isset($data['tenant_id']) ? Tenant::with('activeTenancy.unit')->find($data['tenant_id']) : null;

        // Tenant tanpa tenancy aktif belum boleh ajukan izin — kontrak belum aktif.
        if ($tenant && ! $tenant->activeTenancy && ! in_array('customer_form', $data['activity_types'] ?? [], true)) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Tenancy tenant belum aktif, izin belum bisa dibuat.',
            ]);
        }

        $locationSnapshot = $this->resolveLocationSnapshot($tenant, $data);

        $branchId = $tenant?->branch_id ?? $requestedBy->branch_id;

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
            'worker_count' => $data['worker_count'] ?? null,
            'needs_manager_approval' => (bool) ($data['needs_manager_approval'] ?? in_array($data['activity_types'][0] ?? null, ['event', 'meeting_internal', 'stock_opname'], true)),
            'event_name' => $data['event_name'] ?? null,
            'event_area' => $data['event_area'] ?? null,
            'vehicle_plate' => $data['vehicle_plate'] ?? null,
            'vehicle_type' => $data['vehicle_type'] ?? null,
            'applicant_name' => $data['applicant_name'] ?? null,
            'applicant_position' => $data['applicant_position'] ?? null,
            'customer_form_data' => isset($data['customer_company_name']) ? collect($data)
                ->filter(fn ($value, $key) => str_starts_with($key, 'customer_'))
                ->all() : null,
            'requested_by_type' => get_class($requestedBy),
            'requested_by_id' => $requestedBy->id,
            'status' => 'pending',
            'barcode_token' => (string) Str::uuid(),
        ]);

        foreach ($data['goods'] ?? [] as $good) {
            if (empty($good['description'])) {
                continue;
            }
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
                'unit' => $good['unit'] ?? null,
            ]);
        }

        foreach ($data['goods_light'] ?? [] as $good) {
            if (empty($good['description'])) {
                continue;
            }
            $permit->goods()->create([
                'description' => $good['description'],
                'quantity_note' => $good['quantity_note'] ?? null,
                'unit' => $good['unit'] ?? null,
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
                'unit' => $good['unit'] ?? null,
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

        // Vendor murni (tanpa tenant) — jangan fallback Area Umum Mall
        if (! $tenant && empty($data['store_name_snapshot'])) {
            return [
                'store_name_snapshot' => $data['contractor_company'] ?? 'Vendor',
                'floor_snapshot' => null,
                'block_snapshot' => null,
                'unit_number_snapshot' => null,
            ];
        }

        // Lokasi manual (baris legacy pra-penghapusan kategori Area)
        return [
            'store_name_snapshot' => $data['store_name_snapshot'] ?? $data['contractor_company'] ?? 'Vendor',
            'floor_snapshot' => $data['floor_snapshot'] ?? null,
            'block_snapshot' => $data['block_snapshot'] ?? null,
            'unit_number_snapshot' => $data['unit_number_snapshot'] ?? null,
        ];
    }

    private function setupApprovalSteps(PermitRequest $permit): void
    {
        $tenancyDeptId = $this->departmentResolver->id('tenancy', $permit->branch_id);

        if (in_array('langganan_parkir', $permit->activity_types ?? [], true)) {
            $this->approvalService->setupSteps($permit, [
                ['step_key' => 'tenancy', 'label' => 'Approval Supervisor Tenant', 'department_id' => $tenancyDeptId],
                ['step_key' => 'branch_manager', 'label' => 'Approval Manager Cabang', 'department_id' => null],
            ]);

            return;
        }

        if (in_array('customer_form', $permit->activity_types ?? [], true)) {
            $this->approvalService->setupSteps($permit, [
                ['step_key' => 'tenancy', 'label' => 'Approval Tenancy', 'department_id' => $tenancyDeptId],
            ]);

            return;
        }

        $bsDeptId = $this->departmentResolver->id('bs', $permit->branch_id);
        $securityDeptId = $this->departmentResolver->id('security', $permit->branch_id);

        // Surat ijin kegiatan: approval Tenancy → Manager Tenant saja.
        if (! empty(array_intersect(['event', 'meeting_internal', 'stock_opname'], $permit->activity_types ?? []))) {
            $this->approvalService->setupSteps($permit, [
                ['step_key' => 'tenancy', 'label' => 'Approval Tenancy', 'department_id' => $tenancyDeptId],
                ['step_key' => 'tenant_manager', 'label' => 'Approval Manager Tenant', 'department_id' => $tenancyDeptId],
            ]);

            return;
        }

        if (in_array('pameran', $permit->activity_types ?? [])) {
            $marketingDeptId = $this->departmentResolver->id('marketing', $permit->branch_id);
            $financeDeptId = $this->departmentResolver->id('finance', $permit->branch_id);

            $this->approvalService->setupSteps($permit, [
                ['step_key' => 'marketing', 'label' => 'Approval Marketing', 'department_id' => $marketingDeptId],
                ['step_key' => 'finance', 'label' => 'Approval Keuangan', 'department_id' => $financeDeptId],
                ['step_key' => 'bs', 'label' => 'Approval Building Service', 'department_id' => $bsDeptId],
                ['step_key' => 'security', 'label' => 'Cek Fisik Security', 'department_id' => $securityDeptId],
            ]);

            return;
        }

        $steps = [
            ['step_key' => 'tenancy', 'label' => 'Approval Tenancy', 'department_id' => $tenancyDeptId],
        ];

        if ($permit->needs_manager_approval) {
            $steps[] = ['step_key' => 'tenant_manager', 'label' => 'Approval Manager Tenant', 'department_id' => $tenancyDeptId];
        }

        $steps[] = ['step_key' => 'bs', 'label' => 'Approval Building Service', 'department_id' => $bsDeptId];
        $steps[] = ['step_key' => 'security', 'label' => 'Cek Fisik Security', 'department_id' => $securityDeptId];

        $this->approvalService->setupSteps($permit, $steps);
    }

    public function syncStatus(PermitRequest $permit): void
    {
        if ($permit->status === 'cancelled') {
            return;
        }
        if ($this->approvalService->hasRejection($permit)) {
            $permit->update(['status' => 'rejected']);
        } elseif ($this->approvalService->isFullyApproved($permit)) {
            $permit->update(['status' => 'completed']);
        } else {
            $permit->update(['status' => 'pending']);
        }
    }

    public const REVISABLE = ['work_start_date', 'work_end_date', 'work_end_time', 'access_route'];

    public function cancel(PermitRequest $permit): void
    {
        abort_unless($permit->status === 'pending', 422, 'Hanya izin pending yang bisa dibatalkan.');
        $permit->update(['status' => 'cancelled']);
    }

    private const RESET_ON_REVISE = ['marketing', 'finance', 'tenant_manager', 'bs', 'security'];

    public function revise(PermitRequest $permit, array $data, User $revisedBy): PermitRevision
    {
        if (in_array('customer_form', $permit->activity_types ?? [], true)) {
            return $this->reviseCustomerForm($permit, $data, $revisedBy);
        }

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
            $bsDeptId = $this->departmentResolver->id('bs', $permit->branch_id);
            if ($bsDeptId) {
                $this->notificationService->notifyDepartment(
                    $bsDeptId,
                    'Revisi Surat Izin',
                    "{$permit->permit_number} direvisi: {$summary}. Alasan: {$data['reason']}",
                    "/permit-requests/{$permit->id}",
                    'document'
                );
            }

            return $revision;
        }, 3);
    }

    private function reviseCustomerForm(PermitRequest $permit, array $data, User $revisedBy): PermitRevision
    {
        return \DB::transaction(function () use ($permit, $data, $revisedBy) {
            $current = $permit->customer_form_data ?? [];
            $oldRequestDate = $permit->request_date?->format('Y-m-d');
            $changes = [];
            foreach ($data as $field => $value) {
                if (in_array($field, ['reason', 'customer_request_date'], true)) continue;
                $old = $current[$field] ?? null;
                $new = $value === '' ? null : $value;
                if ((string) ($old ?? '') !== (string) ($new ?? '')) {
                    $changes[$field] = ['old' => $old, 'new' => $new];
                    $current[$field] = $new;
                }
            }

            if ($oldRequestDate !== $data['customer_request_date']) {
                $changes['customer_request_date'] = [
                    'old' => $oldRequestDate,
                    'new' => $data['customer_request_date'],
                ];
            }
            $current['customer_request_date'] = $data['customer_request_date'];

            $permit->update([
                'customer_form_data' => $current,
                'request_date' => $data['customer_request_date'],
                'pic_name' => $data['customer_pic_name'],
                'pic_phone' => $data['customer_pic_phone'],
                'store_name_snapshot' => $permit->tenant_id ? $permit->store_name_snapshot : ($current['customer_company_name'] ?? $permit->store_name_snapshot),
            ]);
            $revision = $permit->revisions()->create([
                'revised_by_type' => get_class($revisedBy),
                'revised_by_id' => $revisedBy->id,
                'changes' => $changes,
                'reason' => $data['reason'],
                'revision_no' => ($permit->revisions()->max('revision_no') ?? 0) + 1,
            ]);

            $permit->approvals()->where('step_key', 'tenancy')->update([
                'status' => 'pending', 'approved_by' => null, 'approved_at' => null, 'notes' => null,
            ]);
            $this->syncStatus($permit->fresh());

            $tenancyDeptId = $this->departmentResolver->id('tenancy', $permit->branch_id);
            if ($tenancyDeptId) {
                $this->notificationService->notifyDepartment(
                    $tenancyDeptId,
                    'Revisi Form Data Customer',
                    "{$permit->permit_number} direvisi oleh {$revisedBy->name}. Alasan: {$data['reason']}",
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
            'customer_company_name' => 'Nama perusahaan',
            'customer_invoice_address' => 'Alamat invoice',
            'customer_company_phone' => 'Telepon perusahaan',
            'customer_npwp_number' => 'NPWP',
            'customer_npwp_name' => 'Nama di NPWP',
            'customer_npwp_address' => 'Alamat NPWP',
            'customer_pic_name' => 'Nama PIC',
            'customer_pic_position' => 'Jabatan PIC',
            'customer_pic_ktp' => 'No. KTP PIC',
            'customer_pic_phone' => 'Telepon PIC',
            'customer_pic_email' => 'Email PIC',
            'customer_tenant_relation' => 'Hubungan tenant',
            'customer_billing_description' => 'Keterangan tagihan',
            'customer_amount' => 'Nominal (di luar PPN)',
            'customer_city' => 'Kota',
            'customer_notes' => 'Catatan',
            'customer_request_date' => 'Tanggal pengajuan',
            default => $field,
        };
    }
}
