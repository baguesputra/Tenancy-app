<?php

namespace App\Services\Gate;

use App\Models\GateCompanyBranchMap;
use App\Models\GateDepartmentMap;
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

            $attrs = [
                'name' => $nama,
                'email' => $email ?: ($user?->email),
                'gate_id' => $gateId,
                'branch_id' => $this->resolveBranchId($baris) ?? $user?->branch_id,
                'department_id' => $this->resolveDepartmentId($baris) ?? $user?->department_id,
                'auth_provider' => $user?->auth_provider ?? 'sso',
                'is_active' => (bool) ($baris['is_active'] ?? true),
                'must_change_password' => false,
            ];

            if (! $user) {
                $user = User::create($attrs + ['employee_number' => $nik]);
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
        DB::transaction(function () use ($user, $baris) {
            $user->update([
                'gate_id' => $user->gate_id ?? ($baris['id'] ?? null),
                'employee_number' => $user->employee_number ?: (trim((string) ($baris['nik'] ?? '')) ?: null),
                'name' => trim((string) ($baris['name'] ?? '')) ?: $user->name,
                'branch_id' => $user->branch_id ?? $this->resolveBranchId($baris),
                'department_id' => $user->department_id ?? $this->resolveDepartmentId($baris),
                'is_active' => (bool) ($baris['is_active'] ?? $user->is_active ?? true),
            ]);
        });
    }

    private function resolveBranchId(array $baris): ?int
    {
        $companyId = $baris['company_id'] ?? (is_array($baris['position'] ?? null) ? ($baris['position']['company_id'] ?? null) : null);
        if (! $companyId) {
            return null;
        }

        return GateCompanyBranchMap::where('gate_company_id', $companyId)->value('branch_id');
    }

    private function resolveDepartmentId(array $baris): ?int
    {
        $deptId = $baris['department_id'] ?? (is_array($baris['position'] ?? null) ? ($baris['position']['department']['id'] ?? null) : null);
        if (! $deptId) {
            return null;
        }

        return GateDepartmentMap::where('gate_department_id', $deptId)->value('department_id');
    }
}
