<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;

class DepartmentResolver
{
    public const KEYS = [
        'tenancy' => 'Tenancy',
        'bs' => 'Building Service',
        'security' => 'Security',
        'marketing' => 'Marketing',
        'finance' => 'Keuangan',
        'engineering' => 'Engineering',
    ];

    public function id(string $key, ?int $branchId = null): ?int
    {
        $name = self::KEYS[$key] ?? null;

        if (! $name) {
            return null;
        }

        if ($branchId) {
            $companyGateId = Branch::whereKey($branchId)->value('gate_id');

            if ($companyGateId) {
                $id = Department::where('company_gate_id', $companyGateId)
                    ->where('name', $name)
                    ->value('id');

                if ($id) {
                    return $id;
                }
            }
        }

        $lokal = Department::whereNull('company_gate_id')->where('name', $name)->value('id');

        if ($lokal) {
            return $lokal;
        }

        $kandidat = Department::where('name', $name)->get(['id']);

        return $kandidat->count() === 1 ? $kandidat->first()->id : null;
    }
}
