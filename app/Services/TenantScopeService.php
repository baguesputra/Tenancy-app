<?php

namespace App\Services;

use App\Models\MasterScope;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class TenantScopeService
{
    private array $memo = [];

    public function ready(): bool
    {
        return Schema::hasTable('master_scopes');
    }

    public function scopesFor(User $user): Collection
    {
        if (! $this->ready()) {
            return collect();
        }

        return $this->memo[$user->id] ??= MasterScope::whereIn('role_id', $user->roles()->pluck('roles.id'))->get();
    }

    public function hasAnyScope(User $user): bool
    {
        return $this->scopesFor($user)->isNotEmpty();
    }

    private function allIds(): Collection
    {
        // ponytail: pluck tiap panggil, cache DB jika kategori ratusan
        return TenantCategory::pluck('id');
    }

    private function allowedIds(Collection $scopes, string $flag, string $ownFlag): array
    {
        $rows = $scopes->where($flag, true);
        $ownRows = $rows->where($ownFlag, true);
        $allRows = $rows->where($ownFlag, false);

        $includeOwn = $ownRows->where('mode', '!=', 'exclude');
        $includeAll = $allRows->where('mode', '!=', 'exclude');
        $excludeOwn = $ownRows->where('mode', 'exclude');
        $excludeAll = $allRows->where('mode', 'exclude');

        $expand = function (Collection $set) {
            if ($set->contains(fn ($s) => ! $s->tenant_category_id)) {
                return $this->allIds();
            }

            return $set->pluck('tenant_category_id')->filter()->unique()->values();
        };

        $baseOwn = $includeOwn->isEmpty() ? collect() : $expand($includeOwn)->diff($expand($excludeOwn));
        $baseAll = $includeAll->isNotEmpty() || $excludeAll->isNotEmpty()
            ? ($includeAll->isEmpty() ? $this->allIds() : $expand($includeAll))->diff($expand($excludeAll))
            : collect();

        return [$baseAll, $baseOwn];
    }

    public function applyView(Builder $query, User $user): Builder
    {
        if ($user->hasRole('super_admin')) {
            return $query;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return $query;
        }

        [$all, $own] = $this->allowedIds($scopes, 'can_view', 'view_own_only');

        if ($all->isEmpty() && $own->isEmpty()) {
            return $query->whereRaw('0 = 1');
        }

        return $query->where(fn ($q) => $q
            ->when($all->isNotEmpty(), fn ($w) => $w->orWhereIn('tenants.tenant_category_id', $all))
            ->when($own->isNotEmpty(), fn ($w) => $w->orWhere(
                fn ($o) => $o->whereIn('tenants.tenant_category_id', $own)->where('tenants.created_by', $user->id)
            )));
    }

    public function canCreate(User $user, int $categoryId): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return true;
        }

        [$all] = $this->allowedIds($scopes, 'can_create', 'view_own_only');

        return $all->contains($categoryId);
    }

    public function canEdit(User $user, Tenant $tenant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return true;
        }

        [$all, $own] = $this->allowedIds($scopes, 'can_edit', 'edit_own_only');
        $catId = (int) $tenant->tenant_category_id;

        if ($all->contains($catId)) {
            return true;
        }

        return $own->contains($catId) && (int) $tenant->created_by === (int) $user->id;
    }

    public function creatableCategoryIds(User $user): ?Collection
    {
        if ($user->hasRole('super_admin')) {
            return null;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return null;
        }

        return $this->allowedIds($scopes, 'can_create', 'view_own_only')[0];
    }

    public function editOwnOnlyCategoryIds(User $user): ?Collection
    {
        if ($user->hasRole('super_admin')) {
            return null;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return null;
        }

        return $this->allowedIds($scopes, 'can_edit', 'edit_own_only')[1];
    }
}
