<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class PasswordChangeController extends Controller
{
    public function edit()
    {
        return Inertia::render('Auth/ChangePassword');
    }

    public function update(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update([
            'password' => bcrypt($request->password),
            'must_change_password' => false,
        ]);

        return redirect()->route('dashboard');
    }
}