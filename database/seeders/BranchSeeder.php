<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = [
            ['name' => 'Banjarmasin', 'code' => 'BJM'],
            ['name' => 'Samarinda', 'code' => 'SMD'],
            ['name' => 'Palangka', 'code' => 'PLK'],
            ['name' => 'Jakarta', 'code' => 'JKT'],
        ];

        foreach ($branches as $branch) {
            \App\Models\Branch::firstOrCreate(['code' => $branch['code']], $branch);
        }
    }
}
