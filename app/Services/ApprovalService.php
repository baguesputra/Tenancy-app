<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class ApprovalService
{
    /**
     * Setup approval steps untuk sebuah record. Dipanggil sekali saat record dibuat.
     *
     * Contoh $steps:
     * [
     *   ['step_key' => 'tenancy', 'label' => 'Approval Tenancy', 'department_id' => 1],
     *   ['step_key' => 'bs', 'label' => 'Approval BS', 'department_id' => 2],
     *   ['step_key' => 'security', 'label' => 'Cek Fisik Security', 'department_id' => 3],
     * ]
     */
    public function setupSteps(Model $approvable, array $steps): void
    {
        foreach ($steps as $index => $step) {
            $approvable->approvals()->create([
                'step_key' => $step['step_key'],
                'label' => $step['label'],
                'department_id' => $step['department_id'] ?? null,
                'order' => $index + 1,
                'status' => 'pending',
            ]);
        }
    }

    public function approve(Approval $approval, User $user, ?string $notes = null): Approval
    {
        $this->authorizeUserForStep($approval, $user);

        $approval->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'notes' => $notes,
        ]);

        return $approval;
    }

    public function reject(Approval $approval, User $user, string $reason): Approval
    {
        $this->authorizeUserForStep($approval, $user);

        $approval->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'notes' => $reason,
        ]);

        return $approval;
    }

    public function isFullyApproved(Model $approvable): bool
    {
        return $approvable->approvals()->where('status', '!=', 'approved')->doesntExist();
    }

    public function hasRejection(Model $approvable): bool
    {
        return $approvable->approvals()->where('status', 'rejected')->exists();
    }

    private function authorizeUserForStep(Approval $approval, User $user): void
    {
        if ($approval->department_id && $user->department_id !== $approval->department_id) {
            throw ValidationException::withMessages([
                'approval' => 'Anda tidak berwenang melakukan approval tahap ini.',
            ]);
        }

        if ($approval->status !== 'pending') {
            throw ValidationException::withMessages([
                'approval' => 'Tahap approval ini sudah diproses sebelumnya.',
            ]);
        }

        if ($approval->approvable->status === 'rejected') {
            throw ValidationException::withMessages([
                'approval' => 'Permohonan ini sudah ditolak, tidak ada aksi lanjutan yang bisa dilakukan.',
            ]);
        }

        $hasPendingEarlierStep = Approval::where('approvable_type', $approval->approvable_type)
            ->where('approvable_id', $approval->approvable_id)
            ->where('order', '<', $approval->order)
            ->where('status', '!=', 'approved')
            ->exists();

        if ($hasPendingEarlierStep) {
            throw ValidationException::withMessages([
                'approval' => 'Tahap approval sebelumnya belum selesai, tidak bisa lompat urutan.',
            ]);
        }
    }
}