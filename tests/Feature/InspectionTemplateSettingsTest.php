<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Database\Seeders\ChecklistSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InspectionTemplateSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function admin(): User
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        Permission::firstOrCreate(['name' => 'settings.templates']);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->syncPermissions(['settings.templates']);
        $user = User::create([
            'name' => 'Admin', 'email' => 'admin@t.id',
            'employee_number' => 'ADM-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole('admin');

        return $user;
    }

    private function seedUnified(): ChecklistTemplate
    {
        foreach (['F&B', 'Retail'] as $name) {
            ProductCategory::create(['name' => $name]);
        }
        $this->seed(ChecklistSeeder::class);

        return ChecklistTemplate::where('name', 'Form Sidak Tenant')->firstOrFail();
    }

    public function test_index_hanya_menampilkan_template_aktif(): void
    {
        $this->seedUnified();
        ChecklistTemplate::create(['name' => 'Arsip Lama', 'is_active' => false]);

        $res = $this->actingAs($this->admin())->get('/settings/inspection-templates');

        $res->assertOk();
        $names = collect($res->viewData('page')['props']['templates'] ?? [])->pluck('name')->all();
        $this->assertSame(['Form Sidak Tenant'], $names);
    }

    public function test_tolak_nonaktifkan_template_aktif_terakhir(): void
    {
        $template = $this->seedUnified();

        $res = $this->actingAs($this->admin())->put(
            "/settings/inspection-templates/{$template->id}",
            ['name' => $template->name, 'is_active' => false]
        );

        $res->assertStatus(302);
        $res->assertSessionHasErrors('is_active');
        $this->assertTrue($template->fresh()->is_active);
    }

    public function test_tolak_unmap_kategori_terakhir(): void
    {
        $template = $this->seedUnified();
        $fnbId = ProductCategory::where('name', 'F&B')->firstOrFail()->id;

        $res = $this->actingAs($this->admin())->put(
            "/settings/inspection-templates/{$template->id}",
            [
                'name' => $template->name,
                'product_category_ids' => [$fnbId],
            ]
        );

        $res->assertStatus(302);
        $res->assertSessionHasErrors('product_category_ids');
        $this->assertSame(2, $template->productCategories()->count());
    }

    public function test_edit_item_label_berhasil_dan_snapshot_lama_utuh(): void
    {
        $template = $this->seedUnified();
        $admin = $this->admin();
        $item = ChecklistItem::whereHas('section', fn ($q) => $q->where('checklist_template_id', $template->id))
            ->where('type', 'binary_choice')->firstOrFail();

        $branch = Branch::firstOrFail();
        $tc = TenantCategory::create(['name' => 'Tenant']);
        $tenant = Tenant::create([
            'name' => 'Toko Uji', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id,
            'product_category_id' => ProductCategory::where('name', 'Retail')->firstOrFail()->id,
            'is_active' => true,
        ]);
        $user = User::create([
            'name' => 'Inspector', 'email' => 'insp@t.id',
            'employee_number' => 'INSP-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $user->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $tenant->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => $template->toSnapshotArray($tenant),
            'status' => 'draft',
        ]);
        $oldLabel = collect($inspection->checklist_snapshot['sections'])
            ->flatMap(fn ($s) => $s['items'])->firstWhere('id', $item->id)['label'];

        $res = $this->actingAs($admin)->put(
            "/settings/inspection-items/{$item->id}",
            ['label' => 'Label Baru', 'option_positive' => 'Ya', 'option_negative' => 'Tidak']
        );

        $res->assertRedirect();
        $res->assertSessionHasNoErrors();
        $this->assertSame('Label Baru', $item->fresh()->label);
        $snapshotLabels = collect($inspection->fresh()->checklist_snapshot['sections'])
            ->flatMap(fn ($s) => $s['items'])->pluck('label')->all();
        $this->assertContains($oldLabel, $snapshotLabels);
        $this->assertNotContains('Label Baru', $snapshotLabels);
    }

    public function test_edit_item_binary_tanpa_opsi_ditolak(): void
    {
        $template = $this->seedUnified();
        $item = ChecklistItem::whereHas('section', fn ($q) => $q->where('checklist_template_id', $template->id))
            ->where('type', 'binary_choice')->firstOrFail();

        $res = $this->actingAs($this->admin())->put(
            "/settings/inspection-items/{$item->id}",
            ['label' => 'Label Baru', 'option_positive' => '', 'option_negative' => '']
        );

        $res->assertStatus(302);
        $res->assertSessionHasErrors('option_positive');
    }
}
