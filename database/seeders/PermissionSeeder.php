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
            'tenants.view', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.edit', 'tenancies.delete',
            'categories.view', 'categories.manage',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'users.manage',
            'settings.access',
            'documents.manage',
            'gate.sync',
            // LOO workflow
            'loos.view', 'loos.create', 'loos.edit', 'loos.delete',
            'loos.legal_edit', 'loos.legal_submit',
            'loos.accounting_edit', 'loos.accounting_submit',
            'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit',
            'loos.measurement_edit', 'loos.termin_manage',
            'loos.engineering_edit',
            'loos.fitout_approve', 'loos.dashboard', 'loos.transition',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Cabut permission mati (tanpa route): tenants.create, tenancies.create.
        Permission::whereIn('name', ['tenants.create', 'tenancies.create'])->delete();

        $this->assignRolePermissions('admin', [
            'tenants.view', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.edit', 'tenancies.delete',
            'categories.view', 'categories.manage',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'users.manage',
            'settings.access',
            'documents.manage',
            'gate.sync',
            'loos.view', 'loos.create', 'loos.edit', 'loos.delete',
            'loos.legal_edit', 'loos.legal_submit',
            'loos.accounting_edit', 'loos.accounting_submit',
            'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit',
            'loos.measurement_edit', 'loos.termin_manage',
            'loos.engineering_edit',
            'loos.fitout_approve', 'loos.dashboard', 'loos.transition',
        ]);

        $this->assignRolePermissions('manager', [
            'tenants.view', 'tenants.edit', 'tenants.delete',
            'units.view', 'units.create', 'units.edit', 'units.delete',
            'tenancies.view', 'tenancies.edit', 'tenancies.delete',
            'categories.view',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'loos.view', 'loos.dashboard', 'loos.transition',
            'loos.fitout_approve',
        ]);

        $this->assignRolePermissions('tenancy_staff', [
            'tenants.view', 'tenants.edit',
            'units.view', 'units.create', 'units.edit',
            'tenancies.view', 'tenancies.edit',
            'categories.view',
            'sidak.view', 'sidak.create',
            'permits.view', 'permits.create', 'permits.approve',
            'documents.manage',
            'loos.view', 'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit', 'loos.transition',
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
            'loos.view', 'loos.engineering_edit', 'loos.transition',
        ]);

        // Marketing: gabungan marketing_staff (permits+tenants) + marketing_loo_input (loos).
        $this->assignRolePermissions('marketing', [
            'tenants.view', 'tenants.edit',
            'permits.view', 'permits.create', 'permits.approve',
            'loos.view', 'loos.create', 'loos.edit', 'loos.transition',
        ]);

        $this->assignRolePermissions('finance_staff', [
            'permits.view', 'permits.approve',
            'loos.view', 'loos.accounting_edit', 'loos.accounting_submit',
            'loos.measurement_edit', 'loos.termin_manage', 'loos.transition',
        ]);

        // Legal: gabungan legal_staff + legal_manager (dulu identik).
        $this->assignRolePermissions('legal', [
            'loos.view', 'loos.legal_edit', 'loos.legal_submit', 'loos.transition',
        ]);

        // Accounting: gabungan accounting_staff + accounting_manager.
        $this->assignRolePermissions('accounting', [
            'loos.view', 'loos.create', 'loos.accounting_edit', 'loos.accounting_submit',
            'loos.measurement_edit', 'loos.termin_manage', 'loos.transition',
        ]);

        // Tenant Management: gabungan tenant_mgmt_staff + tenant_mgmt_manager (dulu identik).
        $this->assignRolePermissions('tenant_mgmt', [
            'documents.manage',
            'loos.view', 'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit', 'loos.transition',
        ]);

        // GM: approval fitout + monitoring dashboard
        $this->assignRolePermissions('gm_approval', [
            'loos.view', 'loos.fitout_approve', 'loos.dashboard', 'loos.transition',
        ]);

        $this->assignRolePermissions('staff', []);

        // super_admin tidak perlu permission satu-satu — bypass total via Gate::before
        Role::firstOrCreate(['name' => 'super_admin']);

        // Reset cache permission Spatie agar perubahan langsung berlaku
        // (default cache 24 jam, tanpa ini permission baru tertunda).
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function assignRolePermissions(string $roleName, array $permissions): void
    {
        $role = Role::firstOrCreate(['name' => $roleName]);
        $role->syncPermissions($permissions);
    }
}
