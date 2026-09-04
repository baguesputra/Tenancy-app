<?php

namespace Database\Seeders;

use App\Models\TenantCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TenantCategorySeeder extends Seeder
{
    public function run(): void
    {
        // Disable foreign key checks to allow truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('tenant_categories')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $categories = [
            ['name' => 'Anchor', 'description' => 'Tenant besar dengan luas unit signifikan, menjadi daya tarik utama pengunjung mall (misal: bioskop, department store).'],
            ['name' => 'Mini Anchor', 'description' => 'Tenant menengah, lebih kecil dari anchor tapi tetap jadi daya tarik area tertentu (misal: supermarket, toko elektronik besar).'],
            ['name' => 'Tenant', 'description' => 'Tenant reguler dengan unit ukuran standar, mayoritas penyewa di mall.'],
            ['name' => 'Island', 'description' => 'Tenant dengan unit kecil di area terbuka/lorong (bukan ruko tertutup), biasanya booth atau kios kecil.'],
        ];

        foreach ($categories as $category) {
            TenantCategory::create($category);
        }
    }
}