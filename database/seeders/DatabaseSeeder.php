<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            BranchSeeder::class,
            UnitSeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
            TenantCategorySeeder::class,
            ProductCategorySeeder::class,
            ChecklistSeeder::class,
            UnitTenantSeeder::class,
        ]);
    }
}
