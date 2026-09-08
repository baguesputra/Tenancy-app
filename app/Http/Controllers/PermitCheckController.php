<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\PermitGood;
use App\Models\PermitRequest;
use App\Models\PermitWorker;
use App\Services\ApprovalService;
use App\Services\PermitRequestService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PermitCheckController extends Controller
{
    public function __construct(
        private ApprovalService $approvalService,
        private PermitRequestService $permitService,
        private NotificationService $notificationService,
    ) {}

    public function toggleWorker(PermitWorker $worker, Request $request)
    {
        $this->authorizeSecurityAction($worker->permitRequest, $request);

        $worker->update([
            'is_present' => ! $worker->is_present,
            'checked_at' => now(),
        ]);

        return back();
    }

    public function updateWorkerNote(PermitWorker $worker, Request $request)
    {
        $this->authorizeSecurityAction($worker->permitRequest, $request);

        $request->validate(['mismatch_note' => 'nullable|string']);

        $worker->update(['mismatch_note' => $request->mismatch_note]);

        return back();
    }

    public function verifyGood(PermitGood $good, Request $request)
    {
        $this->authorizeSecurityAction($good->permitRequest, $request);

        $request->validate([
            'photo' => 'nullable|image|max:5120',
            'mismatch_note' => 'nullable|string',
        ]);

        $path = $good->photo_path;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('permit-goods', 'public');
        }

        $good->update([
            'is_verified' => true,
            'checked_at' => now(),
            'photo_path' => $path,
            'mismatch_note' => $request->mismatch_note,
        ]);

        return back();
    }

    /**
     * Selesaikan tahap cek fisik Security — wajib semua pekerja & barang
     * sudah dicek dulu. Kalau ada mismatch_note yang terisi, permit
     * ditandai is_flagged (soft-warning), bukan ditolak.
     */
    public function completeSecurityCheck(PermitRequest $permitRequest, Request $request)
    {
        $this->authorizeSecurityAction($permitRequest, $request);

        $allWorkersChecked = $permitRequest->workers()->where('is_present', false)->doesntExist();
        $allGoodsVerified = $permitRequest->goods()->where('is_verified', false)->doesntExist();

        if (! $allWorkersChecked || ! $allGoodsVerified) {
            throw ValidationException::withMessages([
                'security' => 'Semua pekerja dan barang harus dicek dulu sebelum menyelesaikan pemeriksaan.',
            ]);
        }

        $hasMismatch = $permitRequest->workers()->whereNotNull('mismatch_note')->exists()
            || $permitRequest->goods()->whereNotNull('mismatch_note')->exists();

        $securityStep = $permitRequest->approvals()->where('step_key', 'security')->first();
        $this->approvalService->approve($securityStep, $request->user());

        if ($hasMismatch) {
            $permitRequest->update(['is_flagged' => true]);
        }

        $this->permitService->syncStatus($permitRequest);

        $requester = $permitRequest->requestedBy;
        if ($requester) {
            $url = $requester instanceof \App\Models\TenantUser
                ? "/portal/permits/{$permitRequest->id}"
                : "/permit-requests/{$permitRequest->id}";

            $this->notificationService->notify(
                $requester,
                'Surat Izin Selesai',
                "{$permitRequest->permit_number} — {$permitRequest->store_name_snapshot} telah selesai diproses.",
                $url,
                'check'
            );
        }

        $tenancyDept = \App\Models\Department::where('name', 'Tenancy')->first();
        $bsDept = \App\Models\Department::where('name', 'Building Service')->first();

        foreach ([$tenancyDept, $bsDept] as $dept) {
            if ($dept) {
                $this->notificationService->notifyDepartment(
                    $dept->id,
                    'Surat Izin Selesai',
                    "{$permitRequest->permit_number} telah selesai diproses Security.",
                    "/permit-requests/{$permitRequest->id}",
                    'check'
                );
            }
        }

        return redirect()->route('permit-requests.show', $permitRequest->id)
            ->with('success', 'Pemeriksaan fisik selesai.' . ($hasMismatch ? ' Ada catatan ketidaksesuaian yang ditandai.' : ''));
    }

    private function authorizeSecurityAction(PermitRequest $permit, Request $request): void
    {
        $securityDept = Department::where('name', 'Security')->first();

        abort_unless(
            $request->user()->department_id === $securityDept?->id,
            403,
            'Hanya staff Security yang bisa melakukan aksi ini.'
        );

        abort_if($permit->status === 'rejected', 403, 'Permohonan ini sudah ditolak.');

        $securityStep = $permit->approvals()->where('step_key', 'security')->first();

        abort_unless(
            $securityStep && $securityStep->status === 'pending',
            403,
            'Belum waktunya cek fisik — approval sebelumnya belum selesai, atau tahap ini sudah diproses.'
        );
    }
}