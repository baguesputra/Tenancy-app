<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\Tenancy;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing data to allow fresh seeding
        Tenancy::query()->delete();
        Tenant::query()->delete();
        Unit::query()->delete();

        $this->call([
            RoleSeeder::class,
            BranchSeeder::class,
            UnitSeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
            TenantCategorySeeder::class,
            ProductCategorySeeder::class,
            TenantSeeder::class,
            UnitTenantSeeder::class,
            ChecklistSeeder::class,
        
        ]);
    }
}
