<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        // Disable foreign key checks to allow truncate
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('product_categories')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $categories = [
            ['name' => 'Lifestyle', 'description' => 'Tenant gaya hidup dan aksesoris.'],
            ['name' => 'Health', 'description' => 'Tenant kesehatan dan wellness.'],
            ['name' => 'Sport', 'description' => 'Tenant perlengkapan dan pakaian olahraga.'],
            ['name' => 'Beauty', 'description' => 'Tenant kosmetik, perawatan tubuh, dan kecantikan.'],
            ['name' => 'Entertainment', 'description' => 'Tenant hiburan — bioskop, arena permainan, karaoke, dsb.'],
            ['name' => 'Retail', 'description' => 'Tenant retail umum.'],
            ['name' => 'Electronics', 'description' => 'Tenant elektronik dan gadget.'],
            ['name' => 'Home & Living', 'description' => 'Tenant perumahan dan perlengkapan rumah.'],
            ['name' => 'Service', 'description' => 'Tenant layanan jasa.'],
            ['name' => 'Kids', 'description' => 'Tenant produk dan layanan untuk anak.'],
            ['name' => 'Grocery', 'description' => 'Tenant kecualian dan kebutuhan pokok.'],
            ['name' => 'Island', 'description' => 'Tenant dengan unit kecil di area terbuka/lorong.'],
            ['name' => 'F&B', 'description' => 'Tenant makanan dan minuman — restoran, kafe, kedai, fast food.'],
            ['name' => 'Department Store', 'description' => 'Tenant departemen store.'],
        ];

        foreach ($categories as $category) {
            ProductCategory::create($category);
        }
    }
}