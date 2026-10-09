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

        if (! config('services.gate.pacu_enabled')) {
            return $respon;
        }

        try {
            if (! Cache::add('gate_tick_at', now()->timestamp, 60)) {
                return $respon;
            }

            Artisan::call('schedule:run');
            Artisan::call('queue:work', ['--once' => true, '--sleep' => 0, '--tries' => 1]);
        } catch (\Throwable $e) {
            report($e);
        }

        return $respon;
    }
}
