<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PacuSinkronGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $respon = $next($request);

        if (app()->runningInConsole() || app()->runningUnitTests()) {
            return $respon;
        }

        try {
            if (Cache::get('gate_tick_at', 0) > now()->subMinute()->timestamp) {
                return $respon;
            }
            Cache::put('gate_tick_at', now()->timestamp, 120);

            Artisan::call('schedule:run');
            Artisan::call('queue:work', ['--once' => true, '--sleep' => 0, '--tries' => 1]);
        } catch (\Throwable) {
        }

        return $respon;
    }
}
