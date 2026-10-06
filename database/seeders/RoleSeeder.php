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
            'marketing', 'finance_staff',
            // LOO workflow (Tenant Management System)
            'legal', 'accounting', 'tenant_mgmt', 'gm_approval',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}
