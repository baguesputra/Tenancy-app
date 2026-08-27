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
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(config('app.allow_local_login'), 403, 'Login lokal dinonaktifkan di environment ini.');

        $key = 'login:' . $request->ip();

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

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}