<?php

namespace App\Services;

use App\Models\InspectionSession;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InspectionSessionService
{
    public function __construct(private BranchScopeService $branchScope) {}

    /**
     * Divisi yang boleh dipilih sebagai peserta sidak.
     */
    public const PARTICIPANT_DEPARTMENTS = ['Building Service', 'Engineering', 'Security'];

    public function startOrSync(User $user, ?string $uuid, array $data = []): InspectionSession
    {
        $id = $uuid ?? (string) Str::uuid();

        return InspectionSession::updateOrCreate(
            ['id' => $id],
            [
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'creator_name_snapshot' => $user->name,
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

    /**
     * Buat sesi sidak baru: PIC = pembuat (nama di-snapshot) + peserta + catatan.
     */
    public function createSession(User $user, array $participantIds = [], ?string $notes = null): InspectionSession
    {
        return \DB::transaction(function () use ($user, $participantIds, $notes) {
            $session = InspectionSession::create([
                'id' => (string) Str::uuid(),
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'creator_name_snapshot' => $user->name,
                'started_at' => now(),
                'status' => 'in_progress',
                'notes' => $notes,
            ]);
            $this->syncParticipants($session, $participantIds);

            return $session;
        });
    }

    /**
     * Ganti daftar peserta (hanya selama sesi berjalan).
     */
    public function syncParticipants(InspectionSession $session, array $participantIds): void
    {
        abort_if($session->status !== 'in_progress', 422, 'Peserta hanya bisa diubah selama sesi berjalan.');

        $ids = array_values(array_unique(array_filter($participantIds)));
        $users = User::with('department')->whereIn('id', $ids)->get()->keyBy('id');

        foreach ($ids as $id) {
            $u = $users->get($id);
            if (! $u) {
                throw ValidationException::withMessages(['participant_ids' => 'Ada peserta yang tidak dikenal.']);
            }
            if ($u->id === $session->user_id) {
                throw ValidationException::withMessages(['participant_ids' => 'PIC sudah otomatis tercatat, tidak perlu dipilih lagi.']);
            }
            if ((string) $u->branch_id !== (string) $session->branch_id) {
                throw ValidationException::withMessages(['participant_ids' => "Peserta {$u->name} beda cabang."]);
            }
            if (! in_array($u->department?->name, self::PARTICIPANT_DEPARTMENTS, true)) {
                throw ValidationException::withMessages(['participant_ids' => "Peserta {$u->name} harus dari Building Service, Engineering, atau Security."]);
            }
        }

        \DB::transaction(function () use ($session, $users, $ids) {
            $session->participants()->delete();
            foreach ($ids as $id) {
                $u = $users->get($id);
                $session->participants()->create([
                    'user_id' => $u->id,
                    'department_id' => $u->department_id,
                    'name_snapshot' => $u->name,
                    'department_name_snapshot' => $u->department?->name,
                ]);
            }
        });
    }

    public function getSessionsForUser(User $user)
    {
        $query = InspectionSession::with(['branch', 'user', 'participants', 'inspections.tenant'])
            ->latest('started_at');

        return $this->branchScope->apply($query, $user)->paginate(20);
    }
}