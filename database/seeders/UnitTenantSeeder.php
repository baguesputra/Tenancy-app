<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitTenantSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'BJM')->first();

        $unitFnb = Unit::firstOrCreate(
            ['branch_id' => $branch->id, 'floor' => 'GF', 'block' => 'A', 'unit_number' => '01'],
            ['unit_code' => 'GF-A-01', 'size' => 45.5]
        );

        $unitFashion = Unit::firstOrCreate(
            ['branch_id' => $branch->id, 'floor' => '1', 'block' => 'B', 'unit_number' => '05'],
            ['unit_code' => '1-B-05', 'size' => 80]
        );

        $tenantCategoryTenant = TenantCategory::where('name', 'Tenant')->first();
        $tenantCategoryAnchor = TenantCategory::where('name', 'Anchor')->first();
        $productCategoryFnb = ProductCategory::where('name', 'F&B')->first();
        $productCategoryFashion = ProductCategory::where('name', 'Fashion')->first();

        $tenantFnb = Tenant::firstOrCreate(
            ['name' => 'Kedai Kopi Testing'],
            [
                'branch_id' => $branch->id,
                'tenant_category_id' => $tenantCategoryTenant->id,
                'product_category_id' => $productCategoryFnb->id,
            ]
        );

        $tenantFashion = Tenant::firstOrCreate(
            ['name' => 'Toko Baju Testing'],
            [
                'branch_id' => $branch->id,
                'tenant_category_id' => $tenantCategoryAnchor->id,
                'product_category_id' => $productCategoryFashion->id,
            ]
        );

        Tenancy::firstOrCreate(
            ['unit_id' => $unitFnb->id, 'tenant_id' => $tenantFnb->id],
            ['start_date' => now()->subMonths(6), 'status' => 'active']
        );

        Tenancy::firstOrCreate(
            ['unit_id' => $unitFashion->id, 'tenant_id' => $tenantFashion->id],
            ['start_date' => now()->subMonths(3), 'status' => 'active']
        );
    }
}