<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\PermitRequest;
use App\Services\ApprovalService;
use App\Services\NotificationService;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(
        private ApprovalService $approvalService,
        private PermitRequestService $permitService,
        private NotificationService $notificationService,
    ) {}

    public function approve(Approval $approval, Request $request)
    {
        $request->validate(['notes' => 'nullable|string']);

        $this->approvalService->approve($approval, $request->user(), $request->notes);

        if ($approval->approvable instanceof PermitRequest) {
            $permit = $approval->approvable;
            $this->permitService->syncStatus($permit);

            $nextStep = $permit->approvals()
                ->where('order', '>', $approval->order)
                ->where('status', 'pending')
                ->orderBy('order')
                ->first();

            if ($nextStep && $nextStep->department_id) {
                $this->notificationService->notifyDepartment(
                    $nextStep->department_id,
                    'Surat Izin Menunggu Persetujuan',
                    "{$permit->permit_number} — {$permit->store_name_snapshot} menunggu: {$nextStep->label}",
                    "/permit-requests/{$permit->id}",
                    'document'
                );
            }
        }

        return back()->with('success', 'Approval berhasil diproses.');
    }

    public function reject(Approval $approval, Request $request)
    {
        $request->validate(['reason' => 'required|string']);

        $this->approvalService->reject($approval, $request->user(), $request->reason);

        if ($approval->approvable instanceof PermitRequest) {
            $permit = $approval->approvable;
            $this->permitService->syncStatus($permit);

            $requester = $permit->requestedBy;
            if ($requester) {
                $url = $requester instanceof \App\Models\TenantUser
                    ? "/portal/permits/{$permit->id}"
                    : "/permit-requests/{$permit->id}";

                $this->notificationService->notify(
                    $requester,
                    'Surat Izin Ditolak',
                    "{$permit->permit_number} ditolak: {$request->reason}",
                    $url,
                    'x'
                );
            }
        }

        return back()->with('success', 'Permohonan ditolak.');
    }
}