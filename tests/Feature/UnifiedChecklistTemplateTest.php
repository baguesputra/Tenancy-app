<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistTemplate;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\InspectionService;
use Database\Seeders\ChecklistSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnifiedChecklistTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Tenant']);
        foreach (['F&B', 'Lifestyle', 'Sport', 'Retail'] as $name) {
            ProductCategory::create(['name' => $name]);
        }
        $this->seed(ChecklistSeeder::class);

        return [$branch, $tc];
    }

    private function makeTenant(Branch $branch, TenantCategory $tc, ?string $productCategory): Tenant
    {
        return Tenant::create([
            'name' => 'Toko '.($productCategory ?? 'Tanpa Kategori'),
            'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id,
            'product_category_id' => $productCategory
                ? ProductCategory::where('name', $productCategory)->firstOrFail()->id
                : null,
            'is_active' => true,
        ]);
    }

    private function sectionNames(array $snapshot): array
    {
        return collect($snapshot['sections'] ?? [])->pluck('name')->all();
    }

    public function test_seeder_menyisakan_satu_template_aktif_untuk_semua_kategori(): void
    {
        $this->seedBase();

        $this->assertSame(1, ChecklistTemplate::where('is_active', true)->count());
        $template = ChecklistTemplate::where('name', 'Form Sidak Tenant')->firstOrFail();
        $this->assertTrue($template->is_active);
        $this->assertSame(
            ProductCategory::count(),
            $template->productCategories()->count()
        );
        $this->assertSame(0, ChecklistTemplate::whereIn('name', ['Form Sidak F&B', 'Form Sidak Fashion'])
            ->where('is_active', true)->count());
    }

    public function test_snapshot_tenant_fnb_hanya_section_fnb(): void
    {
        [$branch, $tc] = $this->seedBase();
        $tenant = $this->makeTenant($branch, $tc, 'F&B')->load('productCategory');

        $names = $this->sectionNames(
            ChecklistTemplate::where('name', 'Form Sidak Tenant')->firstOrFail()->toSnapshotArray($tenant)
        );

        $this->assertSame(['Civil', 'Safety Tools', 'Kitchen', 'Plumbing', 'Electrical'], $names);
    }

    public function test_snapshot_tenant_non_fnb_hanya_section_evaluasi(): void
    {
        [$branch, $tc] = $this->seedBase();
        $tenant = $this->makeTenant($branch, $tc, 'Lifestyle')->load('productCategory');

        $names = $this->sectionNames(
            ChecklistTemplate::where('name', 'Form Sidak Tenant')->firstOrFail()->toSnapshotArray($tenant)
        );

        $this->assertSame(
            ['Kondisi Unit', 'AC & Ventilation', 'Kelistrikan', 'Security', 'Protection', 'Gudang / Storage'],
            $names
        );
    }

    public function test_snapshot_tanpa_tenant_menampilkan_semua_section(): void
    {
        $this->seedBase();

        $names = $this->sectionNames(
            ChecklistTemplate::where('name', 'Form Sidak Tenant')->firstOrFail()->toSnapshotArray()
        );

        $this->assertCount(11, $names);
    }

    public function test_add_inspection_menyimpan_snapshot_terfilter(): void
    {
        [$branch, $tc] = $this->seedBase();
        $tenant = $this->makeTenant($branch, $tc, 'Sport');
        $user = User::create([
            'name' => 'Inspector', 'email' => 'insp@t.id',
            'employee_number' => 'INSP-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $user->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $inspection = app(InspectionService::class)->addInspection($session, $tenant);

        $this->assertSame(
            ['Kondisi Unit', 'AC & Ventilation', 'Kelistrikan', 'Security', 'Protection', 'Gudang / Storage'],
            $this->sectionNames($inspection->checklist_snapshot)
        );
    }
}
