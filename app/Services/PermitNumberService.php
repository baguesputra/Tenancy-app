<?php

namespace App\Services;

use App\Models\PermitRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PermitNumberService
{
    private const ROMAN = [1 => 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    public static function codeFor(array $activityTypes): string
    {
        return in_array('pameran', $activityTypes) ? 'E&P' : 'TC';
    }

    public function next(array $activityTypes, ?Carbon $date = null): string
    {
        $date ??= now();
        $code = self::codeFor($activityTypes);
        $period = $date->format('Y-m');

        return DB::transaction(function () use ($code, $period, $date) {
            $counter = DB::table('permit_number_counters')
                ->where('code', $code)
                ->where('period', $period)
                ->lockForUpdate()
                ->first();

            $next = ($counter->last_number ?? 0) + 1;

            // ponytail: fallback scan existing manual numbers, drop when counters seeded
            $maxExisting = $this->maxExistingSequence($code, (int) $date->format('n'), $date->format('y'));
            if ($maxExisting >= $next) {
                $next = $maxExisting + 1;
            }

            if ($counter) {
                DB::table('permit_number_counters')->where('id', $counter->id)->update([
                    'last_number' => $next,
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('permit_number_counters')->insert([
                    'code' => $code,
                    'period' => $period,
                    'last_number' => $next,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $this->format($next, $code, $date);
        });
    }

    private function format(int $seq, string $code, Carbon $date): string
    {
        $roman = self::ROMAN[(int) $date->format('n')];
        $yy = $date->format('y');

        return sprintf('%03d/%s/%s/%s', $seq, $code, $roman, $yy);
    }

    private function maxExistingSequence(string $code, int $month, string $yy): int
    {
        $roman = self::ROMAN[$month];
        $suffix = "/{$code}/{$roman}/{$yy}";

        $max = 0;
        foreach (PermitRequest::where('permit_number', 'like', "%{$suffix}")->pluck('permit_number') as $number) {
            if (preg_match('/^(\d+)\//', $number, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        return $max;
    }
}
