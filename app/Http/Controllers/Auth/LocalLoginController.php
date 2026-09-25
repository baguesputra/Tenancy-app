<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;

class LocalLoginController extends Controller
{
    public function create()
    {
        return Inertia::render('Auth/Login', [
            'allowLocalLogin' => config('app.allow_local_login'),
            'ssoEnabled' => (bool) config('services.perusahaan.metadata'),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(config('app.allow_local_login'), 403, 'Login lokal dinonaktifkan di environment ini.');

        $key = 'login:'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);

            return back()->withErrors([
                'employee_number' => "Terlalu banyak percobaan. Coba lagi dalam {$seconds} detik.",
            ]);
        }

        $credentials = $request->validate([
            'employee_number' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            RateLimiter::hit($key, 60);

            return back()->withErrors([
                'employee_number' => 'Employee number atau password salah.',
            ]);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        if ($token = session()->pull('scan_redirect_token')) {
            return redirect()->route('scan.resolve', $token);
        }

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request)
    {
        if (config('auth.mode') === 'sso' && Auth::user()?->sso_id) {
            return app(SsoController::class)->logout();
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if (config('auth.mode') === 'sso') {
            return redirect()->away(config('services.gate.base_url', 'https://gate.appdutamall.com').'/dashboard');
        }

        return redirect()->route('login');
    }
}
