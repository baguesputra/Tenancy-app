<?php

namespace App\Services;

use App\Models\Unit;
use App\Models\UnitGroup;
use Illuminate\Support\Collection;

/**
 * Nama area gabungan diturunkan dari unit anggotanya:
 * nomor berurutan jadi rentang (A1-3), sisanya ditulis satu-satu (A2+A4+A6).
 */
class UnitGroupNameService
{
    public const MAX_LENGTH = 60;

    /**
     * @param  Collection<int, Unit>  $units
     */
    public function suggest(Collection $units): string
    {
        if ($units->isEmpty()) {
            return '';
        }

        $labels = $units->map(fn (Unit $unit) => $this->label($unit));

        // Nomor sama di lantai berbeda → pakai kode unit penuh agar tidak ambigu.
        if ($labels->count() !== $labels->unique()->count()) {
            $labels = $units->map(fn (Unit $unit) => (string) $unit->unit_code);
        }

        $buckets = [];
        $plain = [];

        foreach ($units->values() as $index => $unit) {
            $label = $labels[$index] ?? (string) $unit->unit_code;

            if (preg_match('/^(.*?)(\d+)$/u', $label, $match)) {
                $buckets[$match[1]][] = [
                    'number' => (int) $match[2],
                    'width' => strlen($match[2]),
                ];
            } else {
                $plain[] = $label;
            }
        }

        $segments = $plain;
        ksort($buckets);

        foreach ($buckets as $prefix => $items) {
            usort($items, fn ($a, $b) => $a['number'] <=> $b['number']);
            $segments = array_merge($segments, $this->ranges($prefix, $items));
        }

        return implode('+', $segments);
    }

    /**
     * Nama unik per cabang: tidak boleh sama dengan nama area lain, kode unit,
     * atau nomor unit (termasuk gabungan blok+nomor seperti A12).
     *
     * @param  array<int, int>  $excludeUnitIds  unit anggota area ini sendiri
     */
    public function unique(
        string $name,
        int $branchId,
        ?int $ignoreGroupId = null,
        array $excludeUnitIds = [],
        ?string $block = null,
    ): string {
        $base = trim($name) !== '' ? trim($name) : 'AREA';

        if (mb_strlen($base) > self::MAX_LENGTH) {
            $base = $this->areaCode($branchId, $block, $ignoreGroupId, $excludeUnitIds);
        }

        $candidate = $base;
        $suffix = 2;

        while ($this->taken($candidate, $branchId, $ignoreGroupId, $excludeUnitIds)) {
            $candidate = $base.' ('.$suffix.')';
            $suffix++;
        }

        return $candidate;
    }

    /**
     * @param  array<int, int>  $excludeUnitIds
     */
    public function taken(
        string $name,
        int $branchId,
        ?int $ignoreGroupId = null,
        array $excludeUnitIds = [],
    ): bool {
        $groupExists = UnitGroup::where('branch_id', $branchId)
            ->when($ignoreGroupId, fn ($q) => $q->where('id', '!=', $ignoreGroupId))
            ->where('name', $name)
            ->exists();

        if ($groupExists) {
            return true;
        }

        $units = Unit::where('branch_id', $branchId)
            ->when($excludeUnitIds !== [], fn ($q) => $q->whereNotIn('id', $excludeUnitIds));

        if ((clone $units)->where('unit_code', $name)->exists()) {
            return true;
        }

        if ((clone $units)->where('unit_number', $name)->exists()) {
            return true;
        }

        // Nama seperti A12 juga bentrok dengan unit blok A nomor 12.
        if (preg_match('/^(.+?)(\d+)$/u', $name, $match)) {
            $number = ltrim($match[2], '0');

            return (clone $units)
                ->where('block', $match[1])
                ->where('unit_number', $number === '' ? '0' : $number)
                ->exists();
        }

        return false;
    }

    private function label(Unit $unit): string
    {
        $number = trim((string) $unit->unit_number);

        if ($number === '') {
            return (string) $unit->unit_code;
        }

        $prefix = trim((string) $unit->block) ?: trim((string) $unit->floor);

        return $prefix.$number;
    }

    /**
     * @param  array<int, array{number: int, width: int}>  $items
     * @return array<int, string>
     */
    private function ranges(string $prefix, array $items): array
    {
        $segments = [];
        $start = $prev = $items[0]['number'];
        $width = $items[0]['width'];

        foreach (array_slice($items, 1) as $item) {
            if ($item['number'] === $prev + 1) {
                $prev = $item['number'];

                continue;
            }

            $segments[] = $this->rangeLabel($prefix, $start, $prev, $width);
            $start = $prev = $item['number'];
            $width = $item['width'];
        }

        $segments[] = $this->rangeLabel($prefix, $start, $prev, $width);

        return $segments;
    }

    private function rangeLabel(string $prefix, int $start, int $end, int $width): string
    {
        $pad = fn (int $number) => str_pad((string) $number, $width, '0', STR_PAD_LEFT);

        return $start === $end
            ? $prefix.$pad($start)
            : $prefix.$pad($start).'-'.$pad($end);
    }

    private function areaCode(int $branchId, ?string $block, ?int $ignoreGroupId, array $excludeUnitIds = []): string
    {
        $prefix = 'AREA-'.(trim((string) $block) !== '' ? strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $block)) : 'A');
        $sequence = 1;

        do {
            $candidate = $prefix.'-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
            $sequence++;
        } while ($this->taken($candidate, $branchId, $ignoreGroupId, $excludeUnitIds));

        return $candidate;
    }
}
