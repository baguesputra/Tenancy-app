<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\PermitRequest;
use App\Models\User;
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

            if ($nextStep) {
                $title = 'Surat Izin Menunggu Persetujuan';
                $message = "{$permit->permit_number} - {$permit->store_name_snapshot} menunggu: {$nextStep->label}";
                $url = "/permit-requests/{$permit->id}";

                if ($nextStep->step_key === 'branch_manager') {
                    $this->notificationService->notifyBranchManagers($permit->branch_id, $title, $message, $url, 'document');
                } elseif ($nextStep->department_id) {
                    $this->notificationService->notifyDepartment($nextStep->department_id, $title, $message, $url, 'document');
                }
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
            if ($requester instanceof User) {
                $this->notificationService->notify(
                    $requester,
                    'Surat Izin Ditolak',
                    "{$permit->permit_number} ditolak: {$request->reason}",
                    "/permit-requests/{$permit->id}",
                    'x'
                );
            }
        }

        return back()->with('success', 'Permohonan ditolak.');
    }
}
