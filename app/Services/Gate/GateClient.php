<?php

namespace App\Services\Gate;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GateClient
{
    public function ambilKaryawan(array $filter = []): array
    {
        return $this->ambil('/api/users', $filter, 'karyawan');
    }

    public function cariKaryawanByEmail(string $email): ?array
    {
        try {
            $daftar = $this->ambilKaryawan(['email' => $email, 'limit' => 5]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }

        foreach ($daftar as $baris) {
            if (is_array($baris) && strcasecmp(trim((string) ($baris['email'] ?? '')), $email) === 0) {
                return $baris;
            }
        }

        return count($daftar) === 1 && is_array($daftar[0]) ? $daftar[0] : null;
    }

    private function ambil(string $path, array $query, string $jenis): array
    {
        $token = config('services.gate.token');
        $baseUrl = rtrim(config('services.gate.base_url'), '/');

        if (! $token) {
            throw new RuntimeException('Token GATE belum dikonfigurasi (GATE_TOKEN).');
        }

        $query = array_filter($query);

        try {
            $respon = $this->get($baseUrl, $token, $path, $query)->throw()->json();
        } catch (ConnectionException|RequestException $e) {
            Log::warning('GATE gagal', ['jenis' => $jenis, 'path' => $path, 'error' => $e->getMessage()]);
            throw new RuntimeException("Gagal mengambil data {$jenis} dari GATE: ".$e->getMessage(), 0, $e);
        }

        $data = $respon['data'] ?? [];

        if (isset($data['data']) && is_array($data['data'])) {
            return $data['data'];
        }

        return is_array($data) ? $data : [];
    }

    private function get(string $baseUrl, string $token, string $path, array $query)
    {
        return Http::baseUrl($baseUrl)
            ->withToken($token)
            ->timeout(config('services.gate.timeout'))
            ->acceptJson()
            ->get($path, $query);
    }
}
