<?php

namespace App\Services;

use App\Models\InspectionSession;
use App\Models\User;
use Illuminate\Support\Str;

class InspectionSessionService
{
    /**
     * Mulai sesi baru, atau sinkronkan sesi yang sudah ada (idempotent).
     * $uuid null => web (server generate). $uuid terisi => mobile (dari client).
     */
    public function startOrSync(User $user, ?string $uuid, array $data = []): InspectionSession
    {
        $id = $uuid ?? (string) Str::uuid();

        return InspectionSession::updateOrCreate(
            ['id' => $id],
            [
                'branch_id' => $user->branch_id, // selalu dari user, bukan dari $data
                'user_id' => $user->id,
                'started_at' => $data['started_at'] ?? now(),
                'status' => $data['status'] ?? 'in_progress',
            ]
        );
    }

    public function markCompleted(InspectionSession $session): InspectionSession
    {
        $session->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        return $session;
    }

    /**
     * Query dengan branch-scoping otomatis (staff cuma lihat cabangnya, manager+ lihat semua).
     */
    public function getSessionsForUser(User $user, BranchScopeService $branchScope)
    {
        $query = InspectionSession::with(['branch', 'user', 'inspections.tenant'])
            ->latest('started_at');

        return $branchScope->apply($query, $user)->paginate(20);
    }
}