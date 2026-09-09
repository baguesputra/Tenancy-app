<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.create', 'tenancies.edit', 'tenancies.delete',
            'categories.view', 'categories.manage',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'users.manage',
            'settings.access',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $this->assignRolePermissions('admin', [
            'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.create', 'tenancies.edit', 'tenancies.delete',
            'categories.view', 'categories.manage',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'users.manage',
        ]);

        $this->assignRolePermissions('manager', [
            'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.create', 'tenancies.edit', 'tenancies.delete',
            'categories.view',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
        ]);

        $this->assignRolePermissions('tenancy_staff', [
            'tenants.view', 'tenants.create', 'tenants.edit',
            'units.view', 'units.create', 'units.edit',
            'tenancies.view', 'tenancies.create', 'tenancies.edit',
            'categories.view',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.approve',
        ]);

        $this->assignRolePermissions('bs_staff', [
            'permits.view', 'permits.approve',
        ]);

        $this->assignRolePermissions('security_staff', [
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.approve',
        ]);

        $this->assignRolePermissions('engineering_staff', [
            'permits.view',
        ]);

        $this->assignRolePermissions('staff', []);

        // super_admin tidak perlu permission satu-satu — bypass total via Gate::before
        Role::firstOrCreate(['name' => 'super_admin']);
    }

    private function assignRolePermissions(string $roleName, array $permissions): void
    {
        $role = Role::firstOrCreate(['name' => $roleName]);
        $role->syncPermissions($permissions);
    }
}