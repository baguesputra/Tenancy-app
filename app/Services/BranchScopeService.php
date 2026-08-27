<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class BranchScopeService
{
    /**
     * Terapkan filter branch ke query, kecuali user manager/admin_pusat.
     */
    public function apply(Builder $query, User $user, string $branchColumn = 'branch_id'): Builder
    {
        if (! $user->canViewAllBranches()) {
            $query->where($branchColumn, $user->branch_id);
        }

        return $query;
    }
}