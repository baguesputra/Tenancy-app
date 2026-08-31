<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use Illuminate\Database\Seeder;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'F&B', 'description' => 'Tenant makanan dan minuman — restoran, kafe, kedai, fast food.'],
            ['name' => 'Fashion', 'description' => 'Tenant pakaian, sepatu, aksesoris, dan produk fashion lainnya.'],
            ['name' => 'Sport', 'description' => 'Tenant perlengkapan dan pakaian olahraga.'],
            ['name' => 'Beauty', 'description' => 'Tenant kosmetik, perawatan tubuh, dan kecantikan.'],
            ['name' => 'Entertainment', 'description' => 'Tenant hiburan — bioskop, arena permainan, karaoke, dsb.'],
        ];

        foreach ($categories as $category) {
            ProductCategory::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}