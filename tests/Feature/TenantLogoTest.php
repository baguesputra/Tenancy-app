<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TenantLogoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        Storage::fake('public');
    }

    private function staff(): User
    {
        foreach (['tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'manager']);
        $role->syncPermissions(['tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete']);
        $staff = User::create([
            'name' => 'Manager', 'email' => 'mgr@t.id',
            'employee_number' => 'MGR-1', 'branch_id' => null,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    private function payload(array $over = []): array
    {
        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'BJM']);
        $tc = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'F&B']);

        return array_merge([
            'name' => 'Kopi Senja',
            'tenant_category_id' => $tc->id,
            'product_category_id' => $pc->id,
            'branch_id' => $branch->id,
        ], $over);
    }

    public function test_store_with_logo_saves_file(): void
    {
        $this->actingAs($this->staff())->post('/tenants', $this->payload([
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]))->assertRedirect();

        $tenant = Tenant::first();
        $this->assertNotNull($tenant->logo_path);
        Storage::disk('public')->assertExists($tenant->logo_path);
        $this->assertStringStartsWith('/storage/', $tenant->logo_url);
    }

    public function test_update_replaces_logo_and_deletes_old(): void
    {
        $staff = $this->staff();
        $this->actingAs($staff)->post('/tenants', $this->payload([
            'logo' => UploadedFile::fake()->image('old.png'),
        ]));

        $tenant = Tenant::first();
        $old = $tenant->logo_path;

        $this->actingAs($staff)->put("/tenants/{$tenant->id}", [
            'name' => 'Kopi Senja',
            'tenant_category_id' => $tenant->tenant_category_id,
            'product_category_id' => $tenant->product_category_id,
            'branch_id' => $tenant->branch_id,
            'logo' => UploadedFile::fake()->image('new.png'),
        ])->assertRedirect();

        $tenant->refresh();
        $this->assertNotEquals($old, $tenant->logo_path);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($tenant->logo_path);
    }

    public function test_destroy_deletes_logo_file(): void
    {
        $staff = $this->staff();
        $this->actingAs($staff)->post('/tenants', $this->payload([
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]));

        $tenant = Tenant::first();
        $path = $tenant->logo_path;

        $tenant->tenantUser()->delete();
        $this->actingAs($staff)->delete("/tenants/{$tenant->id}")->assertRedirect();
        Storage::disk('public')->assertMissing($path);
    }
}
