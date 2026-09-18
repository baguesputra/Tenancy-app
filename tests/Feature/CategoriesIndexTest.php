<?php

namespace Tests\Feature;

use App\Models\ChecklistTemplate;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CategoriesIndexTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function staff(): User
    {
        foreach (['categories.view', 'categories.manage'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'manager']);
        $role->syncPermissions(['categories.view', 'categories.manage']);
        $staff = User::create([
            'name' => 'Manager', 'email' => 'mgr@t.id',
            'employee_number' => 'MGR-1', 'branch_id' => null,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    public function test_index_returns_both_category_lists(): void
    {
        $staff = $this->staff();
        TenantCategory::create(['name' => 'Anchor']);
        ProductCategory::create(['name' => 'F&B']);

        $res = $this->actingAs($staff)->get('/categories');

        $res->assertOk();
        $this->assertCount(1, $res->viewData('page')['props']['tenantCategories']);
        $this->assertCount(1, $res->viewData('page')['props']['productCategories']);
    }

    public function test_destroy_product_category_detaches_checklist_pivot(): void
    {
        $staff = $this->staff();
        $pc = ProductCategory::create(['name' => 'F&B']);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);

        $this->actingAs($staff)->delete("/product-categories/{$pc->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('product_categories', ['id' => $pc->id]);
        $this->assertDatabaseMissing('checklist_template_product_categories', ['product_category_id' => $pc->id]);
        $this->assertDatabaseHas('checklist_templates', ['id' => $template->id]);
    }

    public function test_destroy_category_blocked_when_used_by_tenant(): void
    {
        $staff = $this->staff();
        $branch = \App\Models\Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Anchor']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        Tenant::create([
            'name' => 'Toko', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);

        $this->actingAs($staff)->delete("/tenant-categories/{$tc->id}")
            ->assertSessionHasErrors('category');
        $this->assertDatabaseHas('tenant_categories', ['id' => $tc->id]);
    }
}
