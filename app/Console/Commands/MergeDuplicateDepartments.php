<?php

namespace App\Console\Commands;

use App\Services\MasterDedupService;
use Illuminate\Console\Command;

class MergeDuplicateDepartments extends Command
{
    protected $signature = 'master:merge-duplicate-departments {--force : Terapkan remap referensi dan hapus baris legacy}';

    protected $description = 'Gabungkan department legacy ke department GATE dan remap referensinya';

    public function handle(MasterDedupService $dedup): int
    {
        if (! $this->option('force')) {
            $rencana = $dedup->rencana();

            if (empty($rencana['mapping'])) {
                $this->info('Tidak ada kandidat merge.');
            } else {
                $this->table(
                    ['Sumber', 'Nama', 'Target', 'Referensi'],
                    collect($rencana['mapping'])->map(fn ($m) => [
                        $m['sumber_id'],
                        $m['sumber_nama'],
                        "{$m['target_id']} ({$m['target_nama']})",
                        collect($m['referensi'])->filter()->map(fn ($v, $k) => "{$k}:{$v}")->implode(' ') ?: '-',
                    ])->all()
                );
            }

            foreach ($rencana['tetap'] as $t) {
                $this->line("Dilewati: {$t['id']} {$t['nama']} — {$t['alasan']}");
            }

            $this->warn('Pratinjau saja. Jalankan ulang dengan --force untuk menerapkan.');

            return self::SUCCESS;
        }

        $hasil = $dedup->merge();

        foreach ($hasil['statistik'] as $s) {
            $pindah = collect($s['dipindah'])->filter()->map(fn ($v, $k) => "{$k}:{$v}")->implode(' ');
            $this->info("Merge {$s['sumber_id']} ({$s['sumber_nama']}) -> {$s['target_id']} ({$s['target_nama']}): ".($pindah ?: '-'));
        }

        foreach ($hasil['tetap'] as $t) {
            $this->line("Dilewati: {$t['id']} {$t['nama']} — {$t['alasan']}");
        }

        $this->info('Selesai. '.count($hasil['statistik']).' department legacy digabung.');

        return self::SUCCESS;
    }
}
