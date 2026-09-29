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
        foreach (['tenants.view', 'tenants.edit', 'tenants.delete'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'manager']);
        $role->syncPermissions(['tenants.view', 'tenants.edit', 'tenants.delete']);
        $staff = User::create([
            'name' => 'Manager', 'email' => 'mgr@t.id',
            'employee_number' => 'MGR-1', 'branch_id' => null,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    private function makeTenant(): Tenant
    {
        return Tenant::create([
            'name' => 'Kopi Senja',
            'branch_id' => Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'BJM'])->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'F&B'])->id,
            'is_active' => true,
        ]);
    }

    private function payload(Tenant $tenant, array $over = []): array
    {
        return array_merge([
            'name' => $tenant->name,
            'tenant_category_id' => $tenant->tenant_category_id,
            'product_category_id' => $tenant->product_category_id,
            'branch_id' => $tenant->branch_id,
        ], $over);
    }

    public function test_update_saves_logo_file(): void
    {
        $staff = $this->staff();
        $tenant = $this->makeTenant();

        $this->actingAs($staff)->put("/tenants/{$tenant->id}", $this->payload($tenant, [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]))->assertRedirect();

        $tenant->refresh();
        $this->assertNotNull($tenant->logo_path);
        Storage::disk('public')->assertExists($tenant->logo_path);
        $this->assertStringStartsWith('/storage/', $tenant->logo_url);
    }

    public function test_update_replaces_logo_and_deletes_old(): void
    {
        $staff = $this->staff();
        $tenant = $this->makeTenant();

        $this->actingAs($staff)->put("/tenants/{$tenant->id}", $this->payload($tenant, [
            'logo' => UploadedFile::fake()->image('old.png'),
        ]));

        $tenant->refresh();
        $old = $tenant->logo_path;

        $this->actingAs($staff)->put("/tenants/{$tenant->id}", $this->payload($tenant, [
            'logo' => UploadedFile::fake()->image('new.png'),
        ]))->assertRedirect();

        $tenant->refresh();
        $this->assertNotEquals($old, $tenant->logo_path);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($tenant->logo_path);
    }

    public function test_destroy_deletes_logo_file(): void
    {
        $staff = $this->staff();
        $tenant = $this->makeTenant();

        $this->actingAs($staff)->put("/tenants/{$tenant->id}", $this->payload($tenant, [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]));

        $tenant->refresh();
        $path = $tenant->logo_path;

        $this->actingAs($staff)->delete("/tenants/{$tenant->id}")->assertRedirect();
        Storage::disk('public')->assertMissing($path);
    }

    public function test_manual_tenant_create_route_is_gone(): void
    {
        $this->actingAs($this->staff())
            ->post('/tenants', ['name' => 'X'])
            ->assertStatus(405);
    }
}
