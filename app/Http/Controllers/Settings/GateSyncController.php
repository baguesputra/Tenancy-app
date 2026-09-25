<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\GateSyncLog;
use App\Models\Position;
use App\Models\User;
use App\Services\Gate\GateClient;
use App\Services\Gate\SinkronisasiKaryawanService;
use App\Services\Gate\SinkronisasiMasterService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GateSyncController extends Controller
{
    public function index(Request $request, GateClient $gate)
    {
        $adaToken = (bool) config('services.gate.token');
        $terhubung = false;
        $companies = [];

        if ($adaToken) {
            try {
                $companies = $gate->ambilPerusahaan();
                $terhubung = true;
            } catch (\Throwable) {
                $terhubung = false;
            }
        }

        $branches = Branch::orderBy('name')->get(['id', 'name', 'code', 'gate_id']);

        return Inertia::render('Settings/Gate/Index', [
            'gateStatus' => ['adaToken' => $adaToken, 'terhubung' => $terhubung],
            'summary' => [
                'branches' => $branches->count(),
                'departments' => Department::count(),
                'divisions' => Division::count(),
                'positions' => Position::count(),
                'users' => User::count(),
                'usersGate' => User::whereNotNull('gate_id')->count(),
            ],
            'companies' => collect($companies)->map(fn ($c) => [
                'id' => $c['id'] ?? null, 'name' => $c['name'] ?? '—', 'code' => $c['code'] ?? null,
                'branch' => $branches->firstWhere('gate_id', $c['id'] ?? null)?->name,
            ])->values(),
            'branches' => $branches,
            'filters' => $request->only(['company_id']),
            'history' => GateSyncLog::with('user:id,name')->latest()->take(10)->get([
                'id', 'kind', 'is_dry_run', 'count_baru', 'count_diperbarui', 'count_gagal',
                'count_dilewati', 'count_departemen', 'count_divisi', 'count_jabatan', 'user_id', 'created_at',
            ]),
        ]);
    }

    public function syncMaster(Request $request, SinkronisasiMasterService $sinkron)
    {
        $validated = $request->validate([
            'company_id' => 'nullable|string|max:50',
            'dry_run' => 'nullable|boolean',
        ]);

        try {
            $hasil = $sinkron->sinkron($validated['company_id'] ?? null, (bool) ($validated['dry_run'] ?? false));
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['gate' => 'Sinkron master gagal: '.$e->getMessage()]);
        }

        if (! ($validated['dry_run'] ?? false)) {
            GateSyncLog::create([
                'kind' => 'master', 'is_dry_run' => false, 'user_id' => $request->user()?->id,
                'count_departemen' => $hasil['departemen'], 'count_divisi' => $hasil['divisi'],
                'count_jabatan' => $hasil['jabatan'], 'count_gagal' => count($hasil['gagal']),
            ]);
        }

        $prefix = ($validated['dry_run'] ?? false) ? 'Pratinjau: ' : '';

        return back()->with('success', $prefix.'Master selesai: '.$hasil['departemen'].' departemen, '.$hasil['divisi'].' divisi, '.$hasil['jabatan'].' jabatan.'
            .($hasil['gagal'] ? ' Gagal: '.implode(' ', array_slice($hasil['gagal'], 0, 3)) : ''));
    }

    public function syncKaryawan(Request $request, SinkronisasiKaryawanService $sinkron)
    {
        $validated = $request->validate([
            'company_id' => 'nullable|string|max:50',
            'department_id' => 'nullable|string|max:50',
            'limit' => 'nullable|integer|min:1|max:1000',
            'dry_run' => 'nullable|boolean',
        ]);

        try {
            $hasil = $sinkron->sinkron(
                ['company_id' => $validated['company_id'] ?? null, 'department_id' => $validated['department_id'] ?? null],
                (bool) ($validated['dry_run'] ?? false),
                $validated['limit'] ?? null
            );
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['gate' => 'Sinkron gagal: '.$e->getMessage()]);
        }

        if (! ($validated['dry_run'] ?? false)) {
            GateSyncLog::create([
                'kind' => 'karyawan', 'is_dry_run' => false, 'user_id' => $request->user()?->id,
                'count_baru' => count($hasil['baru']), 'count_diperbarui' => count($hasil['diperbarui']),
                'count_gagal' => count($hasil['gagal']), 'count_dilewati' => $hasil['dilewati'],
            ]);
        }

        $prefix = ($validated['dry_run'] ?? false) ? 'Pratinjau: ' : '';

        return back()->with('success', $prefix.'Sinkron selesai: '.count($hasil['baru']).' baru, '.count($hasil['diperbarui']).' diperbarui, '.count($hasil['gagal']).' gagal, '.$hasil['dilewati'].' dilewati.'
            .($hasil['gagal'] ? ' '.implode(' ', array_slice($hasil['gagal'], 0, 3)) : ''));
    }

    public function syncSemua(Request $request, SinkronisasiMasterService $master, SinkronisasiKaryawanService $karyawan)
    {
        $validated = $request->validate([
            'company_id' => 'nullable|string|max:50',
            'limit' => 'nullable|integer|min:1|max:1000',
            'dry_run' => 'nullable|boolean',
        ]);
        $dry = (bool) ($validated['dry_run'] ?? false);

        try {
            $m = $master->sinkron($validated['company_id'] ?? null, $dry);
            $k = $karyawan->sinkron(
                ['company_id' => $validated['company_id'] ?? null],
                $dry,
                $validated['limit'] ?? null
            );
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['gate' => 'Sinkron gagal: '.$e->getMessage()]);
        }

        if (! $dry) {
            GateSyncLog::create([
                'kind' => 'semua', 'is_dry_run' => false, 'user_id' => $request->user()?->id,
                'count_baru' => count($k['baru']), 'count_diperbarui' => count($k['diperbarui']),
                'count_gagal' => count($k['gagal']), 'count_dilewati' => $k['dilewati'],
                'count_departemen' => $m['departemen'], 'count_divisi' => $m['divisi'], 'count_jabatan' => $m['jabatan'],
            ]);
        }

        $prefix = $dry ? 'Pratinjau: ' : '';

        return back()->with('success', $prefix.'Selesai: '.$m['departemen'].' dept, '.$m['divisi'].' divisi, '.$m['jabatan'].' jabatan; '.count($k['baru']).' user baru, '.count($k['diperbarui']).' diperbarui, '.count($k['gagal']).' gagal.');
    }
}
