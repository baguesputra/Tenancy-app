<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistSection;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\BreadcrumbService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InspectionSaveJsonTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function seedInspection(): array
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $tenant = Tenant::create([
            'name' => 'Toko Uji', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);
        $section = ChecklistSection::create(['checklist_template_id' => $template->id, 'name' => 'Kebersihan', 'order' => 1]);
        $item = ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'Lantai bersih',
            'type' => 'binary_choice',
            'option_positive' => 'Ya',
            'option_negative' => 'Tidak',
            'order' => 1,
        ]);

        foreach (['sidak.view', 'sidak.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'inspector']);
        $role->syncPermissions(['sidak.view', 'sidak.create']);
        $staff = User::create([
            'name' => 'Inspector', 'email' => 'insp@t.id',
            'employee_number' => 'INSP-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('inspector');

        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $tenant->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => $template->toSnapshotArray(),
            'status' => 'draft',
        ]);

        return [$staff, $inspection, $item, $session, $tenant];
    }

    public function test_save_answer_json_returns_answer_without_redirect(): void
    {
        [$staff, $inspection, $item] = $this->seedInspection();

        $res = $this->actingAs($staff)->postJson("/inspections/{$inspection->id}/answers", [
            'checklist_item_id' => $item->id,
            'value' => 'Ya',
        ]);

        $res->assertOk()->assertJsonPath('answer.checklist_item_id', $item->id)
            ->assertJsonPath('answer.value', 'Ya');
        $this->assertDatabaseHas('inspection_answers', [
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $item->id,
            'value' => 'Ya',
        ]);
    }

    public function test_inspection_breadcrumb_has_session_parent(): void
    {
        [$staff, $inspection, $item, $session, $tenant] = $this->seedInspection();

        $request = Request::create("/inspections/{$inspection->id}", 'GET');
        $request->setRouteResolver(fn () => new class($inspection) {
            public function __construct(private $inspection) {}
            public function getName() { return 'inspections.show'; }
            public function parameter($key) { return $key === 'inspection' ? $this->inspection : null; }
        });

        $crumbs = BreadcrumbService::forRequest($request);

        $this->assertCount(4, $crumbs);
        $this->assertSame('Beranda', $crumbs[0]['label']);
        $this->assertSame('Sesi Sidak', $crumbs[1]['label']);
        $this->assertSame('/inspection-sessions/'.$session->id, $crumbs[2]['href']);
        $this->assertSame($tenant->name, $crumbs[3]['label']);
    }
}
