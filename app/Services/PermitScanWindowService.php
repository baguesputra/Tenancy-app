<?php

namespace App\Services;

use App\Models\PermitScanSetting;
use Illuminate\Support\Carbon;

/**
 * Jendela jam akses QR permit (keluar-masuk barang / surat izin kerja).
 *
 * Tiap hari punya `open` (malam hari itu) dan `close` (pagi hari itu).
 * Jendela melintasi tengah malam: contoh Senin buka 22.10, tutup 08.50 —
 * yang ditutup pagi Senin adalah sesi yang dibuka Minggu malam.
 */
class PermitScanWindowService
{
    public function enabled(): bool
    {
        return (bool) PermitScanSetting::current()->enabled;
    }

    public function isOpen(?Carbon $now = null): bool
    {
        if (! $this->enabled()) {
            return true;
        }

        $now = ($now ?? Carbon::now())->copy()->setTimezone($this->timezone());
        $window = $this->windows()[(string) $now->dayOfWeekIso] ?? null;

        if (! $window || empty($window['enabled'])) {
            return false;
        }

        return $this->within($now->format('H:i'), $window['open'], $window['close']);
    }

    public function nextOpenAt(?Carbon $now = null): ?Carbon
    {
        if (! $this->enabled()) {
            return null;
        }

        $now = ($now ?? Carbon::now())->copy()->setTimezone($this->timezone());
        $windows = $this->windows();

        for ($i = 0; $i <= 7; $i++) {
            $day = $now->copy()->addDays($i);
            $window = $windows[(string) $day->dayOfWeekIso] ?? null;

            if (! $window || empty($window['enabled'])) {
                continue;
            }

            $open = Carbon::parse($day->format('Y-m-d').' '.$window['open'], $this->timezone());

            if ($open->greaterThan($now)) {
                return $open;
            }
        }

        return null;
    }

    /** Ringkasan jam untuk halaman scan, label QR, dan modal kartu akses. */
    public function summary(): ?string
    {
        if (! $this->enabled()) {
            return null;
        }

        $windows = $this->windows();
        $groups = [];

        foreach (PermitScanSetting::DAY_LABELS as $day => $label) {
            $window = $windows[(string) $day] ?? null;
            $desc = $window && ! empty($window['enabled'])
                ? $this->jam($window['open']).'–'.$this->jam($window['close'])
                : 'tutup';

            $last = count($groups) - 1;
            if ($last >= 0 && $groups[$last]['desc'] === $desc) {
                $groups[$last]['to'] = $label;

                continue;
            }

            $groups[] = ['from' => $label, 'to' => $label, 'desc' => $desc];
        }

        return implode(' · ', array_map(
            fn ($g) => $g['from'].($g['from'] !== $g['to'] ? '–'.$g['to'] : '').' '.$g['desc'],
            $groups
        ));
    }

    private function windows(): array
    {
        return PermitScanSetting::current()->windows ?: PermitScanSetting::defaults();
    }

    private function within(string $time, string $open, string $close): bool
    {
        if ($open === $close) {
            return false;
        }

        if ($open < $close) {
            return $time >= $open && $time < $close;
        }

        // Melintasi tengah malam: sesi malam ini atau sesi semalam yang belum ditutup.
        return $time >= $open || $time < $close;
    }

    private function jam(string $time): string
    {
        return str_replace(':', '.', $time);
    }

    private function timezone(): string
    {
        return config('permit.timezone', 'Asia/Makassar');
    }
}
