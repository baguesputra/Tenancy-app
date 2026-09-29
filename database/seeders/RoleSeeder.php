<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'staff', 'manager', 'admin', 'super_admin',
            'tenancy_staff', 'bs_staff', 'security_staff', 'engineering_staff',
            'marketing_staff', 'finance_staff',
            // LOO workflow (Tenant Management System)
            'marketing_loo_input', 'legal_staff', 'legal_manager',
            'accounting_staff', 'accounting_manager',
            'tenant_mgmt_staff', 'tenant_mgmt_manager', 'gm_approval',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}
