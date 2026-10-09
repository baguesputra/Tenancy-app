<?php

namespace App\Console\Commands;

use App\Models\GateSyncLog;
use App\Models\GateSyncSetting;
use App\Services\Gate\SinkronisasiKaryawanService;
use Illuminate\Console\Command;

class SinkronKaryawanGate extends Command
{
    protected $signature = 'gate:sinkron-karyawan
        {--company= : Filter company_id GATE}
        {--department= : Filter department_id GATE}
        {--limit= : Batas jumlah baris}
        {--dry-run : Pratinjau tanpa menyimpan}';

    protected $description = 'Sinkron karyawan GATE menjadi user tenancy';

    public function handle(SinkronisasiKaryawanService $sinkron): int
    {
        if (! GateSyncLog::where('kind', 'master')->where('is_dry_run', false)->exists()) {
            $this->call('gate:sinkron-master');
        }

        $hasil = $sinkron->sinkron(
            [
                'company_id' => $this->option('company'),
                'department_id' => $this->option('department'),
            ],
            (bool) $this->option('dry-run'),
            $this->option('limit') ? (int) $this->option('limit') : null,
            GateSyncSetting::current()->grace_miss_count ?? 2
        );

        GateSyncLog::create([
            'kind' => 'karyawan', 'source' => 'jadwal', 'is_dry_run' => (bool) $this->option('dry-run'),
            'scope' => GateSyncLog::buatScope([
                'company' => $this->option('company'),
                'department' => $this->option('department'),
                'limit' => $this->option('limit'),
            ]),
            'count_baru' => count($hasil['baru']), 'count_diperbarui' => count($hasil['diperbarui']),
            'count_gagal' => count($hasil['gagal']), 'count_dilewati' => $hasil['dilewati'],
            'count_nonaktif' => $hasil['nonaktif'],
        ]);

        $this->info('Baru: '.count($hasil['baru']).', diperbarui: '.count($hasil['diperbarui']).', gagal: '.count($hasil['gagal']).', dilewati: '.$hasil['dilewati'].', nonaktif: '.$hasil['nonaktif']);

        foreach ($hasil['gagal'] as $gagal) {
            $this->error($gagal);
        }

        return self::SUCCESS;
    }
}
