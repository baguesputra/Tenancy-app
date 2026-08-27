<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class SsoController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('sso')->redirect();
    }

    public function callback()
    {
        $ssoUser = Socialite::driver('sso')->user();

        $user = User::where('sso_id', $ssoUser->getId())->first();

        if (! $user) {
            // Cocokkan dengan user existing berdasarkan email, kalau ada
            $user = User::where('email', $ssoUser->getEmail())->first();
        }

        if ($user) {
            // Update data terbaru dari SSO, jangan timpa branch_id/role manual yang sudah diatur admin
            $user->update([
                'sso_id' => $ssoUser->getId(),
                'name' => $ssoUser->getName(),
                'email' => $ssoUser->getEmail(),
                'auth_provider' => 'sso',
            ]);
        } else {
            $user = User::create([
                'sso_id' => $ssoUser->getId(),
                'name' => $ssoUser->getName(),
                'email' => $ssoUser->getEmail(),
                'auth_provider' => 'sso',
                'must_change_password' => false, // user SSO tidak pakai password lokal
                'branch_id' => null, // perlu di-set manual oleh admin setelah user pertama kali login
            ]);
            $user->assignRole('staff'); // default role, admin bisa ubah nanti
        }

        Auth::login($user);
        request()->session()->regenerate();

        if (! $user->branch_id) {
            // User baru dari SSO belum di-assign cabang — perlu halaman khusus
            // atau notifikasi ke admin. Untuk sekarang redirect ke dashboard saja.
        }

        return redirect()->route('dashboard');
    }
}