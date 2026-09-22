<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\MasterScope;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\TenantScopeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TenantScopeTest extends TestCase
{
    use RefreshDatabase;

    private function marketing(): User
    {
        foreach (['tenants.view', 'tenants.create', 'tenants.edit'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'marketing_staff']);
        $role->syncPermissions(['tenants.view', 'tenants.create', 'tenants.edit']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $staff = User::create([
            'name' => 'Mkt', 'employee_number' => 'MKT-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $staff->assignRole('marketing_staff');

        $oc = TenantCategory::firstOrCreate(['name' => 'Open Counter']);
        MasterScope::create([
            'role_id' => $role->id, 'tenant_category_id' => $oc->id,
            'can_view' => true, 'view_own_only' => false,
            'can_create' => true, 'can_edit' => true, 'edit_own_only' => true,
        ]);

        return $staff;
    }

    private function tenant(string $category, ?int $createdBy = null): Tenant
    {
        $cat = TenantCategory::firstOrCreate(['name' => $category]);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        return Tenant::create([
            'name' => $category.' Test', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
            'is_active' => true, 'created_by' => $createdBy,
        ]);
    }

    public function test_marketing_index_only_open_counter(): void
    {
        $mkt = $this->marketing();
        $this->tenant('Open Counter');
        $this->tenant('Tenant');

        $this->actingAs($mkt)->get('/tenants')->assertOk()->assertSee('Open Counter Test')->assertDontSee('Tenant Test');
    }

    public function test_marketing_cannot_create_other_category(): void
    {
        $mkt = $this->marketing();
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);

        $this->actingAs($mkt)->post('/tenants', [
            'name' => 'X', 'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
        ])->assertForbidden();
    }

    public function test_marketing_edit_only_own(): void
    {
        $mkt = $this->marketing();
        $own = $this->tenant('Open Counter', $mkt->id);
        $other = $this->tenant('Open Counter', null);

        $svc = app(TenantScopeService::class);
        $this->assertTrue($svc->canEdit($mkt, $own));
        $this->assertFalse($svc->canEdit($mkt, $other));
    }
}
