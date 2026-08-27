<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.enforce_password_change')) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && $user->auth_provider === 'local' && $user->must_change_password && ! $request->routeIs('password.change*')) {
            return redirect()->route('password.change.form');
        }

        return $next($request);
    }
}