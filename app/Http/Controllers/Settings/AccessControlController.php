<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
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
                    'permissions' => 'Tidak bisa mencabut "' . $removed->join('", "') . '" dari role Anda sendiri.',
                ]);
            }
        }

        $role->syncPermissions($permissions);

        return back()->with('success', "Hak akses role '{$role->name}' berhasil diperbarui.");
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