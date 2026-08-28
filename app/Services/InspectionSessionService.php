<?php

namespace App\Services;

use App\Models\InspectionSession;
use App\Models\User;
use Illuminate\Support\Str;

class InspectionSessionService
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function startOrSync(User $user, ?string $uuid, array $data = []): InspectionSession
    {
        $id = $uuid ?? (string) Str::uuid();

        return InspectionSession::updateOrCreate(
            ['id' => $id],
            [
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'started_at' => $data['started_at'] ?? now(),
                'status' => $data['status'] ?? 'in_progress',
            ]
        );
    }

    public function getOrCreateActiveSession(User $user): InspectionSession
    {
        $active = InspectionSession::where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->first();

        return $active ?? $this->startOrSync($user, null);
    }

    public function markCompleted(InspectionSession $session): InspectionSession
    {
        $session->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        return $session;
    }

    public function getSessionsForUser(User $user)
    {
        $query = InspectionSession::with(['branch', 'user', 'inspections.tenant'])
            ->latest('started_at');

        return $this->branchScope->apply($query, $user)->paginate(20);
    }
}