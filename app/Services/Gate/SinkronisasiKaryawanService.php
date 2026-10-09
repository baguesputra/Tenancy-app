<?php

namespace App\Services\Gate;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\Position;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SinkronisasiKaryawanService
{
    public function __construct(private GateClient $gate) {}

    public function sinkron(array $filter = [], bool $kering = false, ?int $batas = null, int $grace = 2): array
    {
        try {
            return Cache::lock('gate-sync', 300)->block(
                10,
                fn () => $this->sinkronTerbatas($filter, $kering, $batas, $grace)
            );
        } catch (LockTimeoutException) {
            throw new RuntimeException('Sinkronisasi Gate sedang berjalan di proses lain. Coba lagi sebentar lagi.');
        }
    }

    private function sinkronTerbatas(array $filter, bool $kering, ?int $batas, int $grace): array
    {
        $daftar = $this->gate->ambilKaryawan($filter);
        if ($batas) {
            $daftar = array_slice($daftar, 0, $batas);
        }

        $hasil = ['baru' => [], 'diperbarui' => [], 'gagal' => [], 'dilewati' => 0, 'nonaktif' => 0];

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

        // tandaiHilang hanya pada sinkron full-scope (tanpa filter/limit) dengan
        // daftar non-kosong — subset/daftar kosong tidak boleh disimpulkan sebagai "hilang".
        $filterAktif = array_filter($filter, fn ($v) => $v !== null && $v !== '' && $v !== false);
        $skalaPenuh = $filterAktif === [] && ! $batas;

        if (! $kering && $skalaPenuh && $daftar !== []) {
            $hasil['nonaktif'] = $this->tandaiHilang($daftar, $grace);
        }

        return $hasil;
    }

    private function tandaiHilang(array $daftar, int $grace): int
    {
        $adaGateId = collect($daftar)->map(fn ($b) => $b['id'] ?? null)->filter()->all();
        if (! $adaGateId) {
            return 0;
        }
        $adaNik = collect($daftar)->map(fn ($b) => trim((string) ($b['nik'] ?? '')))->filter()->all();

        $query = User::whereNotNull('gate_id')->whereNotIn('gate_id', $adaGateId);
        if ($adaNik) {
            $query->whereNotIn('employee_number', $adaNik);
        }

        // Jaring pengaman: maksimal 20% user nonaktif per run agar kegagalan
        // Gate yang mengembalikan data separuh tidak langsung mematikan massal.
        $totalGate = User::whereNotNull('gate_id')->count();
        $maxNonaktif = max(1, (int) ceil($totalGate * 0.2));

        $count = 0;
        $melebihiBatas = false;
        $query->chunkById(200, function ($users) use ($grace, $maxNonaktif, &$count, &$melebihiBatas) {
            foreach ($users as $user) {
                $user->increment('gate_miss_count');
                $nonaktif = ((int) $user->gate_miss_count) >= $grace;

                if ($nonaktif && $count >= $maxNonaktif) {
                    $melebihiBatas = true;

                    continue;
                }

                $user->update([
                    'gate_synced_at' => now(),
                    'is_active' => $nonaktif ? false : $user->is_active,
                ]);
                if ($nonaktif) {
                    $count++;
                }
            }
        });

        if ($melebihiBatas) {
            Log::warning('GATE tandaiHilang melebihi batas aman per run, deaktivasi ditahan', [
                'dideaktifkan' => $count,
                'batas' => $maxNonaktif,
            ]);
        }

        return $count;
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

            $user = User::where('gate_id', $gateId)->first()
                ?? User::where('employee_number', $nik)->first();

            if ($email && $user?->email !== $email) {
                $pemilikEmail = User::where('email', $email)
                    ->when($user, fn ($q) => $q->whereKeyNot($user->getKey()))
                    ->first();

                if ($pemilikEmail && ! $pemilikEmail->gate_id) {
                    $pemilikEmail->update(['email' => null]);
                } elseif ($pemilikEmail) {
                    throw new RuntimeException("Email {$email} sudah dipakai akun lain.");
                }
            }

            $org = $this->resolveOrg($baris);
            $fotoUrl = $this->normalisasiFoto($baris['photo_url'] ?? $baris['photo'] ?? null);

            $aktif = array_key_exists('is_active', $baris) ? (bool) $baris['is_active'] : null;

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
                'gate_synced_at' => now(),
                'gate_miss_count' => 0,
            ];
            if ($aktif !== null) {
                $attrs['is_active'] = $aktif;
            }

            if (! $user) {
                $user = User::create($attrs + [
                    'employee_number' => $nik,
                    'is_active' => $aktif ?? true,
                    'must_change_password' => false,
                ]);
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

        // ponytail: rantai company via position->dept/div (baris /api/users tanpa company_id) — master wajib sync dulu
        $companyId = $baris['company_id'] ?? $pos['company_id'] ?? null
            ?? $position?->company_gate_id ?? $department?->company_gate_id ?? $division?->company_gate_id;

        return [
            'branch_id' => $companyId ? Branch::where('gate_id', $companyId)->value('id') : null,
            'department_id' => $department?->id ?? $position?->department_id,
            'division_id' => $division?->id ?? $position?->division_id,
            'position_id' => $position?->id,
        ];
    }
}
