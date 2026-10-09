<?php

use App\Models\GateSyncLog;
use App\Models\GateSyncSetting;
use Illuminate\Foundation\DevCommands;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tenancy pakai port 8001 (koperasi-app pakai 8000/5173).
// Default framework: serve port 8000.
// DevCommands::artisan('serve --host=127.0.0.1 --port=8000', 'server');
DevCommands::artisan('serve --host=127.0.0.1 --port=8001', 'server');

// Master didaftarkan sebelum karyawan agar saat keduanya jatuh bareng
// (mis. 02:00) schedule:run mengeksekusi master lebih dulu.
Schedule::command('gate:sinkron-master')->dailyAt(
    GateSyncSetting::current()->master_daily_at ?? '02:00'
)->when(fn () => GateSyncSetting::current()->schedule_enabled)
    ->withoutOverlapping()->onOneServer();

Schedule::command('gate:sinkron-karyawan')->everyMinute()
    ->when(function () {
        $set = GateSyncSetting::current();
        if (! $set->schedule_enabled) {
            return false;
        }
        $interval = max(5, (int) ($set->karyawan_interval_minutes ?? 15));
        $last = GateSyncLog::where('kind', 'karyawan')
            ->where('source', 'jadwal')->latest()->value('created_at');

        return ! $last || $last->lt(now()->subMinutes($interval));
    })->withoutOverlapping()->onOneServer();
