<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $branchA = Branch::where('code', 'BJM')->first();
        $branchB = Branch::where('code', 'SMD')->first();

        $tenancyDept = Department::where('name', 'Tenancy')->first();
        $bsDept = Department::where('name', 'Building Service')->first();
        $securityDept = Department::where('name', 'Security')->first();

        $staff = User::firstOrCreate(
            ['employee_number' => 'TOP-000001'],
            ['name' => 'Test Staff', 'branch_id' => $branchA->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $staff->syncRoles(['staff']);

        $manager = User::firstOrCreate(
            ['employee_number' => 'TOP-000002'],
            ['name' => 'Test Manager', 'branch_id' => $branchB->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $manager->syncRoles(['manager']);

        $tenancyStaff = User::firstOrCreate(
            ['employee_number' => 'TOP-000003'],
            ['name' => 'Staff Tenancy', 'branch_id' => $branchA->id, 'department_id' => $tenancyDept->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $tenancyStaff->syncRoles(['tenancy_staff']);

        $bsStaff = User::firstOrCreate(
            ['employee_number' => 'TOP-000004'],
            ['name' => 'Staff BS', 'branch_id' => $branchA->id, 'department_id' => $bsDept->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $bsStaff->syncRoles(['bs_staff']);

        $securityStaff = User::firstOrCreate(
            ['employee_number' => 'TOP-000005'],
            ['name' => 'Staff Security', 'branch_id' => $branchA->id, 'department_id' => $securityDept->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $securityStaff->syncRoles(['security_staff']);

        $superAdmin = User::firstOrCreate(
            ['employee_number' => 'TOP-000000'],
            ['name' => 'Super Admin IT', 'branch_id' => $branchA->id, 'password' => bcrypt('password'), 'must_change_password' => false]
        );
        $superAdmin->syncRoles(['super_admin']);
    }
}