<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $credentials = $request->validate([
            'employee_number' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            return back()->withErrors([
                'employee_number' => 'Employee number atau password salah.',
            ]);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        if ($user->must_change_password) {
            return redirect()->route('password.change.form');
        }

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}