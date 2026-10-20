<?php

namespace App\Services;

use App\Models\Approval;
use App\Models\Department;
use App\Models\Division;
use App\Models\InspectionSessionParticipant;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MasterDedupService
{
    public function audit(): array
    {
        return Department::whereNull('gate_id')
            ->orderBy('id')
            ->get()
            ->map(function (Department $dept) {
                $kandidat = Department::whereNotNull('gate_id')
                    ->where('name', $dept->name)
                    ->get(['id', 'name', 'company_gate_id']);

                return [
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'referensi' => $this->referensi($dept->id),
                    'kandidat' => $kandidat->count() === 1 ? [
                        'id' => $kandidat->first()->id,
                        'name' => $kandidat->first()->name,
                        'company_gate_id' => $kandidat->first()->company_gate_id,
                    ] : null,
                    'ambigu' => $kandidat->count() > 1
                        ? $kandidat->map(fn (Department $d) => ['id' => $d->id, 'name' => $d->name])->all()
                        : [],
                ];
            })
            ->all();
    }

    public function referensi(int $departmentId): array
    {
        return [
            'users' => User::where('department_id', $departmentId)->count(),
            'approvals' => Approval::where('department_id', $departmentId)->count(),
            'permit_request_departments' => DB::table('permit_request_departments')->where('department_id', $departmentId)->count(),
            'inspection_session_participants' => InspectionSessionParticipant::where('department_id', $departmentId)->count(),
            'positions' => Position::where('department_id', $departmentId)->count(),
            'divisions' => Division::where('department_id', $departmentId)->count(),
        ];
    }

    public function rencana(): array
    {
        $mapping = [];
        $tetap = [];

        foreach ($this->audit() as $baris) {
            if ($baris['kandidat']) {
                $mapping[] = [
                    'sumber_id' => $baris['id'],
                    'sumber_nama' => $baris['name'],
                    'target_id' => $baris['kandidat']['id'],
                    'target_nama' => $baris['kandidat']['name'],
                    'referensi' => $baris['referensi'],
                ];
            } else {
                $tetap[] = [
                    'id' => $baris['id'],
                    'nama' => $baris['name'],
                    'alasan' => $baris['ambigu'] ? 'ambigu (lebih dari satu kandidat)' : 'tidak ada padanan Gate',
                ];
            }
        }

        return ['mapping' => $mapping, 'tetap' => $tetap];
    }

    public function merge(): array
    {
        $rencana = $this->rencana();
        $statistik = [];

        DB::transaction(function () use ($rencana, &$statistik) {
            foreach ($rencana['mapping'] as $baris) {
                $statistik[] = [
                    'sumber_id' => $baris['sumber_id'],
                    'sumber_nama' => $baris['sumber_nama'],
                    'target_id' => $baris['target_id'],
                    'target_nama' => $baris['target_nama'],
                    'dipindah' => $this->pindahkan($baris['sumber_id'], $baris['target_id']),
                ];

                $sisa = $this->referensi($baris['sumber_id']);

                if (array_sum($sisa) > 0) {
                    throw new RuntimeException("Department {$baris['sumber_id']} masih punya referensi setelah remap: ".json_encode($sisa));
                }

                Department::whereKey($baris['sumber_id'])->delete();
                Cache::forget("dept.id.{$baris['sumber_nama']}");
            }
        });

        return ['mapping' => $rencana['mapping'], 'tetap' => $rencana['tetap'], 'statistik' => $statistik];
    }

    private function pindahkan(int $sumberId, int $targetId): array
    {
        return [
            'users' => User::where('department_id', $sumberId)->update(['department_id' => $targetId]),
            'approvals' => Approval::where('department_id', $sumberId)->update(['department_id' => $targetId]),
            'permit_request_departments' => DB::table('permit_request_departments')->where('department_id', $sumberId)->update(['department_id' => $targetId]),
            'inspection_session_participants' => InspectionSessionParticipant::where('department_id', $sumberId)->update(['department_id' => $targetId]),
            'positions' => Position::where('department_id', $sumberId)->update(['department_id' => $targetId]),
            'divisions' => Division::where('department_id', $sumberId)->update(['department_id' => $targetId]),
        ];
    }
}
