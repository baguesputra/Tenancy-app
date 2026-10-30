<?php

namespace App\Console\Commands;

use App\Models\PermitRequest;
use App\Services\PermitNumberService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RenumberParkirCustomerNumbers extends Command
{
    protected $signature = 'permits:renumber-parkir-customer
                            {--apply : Tulis perubahan ke database (default hanya simulasi)}';

    protected $description = 'Pindahkan nomor surat form parkir & customer dari seri TC ke seri PRK/CST';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $candidates = PermitRequest::query()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'permit_number', 'activity_types', 'created_at'])
            ->filter(fn (PermitRequest $permit) => $this->needsRenumber($permit))
            ->values();

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada nomor yang perlu diubah.');

            return self::SUCCESS;
        }

        // Urutan baru per (kode, periode), mengikuti urutan pembuatan.
        $sequences = [];
        $plan = [];

        foreach ($candidates as $permit) {
            $code = PermitNumberService::codeFor($permit->activity_types ?? []);
            $date = $permit->created_at ?? now();
            $period = $date->format('Y-m');
            $parts = $this->parse($permit->permit_number);
            $roman = $parts['roman'];
            $yy = $parts['yy'];

            $key = "{$code}|{$period}";
            $sequences[$key] = ($sequences[$key] ?? 0) + 1;

            $plan[] = [
                'permit' => $permit,
                'code' => $code,
                'period' => $period,
                'from' => $permit->permit_number,
                'to' => sprintf('%03d/%s/%s/%s', $sequences[$key], $code, $roman, $yy),
            ];
        }

        $this->table(
            ['ID', 'Aktivitas', 'Periode', 'Nomor lama', 'Nomor baru'],
            collect($plan)->map(fn (array $row) => [
                $row['permit']->id,
                implode(',', $row['permit']->activity_types ?? []),
                $row['period'],
                $row['from'],
                $row['to'],
            ])->all()
        );

        $conflicts = collect($plan)
            ->filter(fn (array $row) => PermitRequest::where('permit_number', $row['to'])
                ->whereKeyNot($row['permit']->getKey())
                ->exists())
            ->map(fn (array $row) => "{$row['to']} sudah dipakai")
            ->values();

        if ($conflicts->isNotEmpty()) {
            $this->error('Dibatalkan — ada nomor tujuan yang sudah terpakai:');
            $conflicts->each(fn (string $line) => $this->line("  - {$line}"));

            return self::FAILURE;
        }

        if (! $apply) {
            $this->warn('Simulasi saja. Jalankan ulang dengan --apply untuk menulis perubahan.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($plan) {
            foreach ($plan as $row) {
                $row['permit']->forceFill(['permit_number' => $row['to']])->save();
            }

            $this->syncCounters($plan);
        });

        $this->info(count($plan).' nomor diperbarui dan counter disinkronkan.');

        return self::SUCCESS;
    }

    private function needsRenumber(PermitRequest $permit): bool
    {
        $parts = $this->parse($permit->permit_number);

        if ($parts === null) {
            return false;
        }

        $code = PermitNumberService::codeFor($permit->activity_types ?? []);

        return $parts['code'] !== $code;
    }

    /**
     * @return array{seq: int, code: string, roman: string, yy: string}|null
     */
    private function parse(?string $number): ?array
    {
        if (! $number || ! preg_match('#^(\d+)/([^/]+)/([^/]+)/(\d+)$#', $number, $m)) {
            return null;
        }

        return ['seq' => (int) $m[1], 'code' => $m[2], 'roman' => $m[3], 'yy' => $m[4]];
    }

    /**
     * Hitung ulang counter dari nomor yang benar-benar ada, supaya seri TC
     * yang ditinggalkan form parkir/customer kembali rapat tanpa lubang.
     *
     * @param  array<int, array{permit: PermitRequest, code: string, period: string, from: string, to: string}>  $plan
     */
    private function syncCounters(array $plan): void
    {
        $keys = collect($plan)
            ->map(fn (array $row) => ['code' => $row['code'], 'period' => $row['period']])
            ->merge(collect($plan)->map(fn (array $row) => [
                'code' => PermitNumberService::DEFAULT_CODE,
                'period' => $row['period'],
            ]))
            ->unique(fn (array $key) => "{$key['code']}|{$key['period']}");

        foreach ($keys as $key) {
            // Periode tersimpan sebagai Y-m; nomor memakai bulan Romawi + tahun 2 digit.
            [$year, $month] = explode('-', $key['period']);
            $suffix = '/'.$key['code'].'/'.$this->roman((int) $month).'/'.substr($year, -2);

            $max = PermitRequest::query()
                ->where('permit_number', 'like', "%{$suffix}")
                ->pluck('permit_number')
                ->reduce(function (int $carry, string $number) {
                    $parts = $this->parse($number);

                    return $parts === null ? $carry : max($carry, $parts['seq']);
                }, 0);

            DB::table('permit_number_counters')->updateOrInsert(
                ['code' => $key['code'], 'period' => $key['period']],
                ['last_number' => $max, 'updated_at' => now(), 'created_at' => now()],
            );

            $this->line("  counter {$key['code']}|{$key['period']} = {$max}");
        }
    }

    private function roman(int $month): string
    {
        return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][$month - 1] ?? '';
    }
}
