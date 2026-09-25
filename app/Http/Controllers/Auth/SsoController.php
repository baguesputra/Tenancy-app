<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Gate\GateClient;
use App\Services\Gate\SinkronisasiKaryawanService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class SsoController extends Controller
{
    public function redirect()
    {
        $tujuan = Socialite::driver('perusahaan')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return Inertia::location($tujuan);
    }

    public function callback(GateClient $gate, SinkronisasiKaryawanService $sinkron)
    {
        try {
            $ssoUser = Socialite::driver('perusahaan')
                ->stateless()
                ->user();

            $ssoId = $ssoUser->id;
            $email = $ssoUser->email ?? $ssoId;
            $name = $ssoUser->name;

            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $email = null;
            }

            Log::info('SSO Callback', ['sso_id' => $ssoId, 'email' => $email]);

            if (! $email) {
                return redirect()->route('sso.gagal')
                    ->with('error', 'Email tidak tersedia dari SSO. Hubungi admin untuk mendaftarkan email Anda.');
            }

            $user = User::where('sso_id', $ssoId)->first()
                ?? User::where('email', $email)->first();

            if (! $user) {
                $baris = $gate->cariKaryawanByEmail($email);
                $nik = $baris ? trim((string) ($baris['nik'] ?? '')) : null;
                $nama = $baris ? trim((string) ($baris['name'] ?? '')) : $name;

                if (! $baris || ! $nik || ! $nama) {
                    return redirect()->route('sso.gagal')
                        ->with('error', 'Akun SSO tidak terdaftar di data karyawan Gate. Hubungi admin untuk sinkronisasi.');
                }

                $user = User::create([
                    'employee_number' => $nik,
                    'name' => $nama,
                    'email' => $email,
                    'sso_id' => $ssoId,
                    'auth_provider' => 'sso',
                    'must_change_password' => false,
                    'is_active' => (bool) ($baris['is_active'] ?? true),
                ]);
                $user->assignRole('staff');
                $sinkron->enrichDariGate($user->fresh(), $baris);

                if (! $user->fresh()->branch_id) {
                    Log::warning('SSO user tanpa branch (mapping belum ada)', ['user_id' => $user->id, 'email' => $email]);
                }
            } else {
                if ($user->email && $user->email !== $email) {
                    return redirect()->route('sso.gagal')
                        ->with('error', 'Email SSO tidak cocok dengan data lokal. Hubungi admin untuk memperbarui data Anda.');
                }

                $user->update([
                    'sso_id' => $ssoId,
                    'email' => $user->email ?? $email,
                    'name' => $name ?: $user->name,
                    'auth_provider' => 'sso',
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ]);

                try {
                    if ($baris = $gate->cariKaryawanByEmail($email)) {
                        $sinkron->enrichDariGate($user->fresh(), $baris);
                    }
                } catch (\Throwable $e) {
                    report($e);
                }
            }

            $user = $user->fresh();

            if (! $user->is_active) {
                return redirect()->route('sso.gagal')
                    ->with('error', 'Akun Anda dinonaktifkan. Hubungi admin untuk mengaktifkan kembali.');
            }

            Auth::guard('web')->login($user);
            request()->session()->regenerate();

            if ($token = session()->pull('scan_redirect_token')) {
                return redirect()->route('scan.resolve', $token);
            }

            return redirect()->route('dashboard');
        } catch (\Throwable $e) {
            report($e);

            return redirect()->route('sso.gagal')
                ->with('error', 'Login SSO gagal. Silakan coba lagi atau hubungi admin jika berulang.');
        }
    }

    public function logout()
    {
        $user = Auth::guard('web')->user();
        if ($user && $user->sso_id) {
            try {
                // ponytail: full-page ke domain IdP via Inertia::location (XHR tak bisa lintas domain)
                $tujuan = Socialite::driver('perusahaan')
                    ->logoutRequest($user->sso_id)
                    ->getTargetUrl();

                return Inertia::location($tujuan);
            } catch (\Exception $e) {
                report($e);
            }
        }

        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        $sloUrl = env('SAML_IDP_SLO_URL', route('login'));

        return Inertia::location($sloUrl);
    }

    public function slo(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->has('SAMLRequest') || $request->has('SAMLResponse')) {
            try {
                return Socialite::driver('perusahaan')
                    ->stateless()
                    ->logoutResponse();
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return redirect()->route('login');
    }

    public function metadata()
    {
        return Socialite::driver('perusahaan')
            ->getServiceProviderMetadata();
    }
}
