<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistTemplate;
use App\Models\ProductCategory;
use App\Models\ScannableCode;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ScanRedirectTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_scan_unit_chain(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = \App\Models\Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        $tenant = Tenant::create(['name' => 'Toko Scan', 'branch_id' => $branch->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);
        Tenancy::create(['unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'status' => 'active', 'start_date' => now()->toDateString()]);
        $token = $unit->scannableCode->token;

        // guest -> 200 ChooseLogin, no redirect loop
        $this->get("/scan/{$token}")->assertOk();

        // staff tanpa sidak.create -> units.index (bukan scan lagi)
        foreach (['sidak.view', 'units.view'] as $p) { Permission::create(['name' => $p]); }
        $role = Role::create(['name' => 'staff']);
        $role->givePermissionTo(['sidak.view', 'units.view']);
        $staff = User::create(['name' => 'Staff', 'email' => 'staff@t.id', 'employee_number' => 'TOP-1', 'branch_id' => $branch->id, 'password' => bcrypt('x')]);
        $staff->assignRole('staff');

        $this->actingAs($staff)->get("/scan/{$token}")->assertRedirect(route('units.index'));

        // staff sidak.create tapi unit kosong -> 404 jelas, bukan loop
        $role->givePermissionTo(Permission::create(['name' => 'sidak.create']));
        Tenancy::query()->delete();
        $this->actingAs($staff)->get("/scan/{$token}")->assertNotFound();
    }
}
