<?php

namespace App\Services\Gate;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\Position;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SinkronisasiMasterService
{
    public function __construct(private GateClient $gate) {}

    public function sinkron(int|string|null $companyId = null, bool $kering = false): array
    {
        $hasil = ['branch' => 0, 'departemen' => 0, 'divisi' => 0, 'jabatan' => 0, 'gagal' => []];

        try {
            $companies = $companyId
                ? array_filter([$this->satuPerusahaan($companyId)])
                : $this->gate->ambilPerusahaan();
        } catch (\Throwable $e) {
            report($e);
            $hasil['gagal'][] = $e->getMessage();

            return $hasil;
        }

        if ($kering) {
            $hasil['branch'] = count($companies);

            return $hasil;
        }

        foreach ($companies as $c) {
            if (empty($c['id'])) {
                continue;
            }
            try {
                $tree = $this->gate->ambilTreeCompany($c['id']);
                $counts = $this->simpanTree($c, $tree);
                foreach ($counts as $k => $v) {
                    $hasil[$k] += $v;
                }
            } catch (\Throwable $e) {
                report($e);
                $hasil['gagal'][] = ($c['name'] ?? $c['id']).': '.$e->getMessage();
            }
        }

        return $hasil;
    }

    private function satuPerusahaan(int|string $companyId): ?array
    {
        foreach ($this->gate->ambilPerusahaan() as $c) {
            if ((string) ($c['id'] ?? '') === (string) $companyId) {
                return $c;
            }
        }

        return null;
    }

    private function simpanTree(array $company, array $tree): array
    {
        return DB::transaction(function () use ($company, $tree) {
            $counts = ['branch' => 0, 'departemen' => 0, 'divisi' => 0, 'jabatan' => 0];

            $branch = Branch::where('gate_id', $company['id'])->first();
            if (! $branch && ! empty($company['code'])) {
                $branch = Branch::where('code', $company['code'])->first();
                $branch?->update(['gate_id' => $company['id']]);
            }
            if (! $branch && ! empty($company['code'])) {
                $branch = Branch::firstOrCreate(
                    ['gate_id' => $company['id']],
                    ['code' => $company['code'], 'name' => $company['name'] ?? $company['code']]
                );
            }
            if ($branch) {
                $ubah = [];
                if (! $branch->gate_id) {
                    $ubah['gate_id'] = $company['id'];
                }
                if (! empty($company['name']) && $branch->company_name !== $company['name']) {
                    $ubah['company_name'] = $company['name'];
                }
                if ($ubah) {
                    $branch->update($ubah);
                }
            }
            $counts['branch'] = ($branch && $branch->wasRecentlyCreated) ? 1 : 0;

            foreach ($tree['departments'] ?? [] as $dept) {
                if (empty($dept['id']) || empty($dept['name'])) {
                    continue;
                }
                $deptAttrs = ['name' => $dept['name'], 'company_gate_id' => $company['id']];
                if (array_key_exists('code', $dept)) {
                    $deptAttrs['code'] = $dept['code'];
                }
                $deptModel = Department::updateOrCreate(['gate_id' => $dept['id']], $deptAttrs);
                $counts['departemen'] += $deptModel->wasRecentlyCreated ? 1 : 0;

                foreach ($dept['divisions'] ?? [] as $div) {
                    $counts['divisi'] += $this->simpanDivisi($div, $deptModel->id, $company['id']) ? 1 : 0;
                }

                foreach ($dept['positions'] ?? [] as $jab) {
                    $counts['jabatan'] += $this->simpanJabatan($jab, $deptModel->id, null, $company['id']) ? 1 : 0;
                }
            }

            foreach ($tree['direct_divisions'] ?? [] as $div) {
                $counts['divisi'] += $this->simpanDivisi($div, null, $company['id']) ? 1 : 0;
            }

            $duplikat = Department::where('company_gate_id', $company['id'])
                ->selectRaw('name, count(*) as jml')
                ->groupBy('name')
                ->havingRaw('count(*) > 1')
                ->pluck('name');

            if ($duplikat->isNotEmpty()) {
                Log::warning('GATE master: nama departemen duplikat dalam satu company', [
                    'company' => $company['id'],
                    'names' => $duplikat->all(),
                ]);
            }

            return $counts;
        });
    }

    private function simpanDivisi(array $div, ?int $departmentId, ?string $companyGateId): bool
    {
        if (empty($div['id']) || empty($div['name'])) {
            return false;
        }

        $attrs = [
            'name' => $div['name'],
            'company_gate_id' => $companyGateId,
            'department_id' => ! empty($div['department_id'])
                ? Department::where('gate_id', $div['department_id'])->value('id') ?? $departmentId
                : $departmentId,
        ];
        if (array_key_exists('code', $div)) {
            $attrs['code'] = $div['code'];
        }

        $model = Division::updateOrCreate(['gate_id' => $div['id']], $attrs);
        $baru = $model->wasRecentlyCreated;

        foreach ($div['positions'] ?? [] as $jab) {
            $this->simpanJabatan($jab, $model->department_id, $model->id, $companyGateId);
        }

        return $baru;
    }

    private function simpanJabatan(array $jab, ?int $departmentId, ?int $divisionId, ?string $companyGateId): bool
    {
        if (empty($jab['id']) || empty($jab['name'])) {
            return false;
        }

        $deptId = ! empty($jab['department_id'])
            ? Department::where('gate_id', $jab['department_id'])->value('id') ?? $departmentId
            : $departmentId;
        $divId = ! empty($jab['division_id'])
            ? Division::where('gate_id', $jab['division_id'])->value('id') ?? $divisionId
            : $divisionId;

        $model = Position::updateOrCreate(
            ['gate_id' => $jab['id']],
            [
                'name' => $jab['name'],
                'level' => $jab['level'] ?? null,
                'company_gate_id' => $companyGateId,
                'department_id' => $deptId,
                'division_id' => $divId,
            ]
        );

        return $model->wasRecentlyCreated;
    }
}
