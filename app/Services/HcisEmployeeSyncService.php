<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HcisEmployeeSyncService
{
    /**
     * Proses satu event karyawan dari webhook HCIS.
     *
     * @return array{action: string, user: ?User} action: created|updated|deactivated|skipped
     */
    public function proses(array $payload): array
    {
        $data = $payload['data'];

        $user = $this->cari($data);

        $nonaktif = $payload['event'] === 'employee.deactivated'
            || (array_key_exists('is_active', $data) && ! (bool) $data['is_active']);

        if ($nonaktif) {
            if (! $user) {
                return ['action' => 'skipped', 'user' => null];
            }

            $this->nonaktifkan($user);

            return ['action' => 'deactivated', 'user' => $user->fresh()];
        }

        $attrs = [
            'gate_id' => $data['id'],
            'name' => $data['name'],
            'gate_synced_at' => now(),
            'gate_miss_count' => 0,
        ];

        if (! empty($data['nik'])) {
            $attrs['employee_number'] = $data['nik'];
        }

        $foto = $this->normalisasiFoto($data['photo'] ?? null);
        if ($foto) {
            $attrs['photo_url'] = $foto;
        }

        if (array_key_exists('is_active', $data)) {
            $attrs['is_active'] = (bool) $data['is_active'];
        }

        if ($user) {
            if (! empty($data['email']) && $user->email !== $data['email']
                && ! User::where('email', $data['email'])->whereKeyNot($user->getKey())->exists()) {
                $attrs['email'] = $data['email'];
            }
            $user->update($attrs);

            return ['action' => 'updated', 'user' => $user->fresh()];
        }

        $user = User::create($attrs + [
            'email' => $data['email'],
            'is_active' => true,
            'password' => bcrypt(Str::random(32)),
            'must_change_password' => false,
            'auth_provider' => 'sso',
        ]);
        $user->assignRole('staff');

        return ['action' => 'created', 'user' => $user];
    }

    /**
     * Pencarian berlapis: gate_id (UUID HCIS) -> email -> employee_number (NIK).
     */
    private function cari(array $data): ?User
    {
        $user = User::where('gate_id', $data['id'])->first();

        if (! $user && ! empty($data['email'])) {
            $user = User::where('email', $data['email'])->first();
        }

        if (! $user && ! empty($data['nik'])) {
            $user = User::where('employee_number', $data['nik'])->first();
        }

        return $user;
    }

    private function nonaktifkan(User $user): void
    {
        $user->forceFill(['is_active' => false, 'remember_token' => null])->save();

        // Cabut seluruh sesi login dan token API user seketika.
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->tokens()->delete();
    }

    private function normalisasiFoto(mixed $url): ?string
    {
        $url = trim((string) $url);
        if ($url === '' || strlen($url) > 500) {
            return null;
        }

        return preg_match('#^https?://#i', $url) ? $url : null;
    }
}
