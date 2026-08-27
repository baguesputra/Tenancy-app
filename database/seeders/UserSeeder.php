<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $branchA = Branch::where('code', 'BJM')->first();
        $branchB = Branch::where('code', 'SMD')->first();

        $staff = User::firstOrCreate(
            ['employee_number' => 'TOP-000001'],
            [
                'name' => 'Test Staff',
                'branch_id' => $branchA->id,
                'password' => bcrypt('password'),
                'must_change_password' => false,
            ]
        );
        $staff->assignRole('staff');

        $manager = User::firstOrCreate(
            ['employee_number' => 'TOP-000002'],
            [
                'name' => 'Test Manager',
                'branch_id' => $branchB->id, // sengaja beda cabang dari staff
                'password' => bcrypt('password'),
                'must_change_password' => false,
            ]
        );
        $manager->assignRole('manager');
    }
}