<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermitTimeLock
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('permit.enabled')) {
            return $next($request);
        }

        $user = $request->user();
        if ($user instanceof User && $user->hasAnyRole(config('permit.excluded_roles'))) {
            return $next($request);
        }

        $now = Carbon::now(config('permit.timezone'));
        $lockStart = Carbon::createFromFormat('H:i', config('permit.lock_start'), config('permit.timezone'));
        $lockEnd = Carbon::createFromFormat('H:i', config('permit.lock_end'), config('permit.timezone'));

        $isLocked = $this->isTimeLocked($now, $lockStart, $lockEnd);

        if ($isLocked) {
            $message = sprintf(
                'Pengajuan izin dikunci di luar jam kerja (%s - %s WITA). Silakan ajukan pada jam kerja.',
                config('permit.lock_start'),
                config('permit.lock_end')
            );

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 403);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }

    private function isTimeLocked(Carbon $now, Carbon $lockStart, Carbon $lockEnd): bool
    {
        if ($lockStart->equalTo($lockEnd)) {
            return false;
        }

        $nowTime = $now->format('H:i');

        if ($lockStart->lessThan($lockEnd)) {
            return $nowTime >= $lockStart->format('H:i') && $nowTime < $lockEnd->format('H:i');
        }

        return $nowTime >= $lockStart->format('H:i') || $nowTime < $lockEnd->format('H:i');
    }
}