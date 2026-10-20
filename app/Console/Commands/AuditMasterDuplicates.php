<?php

namespace App\Console\Commands;

use App\Services\MasterDedupService;
use Illuminate\Console\Command;

class AuditMasterDuplicates extends Command
{
    protected $signature = 'master:audit-duplicates {--json : Output JSON}';

    protected $description = 'Audit duplikat master organisasi (department legacy vs GATE)';

    public function handle(MasterDedupService $dedup): int
    {
        $hasil = $dedup->audit();

        if ($this->option('json')) {
            $this->line(json_encode($hasil, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        if (empty($hasil)) {
            $this->info('Tidak ada department legacy (gate_id null).');

            return self::SUCCESS;
        }

        $baris = [];
        foreach ($hasil as $item) {
            $ref = collect($item['referensi'])->filter()->map(fn ($v, $k) => "{$k}:{$v}")->implode(' ');
            $target = $item['kandidat']
                ? "{$item['kandidat']['id']} ({$item['kandidat']['name']})"
                : ($item['ambigu'] ? 'AMBIGU' : 'TETAP (lokal)');

            $baris[] = [$item['id'], $item['name'], $ref ?: '-', $target];
        }

        $this->table(['ID', 'Nama', 'Referensi', 'Target'], $baris);
        $this->info('Jalankan master:merge-duplicate-departments untuk pratinjau, tambahkan --force untuk menerapkan.');

        return self::SUCCESS;
    }
}
