<?php

namespace App\Services;

use App\Models\PermitRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

class PermitRequestVisibilityService
{
    private const ALL_CATEGORY_ROLES = ['manager', 'admin', 'super_admin'];

    private const PAMERAN_APPROVER_ROLES = ['finance_staff', 'bs_staff', 'security_staff'];

    public function isMarketingLocked(User $user): bool
    {
        return $user->hasRole('marketing') && ! $user->hasAnyRole(self::ALL_CATEGORY_ROLES);
    }

    public function canViewPameran(User $user): bool
    {
        return $user->hasAnyRole(self::ALL_CATEGORY_ROLES)
            || $user->hasRole('marketing')
            || $user->hasAnyRole(self::PAMERAN_APPROVER_ROLES);
    }

    public function canCreatePameran(User $user): bool
    {
        return $user->hasAnyRole(self::ALL_CATEGORY_ROLES) || $user->hasRole('marketing');
    }

    public function canView(User $user, PermitRequest $permit): bool
    {
        if (! $user->canViewAllBranches() && (int) $permit->branch_id !== (int) $user->branch_id) {
            return false;
        }

        if ($user->hasAnyRole(self::ALL_CATEGORY_ROLES)) {
            return true;
        }

        if ($this->isMarketingLocked($user)) {
            return $this->isPameran($permit);
        }

        if ($this->isPameran($permit)) {
            return $user->hasAnyRole(self::PAMERAN_APPROVER_ROLES);
        }

        return true;
    }

    public function applyView(Builder|Relation $query, User $user): Builder|Relation
    {
        if (! $user->canViewAllBranches()) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($user->hasAnyRole(self::ALL_CATEGORY_ROLES)) {
            return $query;
        }

        if ($this->isMarketingLocked($user)) {
            return $query->where('activity_types', 'like', '%pameran%');
        }

        if (! $this->canViewPameran($user)) {
            $query->where(fn ($q) => $q->whereNull('activity_types')->orWhere('activity_types', 'not like', '%pameran%'));
        }

        return $query;
    }

    public function hiddenCategories(User $user): array
    {
        return $this->canViewPameran($user) ? [] : ['pameran'];
    }

    public function cacheKey(User $user): string
    {
        if ($user->hasAnyRole(self::ALL_CATEGORY_ROLES)) {
            return 'all';
        }

        if ($this->isMarketingLocked($user)) {
            return 'marketing';
        }

        if ($this->canViewPameran($user)) {
            return 'pameran-approver';
        }

        return 'non-pameran';
    }

    private function isPameran(PermitRequest $permit): bool
    {
        return in_array('pameran', $permit->activity_types ?? [], true);
    }
}
