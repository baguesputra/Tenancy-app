<?php

namespace App\Console\Commands;

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
        $hasil = $sinkron->sinkron(
            [
                'company_id' => $this->option('company'),
                'department_id' => $this->option('department'),
            ],
            (bool) $this->option('dry-run'),
            $this->option('limit') ? (int) $this->option('limit') : null
        );

        $this->info('Baru: '.count($hasil['baru']).', diperbarui: '.count($hasil['diperbarui']).', gagal: '.count($hasil['gagal']).', dilewati: '.$hasil['dilewati']);

        foreach ($hasil['gagal'] as $gagal) {
            $this->error($gagal);
        }

        return self::SUCCESS;
    }
}
