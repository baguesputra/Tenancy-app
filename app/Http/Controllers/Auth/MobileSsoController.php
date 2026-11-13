<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\SessionUserResource;
use App\Models\MobileSsoCode;
use App\Models\MobileSsoTransaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class MobileSsoController extends Controller
{
    public function exchange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:64', 'regex:/^[A-Za-z0-9_-]+$/'],
            'state' => ['required', 'string', 'min:43', 'max:128', 'regex:/^[A-Za-z0-9_-]+$/'],
            'code_verifier' => ['required', 'string', 'min:43', 'max:128', 'regex:/^[A-Za-z0-9._~-]+$/'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $result = DB::transaction(function () use ($data) {
            $record = MobileSsoCode::query()
                ->where('code_hash', hash('sha256', $data['code']))
                ->lockForUpdate()
                ->first();

            if (! $record || $record->used_at || $record->expires_at->isPast() || ! hash_equals($record->state, $data['state'])) {
                return null;
            }

            $challenge = rtrim(strtr(base64_encode(hash('sha256', $data['code_verifier'], true)), '+/', '-_'), '=');
            if (! hash_equals($record->code_challenge, $challenge)) {
                return null;
            }

            $record->update(['used_at' => now()]);
            $user = $record->user;
            if (! $user || ! $user->is_active) {
                return null;
            }

            return [
                'user' => new SessionUserResource($user),
                'token' => $user->createToken($data['device_name'] ?? 'Tenancy Mobile')->plainTextToken,
            ];
        });

        if (! $result) {
            return response()->json(['message' => 'Kode SSO tidak valid, kedaluwarsa, atau sudah digunakan.'], 422);
        }

        return response()->json($result)->header('Cache-Control', 'no-store');
    }

    public static function issue(Request $request, User $user): ?string
    {
        $relayState = $request->input('RelayState', $request->input('relay_state'));
        if (! is_string($relayState) || ! preg_match('/^[A-Za-z0-9_-]{43,64}$/', $relayState)) {
            return null;
        }

        MobileSsoCode::where('expires_at', '<', now())->delete();
        $code = DB::transaction(function () use ($relayState, $user) {
            $transaction = MobileSsoTransaction::query()
                ->where('relay_state', $relayState)
                ->lockForUpdate()
                ->first();

            if (! $transaction || $transaction->used_at || $transaction->expires_at->isPast()) {
                return null;
            }

            $code = Str::random(64);
            MobileSsoCode::create([
                'user_id' => $user->id,
                'code_hash' => hash('sha256', $code),
                'code_challenge' => $transaction->code_challenge,
                'state' => $transaction->state,
                'expires_at' => now()->addMinutes(2),
            ]);
            $transaction->update(['used_at' => now()]);

            return ['code' => $code, 'state' => $transaction->state];
        });

        if (! $code) {
            return null;
        }

        return 'tenancy://auth/sso/callback?'.http_build_query($code);
    }

    public function redirect(Request $request)
    {
        $data = $request->validate([
            'state' => ['required', 'string', 'min:43', 'max:128', 'regex:/^[A-Za-z0-9_-]+$/'],
            'code_challenge' => ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);

        MobileSsoTransaction::where('expires_at', '<', now())->delete();
        $relayState = Str::random(64);
        MobileSsoTransaction::create([
            'relay_state' => $relayState,
            'state' => $data['state'],
            'code_challenge' => $data['code_challenge'],
            'expires_at' => now()->addMinutes(10),
        ]);
        $request->session()->put('mobile_sso_relay_state', $relayState);

        $target = Socialite::driver('perusahaan')->redirect()->getTargetUrl();

        return redirect()->away($target);
    }
}
