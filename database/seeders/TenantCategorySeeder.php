<?php

namespace Database\Seeders;

use App\Models\TenantCategory;
use Illuminate\Database\Seeder;

class TenantCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Anchor', 'description' => 'Tenant besar dengan luas unit signifikan, menjadi daya tarik utama pengunjung mall (misal: bioskop, department store).'],
            ['name' => 'Mini Anchor', 'description' => 'Tenant menengah, lebih kecil dari anchor tapi tetap jadi daya tarik area tertentu (misal: supermarket, toko elektronik besar).'],
            ['name' => 'Tenant', 'description' => 'Tenant reguler dengan unit ukuran standar, mayoritas penyewa di mall.'],
            ['name' => 'Island', 'description' => 'Tenant dengan unit kecil di area terbuka/lorong (bukan ruko tertutup), biasanya booth atau kios kecil.'],
        ];

        foreach ($categories as $category) {
            TenantCategory::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}