<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\FloorPlan;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class FloorPlanSeeder extends Seeder
{
    public function run(): void
    {
        $floorsConfig = [
            ['floor' => 'GF', 'name' => 'Ground Floor', 'floor_order' => 1, 'elevation_y' => 0.0],
            ['floor' => '1',  'name' => 'Lantai 1',     'floor_order' => 2, 'elevation_y' => 4.0],
            ['floor' => '2',  'name' => 'Lantai 2',     'floor_order' => 3, 'elevation_y' => 8.0],
            ['floor' => '3',  'name' => 'Lantai 3',     'floor_order' => 4, 'elevation_y' => 12.0],
            ['floor' => '5',  'name' => 'Lantai 5',     'floor_order' => 5, 'elevation_y' => 16.0],
        ];

        $branches = Branch::all();

        foreach ($branches as $branch) {
            foreach ($floorsConfig as $cfg) {
                FloorPlan::updateOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'floor' => $cfg['floor'],
                    ],
                    [
                        'name' => $cfg['name'],
                        'floor_order' => $cfg['floor_order'],
                        'elevation_y' => $cfg['elevation_y'],
                        'image_width' => 1000,
                        'image_height' => 600,
                        'is_active' => true,
                    ]
                );
            }
        }

        // Sample initial polygon blocks for each floor in Branch 1 (Banjarmasin)
        $sampleLayouts = [
            'GF' => [
                'GF-A-001' => [[50, 40], [210, 40], [210, 200], [50, 200]],
                'GF-A-002' => [[230, 40], [420, 40], [420, 200], [230, 200]],
                'GF-A-003' => [[440, 40], [680, 40], [680, 200], [440, 200]],
                'GF-A-004' => [[700, 40], [950, 40], [950, 200], [700, 200]],
                'GF-A-005' => [[50, 360], [240, 360], [240, 540], [50, 540]],
                'GF-A-006' => [[260, 360], [480, 360], [480, 540], [260, 540]],
                'GF-A-007' => [[500, 360], [720, 360], [720, 540], [500, 540]],
                'GF-A-008' => [[740, 360], [950, 360], [950, 540], [740, 540]],
            ],
            '1' => [
                '1-A-001' => [[50, 40], [260, 40], [260, 220], [50, 220]],
                '1-A-002' => [[280, 40], [520, 40], [520, 220], [280, 220]],
                '1-A-003' => [[540, 40], [750, 40], [750, 220], [540, 220]],
                '1-A-004' => [[770, 40], [950, 40], [950, 220], [770, 220]],
                '1-A-005' => [[50, 340], [300, 340], [300, 540], [50, 540]],
                '1-A-006' => [[320, 340], [600, 340], [600, 540], [320, 540]],
                '1-A-007' => [[620, 340], [950, 340], [950, 540], [620, 540]],
            ],
            '2' => [
                '2-A-001' => [[60, 50], [320, 50], [320, 230], [60, 230]],
                '2-A-002' => [[340, 50], [620, 50], [620, 230], [340, 230]],
                '2-A-003' => [[640, 50], [940, 50], [940, 230], [640, 230]],
                '2-A-004' => [[60, 330], [450, 330], [450, 530], [60, 530]],
                '2-A-005' => [[480, 330], [940, 330], [940, 530], [480, 530]],
            ],
            '3' => [
                '3-A-001' => [[80, 60], [460, 60], [460, 250], [80, 250]],
                '3-A-002' => [[500, 60], [920, 60], [920, 250], [500, 250]],
                '3-A-003' => [[80, 320], [460, 320], [460, 520], [80, 520]],
                '3-A-004' => [[500, 320], [920, 320], [920, 520], [500, 520]],
            ],
            '5' => [
                '5-A-001' => [[100, 80], [480, 80], [480, 480], [100, 480]],
                '5-A-002' => [[520, 80], [900, 80], [900, 480], [520, 480]],
            ],
        ];

        foreach ($sampleLayouts as $fl => $unitsMap) {
            foreach ($unitsMap as $unitCode => $pts) {
                Unit::where('branch_id', 1)
                    ->where('unit_code', $unitCode)
                    ->update(['polygon_points' => $pts]);
            }
        }
    }
}

