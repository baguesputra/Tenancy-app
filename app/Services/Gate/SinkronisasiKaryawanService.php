<?php

namespace App\Services\Gate;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SinkronisasiKaryawanService
{
    public function __construct(private GateClient $gate) {}

    public function sinkron(array $filter = [], bool $kering = false, ?int $batas = null): array
    {
        $daftar = $this->gate->ambilKaryawan($filter);
        if ($batas) {
            $daftar = array_slice($daftar, 0, $batas);
        }

        $hasil = ['baru' => [], 'diperbarui' => [], 'gagal' => [], 'dilewati' => 0];

        foreach ($daftar as $baris) {
            $nik = trim((string) ($baris['nik'] ?? ''));
            $nama = trim((string) ($baris['name'] ?? ''));
            $gateId = $baris['id'] ?? null;

            if (! $nik || ! $nama || ! $gateId) {
                $hasil['dilewati']++;

                continue;
            }

            if ($kering) {
                $ada = User::where('gate_id', $gateId)->orWhere('employee_number', $nik)->exists();
                $hasil[$ada ? 'diperbarui' : 'baru'][] = "{$nama} ({$nik})";

                continue;
            }

            try {
                $hasil[$this->sinkronSatu($baris)][] = "{$nama} ({$nik})";
            } catch (\Throwable $e) {
                report($e);
                $hasil['gagal'][] = "{$nama} ({$nik}): {$e->getMessage()}";
            }
        }

        return $hasil;
    }

    public function sinkronSatu(array $baris): string
    {
        return DB::transaction(function () use ($baris) {
            $nik = trim((string) ($baris['nik'] ?? ''));
            $nama = trim((string) ($baris['name'] ?? ''));
            $email = trim((string) ($baris['email'] ?? ''));
            $gateId = $baris['id'] ?? null;

            if (! $nik || ! $nama || ! $gateId) {
                throw new RuntimeException('Data Gate tidak lengkap (nik/nama/id).');
            }

            if ($email) {
                $pemilikEmail = User::where('email', $email)->first();
                if ($pemilikEmail && $pemilikEmail->employee_number !== $nik && ! $pemilikEmail->gate_id) {
                    $pemilikEmail->update(['email' => null]);
                } elseif ($pemilikEmail && $pemilikEmail->employee_number !== $nik && $pemilikEmail->gate_id) {
                    throw new RuntimeException("Email {$email} sudah dipakai akun lain.");
                }
            }

            $user = User::where('gate_id', $gateId)->first()
                ?? User::where('employee_number', $nik)->first();

            $org = $this->resolveOrg($baris);
            $fotoUrl = $this->normalisasiFoto($baris['photo_url'] ?? $baris['photo'] ?? null);

            $attrs = [
                'name' => $nama,
                'email' => $email ?: ($user?->email),
                'photo_url' => $fotoUrl ?? $user?->photo_url,
                'gate_id' => $gateId,
                'branch_id' => $org['branch_id'] ?? $user?->branch_id,
                'department_id' => $org['department_id'] ?? $user?->department_id,
                'division_id' => $org['division_id'] ?? $user?->division_id,
                'position_id' => $org['position_id'] ?? $user?->position_id,
                'auth_provider' => $user?->auth_provider ?? 'sso',
                'is_active' => (bool) ($baris['is_active'] ?? true),
                'must_change_password' => false,
            ];

            if (! $user) {
                $user = User::create($attrs + ['employee_number' => $nik]);
                // ponytail: role selalu staff — jabatan Gate tidak dipetakan ke role
                $user->assignRole('staff');

                return 'baru';
            }

            if (! $user->employee_number) {
                $attrs['employee_number'] = $nik;
            }
            $user->update($attrs);

            return 'diperbarui';
        });
    }

    public function enrichDariGate(User $user, array $baris): void
    {
        $org = $this->resolveOrg($baris);
        $fotoUrl = $this->normalisasiFoto($baris['photo_url'] ?? $baris['photo'] ?? null);

        DB::transaction(function () use ($user, $baris, $org, $fotoUrl) {
            $user->update([
                'gate_id' => $user->gate_id ?? ($baris['id'] ?? null),
                'employee_number' => $user->employee_number ?: (trim((string) ($baris['nik'] ?? '')) ?: null),
                'name' => trim((string) ($baris['name'] ?? '')) ?: $user->name,
                'photo_url' => $fotoUrl ?? $user->photo_url,
                'branch_id' => $user->branch_id ?? $org['branch_id'] ?? null,
                'department_id' => $user->department_id ?? $org['department_id'] ?? null,
                'division_id' => $user->division_id ?? $org['division_id'] ?? null,
                'position_id' => $user->position_id ?? $org['position_id'] ?? null,
                'is_active' => (bool) ($baris['is_active'] ?? $user->is_active ?? true),
            ]);
        });
    }

    private function normalisasiFoto(mixed $url): ?string
    {
        $url = trim((string) $url);
        if ($url === '' || strlen($url) > 500) {
            return null;
        }

        return preg_match('#^https?://#i', $url) ? $url : null;
    }

    private function resolveOrg(array $baris): array
    {
        $pos = is_array($baris['position'] ?? null) ? $baris['position'] : null;

        $jabGateId = $baris['position_id'] ?? $pos['id'] ?? null;
        $position = $jabGateId ? Position::where('gate_id', $jabGateId)->first() : null;

        $deptGateId = $baris['department_id'] ?? $pos['department']['id'] ?? $pos['department_id'] ?? null;
        $department = $deptGateId ? Department::where('gate_id', $deptGateId)->first() : null;

        $divGateId = $pos['division']['id'] ?? $pos['division_id'] ?? $baris['division_id'] ?? null;
        $division = $divGateId ? Division::where('gate_id', $divGateId)->first() : null;

        // ponytail: full gate_id, tanpa tabel mapping — master wajib sync dulu
        $companyId = $baris['company_id'] ?? $pos['company_id'] ?? null;

        return [
            'branch_id' => $companyId ? Branch::where('gate_id', $companyId)->value('id') : null,
            'department_id' => $department?->id ?? $position?->department_id,
            'division_id' => $division?->id ?? $position?->division_id,
            'position_id' => $position?->id,
        ];
    }
}
