<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\PermitRequest;
use App\Services\ApprovalService;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(
        private ApprovalService $approvalService,
        private PermitRequestService $permitService,
    ) {}

    public function approve(Approval $approval, Request $request)
    {
        $request->validate(['notes' => 'nullable|string']);

        $this->approvalService->approve($approval, $request->user(), $request->notes);

        if ($approval->approvable instanceof PermitRequest) {
            $this->permitService->syncStatus($approval->approvable);
        }

        return back()->with('success', 'Approval berhasil diproses.');
    }

    public function reject(Approval $approval, Request $request)
    {
        $request->validate(['reason' => 'required|string']);

        $this->approvalService->reject($approval, $request->user(), $request->reason);

        if ($approval->approvable instanceof PermitRequest) {
            $this->permitService->syncStatus($approval->approvable);
        }

        return back()->with('success', 'Permohonan ditolak.');
    }
}