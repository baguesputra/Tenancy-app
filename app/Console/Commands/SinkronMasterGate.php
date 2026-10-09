<?php

namespace App\Console\Commands;

use App\Models\GateSyncLog;
use App\Services\Gate\SinkronisasiMasterService;
use Illuminate\Console\Command;

class SinkronMasterGate extends Command
{
    protected $signature = 'gate:sinkron-master
        {--company= : Filter company_id GATE}
        {--dry-run : Pratinjau tanpa menyimpan}';

    protected $description = 'Sinkron master organisasi GATE (departemen, divisi, jabatan)';

    public function handle(SinkronisasiMasterService $sinkron): int
    {
        $hasil = $sinkron->sinkron($this->option('company'), (bool) $this->option('dry-run'));

        GateSyncLog::create([
            'kind' => 'master', 'source' => 'jadwal', 'is_dry_run' => (bool) $this->option('dry-run'),
            'scope' => GateSyncLog::buatScope(['company' => $this->option('company')]),
            'count_departemen' => $hasil['departemen'], 'count_divisi' => $hasil['divisi'],
            'count_jabatan' => $hasil['jabatan'], 'count_gagal' => count($hasil['gagal']),
        ]);

        $this->info('Departemen: '.$hasil['departemen'].', divisi: '.$hasil['divisi'].', jabatan: '.$hasil['jabatan']);

        foreach ($hasil['gagal'] as $gagal) {
            $this->error($gagal);
        }

        return self::SUCCESS;
    }
}
