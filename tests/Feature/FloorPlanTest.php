<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\FloorPlan;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FloorPlanTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin', 'is_active' => true]);

        Permission::firstOrCreate(['name' => 'units.view']);
        Permission::firstOrCreate(['name' => 'units.edit']);

        $this->user = User::factory()->create([
            'branch_id' => $this->branch->id,
            'is_active' => true,
        ]);
        $this->user->givePermissionTo(['units.view', 'units.edit']);

        FloorPlan::firstOrCreate([
            'branch_id' => $this->branch->id,
            'floor' => 'GF',
        ], [
            'name' => 'Ground Floor',
            'floor_order' => 1,
            'elevation_y' => 0.0,
            'image_width' => 1000,
            'image_height' => 600,
            'is_active' => true,
        ]);
    }

    public function test_floor_plans_index_accessible_and_renders(): void
    {
        $response = $this->actingAs($this->user)->get('/floor-plans');
        $response->assertOk();
    }

    public function test_floor_plans_editor_accessible(): void
    {
        $response = $this->actingAs($this->user)->get('/floor-plans/editor/GF');
        $response->assertOk();
    }

    public function test_save_polygons_updates_unit_points(): void
    {
        $unit = Unit::firstOrCreate([
            'branch_id' => $this->branch->id,
            'unit_code' => 'GF-TEST-01',
        ], [
            'floor' => 'GF',
            'unit_number' => 'TEST-01',
            'is_active' => true,
        ]);

        $payload = [
            'units' => [
                [
                    'id' => $unit->id,
                    'polygon_points' => [[10, 10], [50, 10], [50, 50], [10, 50]],
                    'custom_color' => '#10b981',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post('/floor-plans/polygons', $payload);
        $response->assertSessionHas('success');

        $unit->refresh();
        $this->assertCount(4, $unit->polygon_points);
        $this->assertEquals('#10b981', $unit->custom_color);
    }

    public function test_parse_cad_svg_detects_polygon_and_label(): void
    {
        $unit = Unit::firstOrCreate([
            'branch_id' => $this->branch->id,
            'unit_code' => 'GF-CAD-01',
        ], [
            'floor' => 'GF',
            'unit_number' => 'CAD-01',
            'is_active' => true,
        ]);

        $svgContent = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
    <polygon points="10,10 100,10 100,100 10,100" />
    <text x="50" y="50">GF-CAD-01</text>
</svg>
SVG;

        $file = UploadedFile::fake()->createWithContent('plan.svg', $svgContent);

        $response = $this->actingAs($this->user)->post('/floor-plans/parse-cad', [
            'file' => $file,
            'branch_id' => $this->branch->id,
            'floor' => 'GF',
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('total_detected', 1);
        $response->assertJsonPath('matched_count', 1);
        $response->assertJsonPath('matches.0.unit_code', 'GF-CAD-01');
        $response->assertJsonPath('matches.0.matched', true);
    }
}
