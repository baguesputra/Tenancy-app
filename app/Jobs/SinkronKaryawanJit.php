<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Gate\GateClient;
use App\Services\Gate\SinkronisasiKaryawanService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SinkronKaryawanJit implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public $tries = 1;

    public $timeout = 20;

    public $uniqueFor = 120;

    public function __construct(public int $userId, public string $email) {}

    public function uniqueId(): string
    {
        return 'gate-jit-user-'.$this->userId;
    }

    public function handle(GateClient $gate, SinkronisasiKaryawanService $sinkron): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }
        if ($user->gate_synced_at && $user->gate_synced_at->gt(now()->subMinutes(15))) {
            return;
        }
        if (! $baris = $gate->cariKaryawanByEmail($this->email, 3.0)) {
            return;
        }
        $sinkron->sinkronSatu($baris);
        Log::info('Gate JIT OK', ['user_id' => $user->id, 'email' => $this->email]);
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('Gate JIT gagal', ['user_id' => $this->userId, 'error' => $e->getMessage()]);
    }
}
