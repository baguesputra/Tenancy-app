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

    public function applyView(Builder $query, User $user): Builder
    {
        if ($user->hasRole('super_admin')) {
            return $query;
        }

        $scopes = $this->scopesFor($user);
        if ($scopes->isEmpty()) {
            return $query;
        }

        $view = $scopes->where('can_view', true);
        $all = $this->expand($view->where('view_own_only', false));
        $own = $this->expand($view->where('view_own_only', true));

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

        return $scopes->where('can_create', true)
            ->contains(fn ($s) => ! $s->tenant_category_id || (int) $s->tenant_category_id === $categoryId);
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

        return $scopes->where('can_edit', true)->contains(
            fn ($s) => (! $s->tenant_category_id || (int) $s->tenant_category_id === (int) $tenant->tenant_category_id)
                && (! $s->edit_own_only || (int) $tenant->created_by === (int) $user->id)
        );
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

        return $this->expand($scopes->where('can_create', true));
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

        return $this->expand($scopes->where('can_edit', true)->where('edit_own_only', true));
    }

    private function expand(Collection $rows): Collection
    {
        if ($rows->contains(fn ($s) => ! $s->tenant_category_id)) {
            return TenantCategory::pluck('id');
        }

        return $rows->pluck('tenant_category_id')->filter()->unique()->values();
    }
}
