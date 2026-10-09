<?php

namespace App\Services\Gate;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GateClient
{
    public function ambilKaryawan(array $filter = [], ?float $timeout = null): array
    {
        return $this->ambil('/api/users', $filter, 'karyawan', $timeout);
    }

    public function ambilPerusahaan(): array
    {
        return $this->ambil('/api/companies', [], 'perusahaan');
    }

    public function ambilDepartemen(int|string|null $companyId = null): array
    {
        $query = $companyId ? ['company_id' => $companyId] : [];

        return $this->ambil('/api/departments', $query, 'departemen');
    }

    public function ambilDivisi(int|string|null $companyId = null): array
    {
        $query = $companyId ? ['company_id' => $companyId] : [];

        return $this->ambil('/api/divisions', $query, 'divisi');
    }

    public function ambilJabatan(int|string|null $companyId = null, array $filter = []): array
    {
        $query = array_merge($filter, $companyId ? ['company_id' => $companyId] : []);

        return $this->ambil('/api/positions', $query, 'jabatan');
    }

    public function ambilTreeCompany(int|string $companyId): array
    {
        try {
            $respon = $this->get(
                rtrim(config('services.gate.base_url'), '/'),
                config('services.gate.token'),
                "/api/companies/{$companyId}/tree",
                []
            )->throw()->json();
        } catch (ConnectionException|RequestException $e) {
            Log::warning('GATE gagal', ['jenis' => 'tree', 'path' => "/api/companies/{$companyId}/tree", 'error' => $e->getMessage()]);
            throw new RuntimeException('Gagal mengambil tree perusahaan dari GATE: '.$e->getMessage(), 0, $e);
        }

        $data = $respon['data'] ?? [];

        return is_array($data) ? $data : [];
    }

    public function cariKaryawanByEmail(string $email, ?float $timeout = null): ?array
    {
        try {
            $daftar = $this->ambilKaryawan(['email' => $email, 'limit' => 5], $timeout);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }

        foreach ($daftar as $baris) {
            if (is_array($baris) && strcasecmp(trim((string) ($baris['email'] ?? '')), $email) === 0) {
                return $baris;
            }
        }

        return null;
    }

    private function ambil(string $path, array $query, string $jenis, ?float $timeout = null): array
    {
        $token = config('services.gate.token');
        $baseUrl = rtrim(config('services.gate.base_url'), '/');

        if (! $token) {
            Log::warning('GATE gagal', ['jenis' => $jenis, 'path' => $path, 'error' => 'GATE_TOKEN kosong']);
            throw new RuntimeException('Token GATE belum dikonfigurasi (GATE_TOKEN).');
        }

        $query = array_filter($query, fn ($v) => $v !== null && $v !== '');

        try {
            $halaman = 1;
            $kumpul = [];
            $lanjut = true;

            while ($lanjut && $halaman <= 200) {
                $respon = $this->get($baseUrl, $token, $path, $halaman > 1 ? $query + ['page' => $halaman] : $query, $timeout)->throw()->json();

                if (! is_array($respon)) {
                    Log::warning('GATE gagal', ['jenis' => $jenis, 'path' => $path, 'error' => 'respons bukan JSON valid']);
                    throw new RuntimeException("Respons {$jenis} GATE bukan JSON valid.");
                }
                if (($respon['success'] ?? true) === false) {
                    Log::warning('GATE gagal', ['jenis' => $jenis, 'path' => $path, 'error' => $respon['message'] ?? 'success=false']);
                    throw new RuntimeException('GATE melaporkan gagal: '.($respon['message'] ?? '-'));
                }

                [$baris, $lanjut] = $this->pecahHalaman($respon, $halaman);
                foreach ($baris as $b) {
                    $kumpul[] = $b;
                }
                $halaman++;
            }

            return $kumpul;
        } catch (ConnectionException|RequestException $e) {
            Log::warning('GATE gagal', ['jenis' => $jenis, 'path' => $path, 'error' => $e->getMessage()]);
            throw new RuntimeException("Gagal mengambil data {$jenis} dari GATE: ".$e->getMessage(), 0, $e);
        }
    }

    /**
     * @return array{0: array, 1: bool} baris + flag lanjut halaman berikutnya
     */
    private function pecahHalaman(array $respon, int $halaman): array
    {
        $payload = $respon['data'] ?? null;

        if (is_array($payload) && isset($payload['data']) && is_array($payload['data'])) {
            $baris = $payload['data'];
            $meta = $payload;
        } elseif (is_array($payload)) {
            $baris = $payload;
            $meta = $respon['meta'] ?? [];
        } else {
            return [[], false];
        }

        if (isset($meta['last_page'])) {
            return [$baris, $halaman < (int) $meta['last_page']];
        }

        if (! empty($meta['next_page_url'])) {
            return [$baris, true];
        }

        return [$baris, false];
    }

    private function get(string $baseUrl, string $token, string $path, array $query, ?float $timeout = null)
    {
        return Http::baseUrl($baseUrl)
            ->withToken($token)
            ->timeout($timeout ?? config('services.gate.timeout'))
            ->acceptJson()
            ->get($path, $query);
    }
}
