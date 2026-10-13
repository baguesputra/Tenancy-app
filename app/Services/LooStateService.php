<?php

namespace App\Services;

use App\Models\Loo;
use App\Models\LooHistory;
use App\Models\LooSection;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LooStateService
{
    public function __construct(private TenantSyncService $tenantSync) {}

    public function canTransition(Loo $loo, string $to): bool
    {
        return in_array($to, config("loo.transitions.{$loo->status}") ?? [], true);
    }

    public function transition(Loo $loo, string $to, User $actor, array $meta = []): Loo
    {
        if (! $this->canTransition($loo, $to)) {
            throw ValidationException::withMessages([
                'status' => "Transisi dari '{$loo->status}' ke '{$to}' tidak diizinkan.",
            ]);
        }

        return DB::transaction(function () use ($loo, $to, $actor, $meta) {
            $from = $loo->status;
            $fromStage = $loo->current_stage;

            if ($to === 'cancelled' && ! empty($meta['cancel_reason'])) {
                $loo->cancel_reason = $meta['cancel_reason'];
            }

            $loo->updateStatus($to);

            // Link tracking publik: mulai hitung 1 bulan sejak terminal
            // (kecuali sudah diperpanjang lebih lama secara manual).
            if (in_array($to, ['completed', 'cancelled'], true)
                && ($loo->track_expires_at === null || $loo->track_expires_at->lt(now()->addMonth()))) {
                $loo->forceFill(['track_expires_at' => now()->addMonth()])->save();
            }

            $this->log($loo, $actor, 'status_changed', [
                'from_status' => $from,
                'to_status' => $to,
                'from_stage' => $fromStage,
                'to_stage' => $loo->current_stage,
            ], $meta);

            // LOO selesai = materialize ke master Tenant + Tenancy.
            if ($to === 'completed') {
                $this->tenantSync->sync($loo);
                $this->log($loo, $actor, 'handover_completed', [], ['tenant_synced' => true]);
            }

            return $loo->fresh();
        });
    }

    public function fillSection(Loo $loo, string $key, string $label, array $data, User $actor, bool $submit = false): LooSection
    {
        $section = LooSection::updateOrCreate(
            ['loo_id' => $loo->id, 'section_key' => $key],
            [
                'section_label' => $label,
                'data' => $data,
                'filled_by' => $actor->id,
                'filled_at' => now(),
            ]
        );

        if ($submit) {
            $section->update(['is_submitted' => true, 'submitted_at' => now()]);
            $this->log($loo, $actor, 'section_filled', [], [
                'section_key' => $key,
                'is_submit' => true,
            ]);
        }

        return $section;
    }

    public function log(Loo $loo, User $actor, string $action, array $attrs = [], array $meta = []): LooHistory
    {
        return LooHistory::create([
            'loo_id' => $loo->id,
            'user_id' => $actor->id,
            'action' => $action,
            'from_status' => $attrs['from_status'] ?? null,
            'to_status' => $attrs['to_status'] ?? null,
            'from_stage' => $attrs['from_stage'] ?? null,
            'to_stage' => $attrs['to_stage'] ?? null,
            'changes' => $attrs['changes'] ?? null,
            'metadata' => $meta ?: null,
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 255),
        ]);
    }
}
