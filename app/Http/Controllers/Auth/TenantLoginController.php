<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;

class TenantLoginController extends Controller
{
    public function create()
    {
        return Inertia::render('TenantPortal/Login');
    }

    public function store(Request $request)
    {
        $key = 'tenant-login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return back()->withErrors(['username' => "Terlalu banyak percobaan. Coba lagi dalam {$seconds} detik."]);
        }

        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! Auth::guard('tenant')->attempt($credentials)) {
            RateLimiter::hit($key, 60);
            return back()->withErrors(['username' => 'Username atau password salah.']);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        return redirect()->route('tenant-portal.dashboard');
    }

    public function destroy(Request $request)
    {
        Auth::guard('tenant')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('tenant-portal.login');
    }
}