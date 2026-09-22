<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\MasterScope;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\PermitRequestService;
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

    private function tenancy(): User
    {
        foreach (['tenants.view', 'tenants.create', 'tenants.edit'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'tenancy_staff']);
        $role->syncPermissions(['tenants.view', 'tenants.create', 'tenants.edit']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $staff = User::create([
            'name' => 'Tnc', 'employee_number' => 'TNC-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $staff->assignRole('tenancy_staff');

        $oc = TenantCategory::firstOrCreate(['name' => 'Open Counter']);
        MasterScope::create([
            'role_id' => $role->id, 'tenant_category_id' => $oc->id, 'mode' => 'exclude',
            'can_view' => true, 'view_own_only' => false,
            'can_create' => true, 'can_edit' => true, 'edit_own_only' => false,
        ]);

        return $staff;
    }

    public function test_tenancy_excludes_open_counter_with_one_row(): void
    {
        $tnc = $this->tenancy();
        $this->tenant('Open Counter');
        $this->tenant('Tenant');

        $res = $this->actingAs($tnc)->get('/tenants')->assertOk();
        $names = collect($res->viewData('page')['props']['tenants']['data'])->pluck('name')->all();
        $this->assertContains('Tenant Test', $names);
        $this->assertNotContains('Open Counter Test', $names);

        $oc = TenantCategory::firstOrCreate(['name' => 'Open Counter']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $this->actingAs($tnc)->post('/tenants', [
            'name' => 'X', 'tenant_category_id' => $oc->id, 'product_category_id' => $pc->id,
        ])->assertForbidden();

        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $this->actingAs($tnc)->post('/tenants', [
            'name' => 'OK', 'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
        ])->assertRedirect();
    }

    public function test_tenancy_can_see_pameran_permits_but_tenant_dropdown_scoped(): void
    {
        $tnc = $this->tenancy();
        foreach (['permits.view', 'permits.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        Role::firstOrCreate(['name' => 'tenancy_staff'])->syncPermissions(['tenants.view', 'tenants.create', 'tenants.edit', 'permits.view', 'permits.create']);

        $service = app(PermitRequestService::class);
        $oc = $this->tenant('Open Counter');
        $reg = $this->tenant('Tenant');

        $pameran = $service->create([
            'activity_types' => ['pameran'], 'request_date' => '2026-09-22',
            'tenant_id' => $oc->id, 'work_start_date' => '2026-09-23', 'work_end_date' => '2026-09-24',
        ], $tnc);
        $biasa = $service->create([
            'activity_types' => ['kerja'], 'request_date' => '2026-09-22',
            'tenant_id' => $reg->id, 'store_name_snapshot' => 'Area X',
            'work_start_date' => '2026-09-23', 'work_end_date' => '2026-09-24',
        ], $tnc);

        $res = $this->actingAs($tnc)->get('/permit-requests')->assertOk();
        $numbers = collect($res->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($biasa->permit_number, $numbers);
        $this->assertContains($pameran->permit_number, $numbers);

        $this->actingAs($tnc)->get("/permit-requests/{$pameran->id}")->assertOk();

        $res = $this->actingAs($tnc)->get('/permit-requests/create')->assertOk();
        $names = collect($res->viewData('page')['props']['tenants'])->pluck('name')->all();
        $this->assertContains('Tenant Test', $names);
        $this->assertNotContains('Open Counter Test', $names);

        $this->actingAs($tnc)->post('/permit-requests', [
            'activity_types' => ['pameran'],
            'request_date' => '2026-09-22',
            'tenant_id' => $oc->id,
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
        ])->assertForbidden();
    }
}
