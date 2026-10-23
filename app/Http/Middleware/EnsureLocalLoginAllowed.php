<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLocalLoginAllowed
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('auth.mode') === 'sso') {
            if ($request->query('local') === '1' && config('auth.allow_local_login', false)) {
                return $next($request);
            }

            return redirect()->route('sso.redirect');
        }

        return $next($request);
    }
}
