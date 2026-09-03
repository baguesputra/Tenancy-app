<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'BJM')->first();

        if (!$branch) {
            $this->command->error('Branch BJM not found. Run BranchSeeder first.');
            return;
        }

        $floorBlocks = [
            'GF' => range('A', 'Q'),
            '1'  => range('A', 'T'),
            '2'  => range('A', 'H'),
            '3'  => range('A', 'H'),
            '5'  => range('A', 'F'),
        ];

        $batchSize = 500;
        $records = [];

        foreach ($floorBlocks as $floor => $blocks) {
            foreach ($blocks as $block) {
                for ($num = 1; $num <= 35; $num++) {
                    $unitNumber = str_pad($num, 3, '0', STR_PAD_LEFT);
                    $unitCode = "{$floor}-{$block}-{$unitNumber}";

                    $records[] = [
                        'branch_id'    => $branch->id,
                        'floor'        => $floor,
                        'block'        => $block,
                        'unit_number'  => $unitNumber,
                        'unit_code'    => $unitCode,
                        'size'         => 100.00,
                        'is_active'    => true,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ];

                    if (count($records) >= $batchSize) {
                        Unit::insert($records);
                        $records = [];
                    }
                }
            }
        }

        if (!empty($records)) {
            Unit::insert($records);
        }

        $this->command->info('Units seeded: ' . Unit::where('branch_id', $branch->id)->count());
    }
}