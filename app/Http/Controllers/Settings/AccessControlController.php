<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\MasterScope;
use App\Models\TenantCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AccessControlController extends Controller
{
    private const SELF_PROTECTED = ['settings.access', 'users.manage'];

    private const GROUP_LABELS = [
        'tenants' => 'Tenant',
        'units' => 'Unit',
        'tenancies' => 'Kontrak / Tenancy',
        'categories' => 'Kategori',
        'sidak' => 'Sidak',
        'permits' => 'Surat Izin',
        'users' => 'User',
        'settings' => 'Pengaturan',
        'other' => 'Lainnya',
    ];

    public function index()
    {
        $roles = Role::where('name', '!=', 'super_admin')
            ->orderBy('name')
            ->withCount('users')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => $role->users_count,
                'permissions' => $role->permissions->pluck('name'),
            ]);

        $permissions = Permission::orderBy('name')->pluck('name');

        return Inertia::render('Settings/AccessControl/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'groups' => $this->permissionGroups($permissions),
            'authRoles' => request()->user()?->getRoleNames() ?? [],
            'protectedPermissions' => self::SELF_PROTECTED,
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'masterScopes' => MasterScope::all()->groupBy('role_id'),
        ]);
    }

    public function update(Role $role, Request $request)
    {
        if ($role->name === 'super_admin') {
            abort(403, 'Role super_admin tidak bisa diubah.');
        }

        $validated = $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $permissions = $validated['permissions'] ?? [];

        $authRoles = $request->user()?->getRoleNames() ?? [];
        if ($authRoles->contains($role->name)) {
            $removed = collect(self::SELF_PROTECTED)
                ->filter(fn ($p) => $role->hasPermissionTo($p) && ! in_array($p, $permissions));
            if ($removed->isNotEmpty()) {
                return back()->withErrors([
                    'permissions' => 'Tidak bisa mencabut "'.$removed->join('", "').'" dari role Anda sendiri.',
                ]);
            }
        }

        $role->syncPermissions($permissions);

        return back()->with('success', "Hak akses role '{$role->name}' berhasil diperbarui.");
    }

    public function updateScopes(Role $role, Request $request)
    {
        if ($role->name === 'super_admin') {
            abort(403, 'Role super_admin tidak bisa diubah.');
        }

        $validated = $request->validate([
            'scopes' => 'array',
            'scopes.*.tenant_category_id' => 'nullable|exists:tenant_categories,id',
            'scopes.*.mode' => 'nullable|in:include,exclude',
            'scopes.*.can_view' => 'boolean',
            'scopes.*.view_own_only' => 'boolean',
            'scopes.*.can_create' => 'boolean',
            'scopes.*.can_edit' => 'boolean',
            'scopes.*.edit_own_only' => 'boolean',
        ]);

        MasterScope::where('role_id', $role->id)->delete();
        $seen = [];
        foreach ($validated['scopes'] ?? [] as $row) {
            if (! $row['can_view'] && ! $row['can_create'] && ! $row['can_edit']) {
                continue;
            }
            $mode = $row['mode'] ?? 'include';
            if ($mode === 'exclude' && empty($row['tenant_category_id'])) {
                continue;
            }
            $key = $mode.'|'.($row['tenant_category_id'] ?? 'all');
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            MasterScope::create([
                'role_id' => $role->id,
                'tenant_category_id' => $row['tenant_category_id'] ?? null,
                'mode' => $mode,
                'can_view' => (bool) ($row['can_view'] ?? false),
                'view_own_only' => (bool) ($row['view_own_only'] ?? false),
                'can_create' => (bool) ($row['can_create'] ?? false),
                'can_edit' => (bool) ($row['can_edit'] ?? false),
                'edit_own_only' => (bool) ($row['edit_own_only'] ?? false),
            ]);
        }

        return back()->with('success', "Batasan master role '{$role->name}' berhasil diperbarui.");
    }

    private function permissionGroups($permissions): array
    {
        $grouped = [];
        foreach ($permissions as $permission) {
            $key = str_contains($permission, '.') ? explode('.', $permission)[0] : 'other';
            $key = array_key_exists($key, self::GROUP_LABELS) ? $key : 'other';
            $grouped[$key][] = $permission;
        }

        return collect($grouped)
            ->map(fn ($items, $key) => [
                'key' => $key,
                'label' => self::GROUP_LABELS[$key],
                'permissions' => array_values($items),
            ])
            ->sortBy(fn ($g) => array_search($g['key'], array_keys(self::GROUP_LABELS)))
            ->values()
            ->all();
    }
}
