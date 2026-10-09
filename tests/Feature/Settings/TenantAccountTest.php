<?php

namespace Tests\Feature\Settings;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TenantAccountTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        foreach (['settings.access', 'users.manage'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => 'user_admin', 'guard_name' => 'web']);
        $role->syncPermissions(['settings.access', 'users.manage']);

        $user = User::firstOrCreate(
            ['employee_number' => 'TUA-1'],
            [
                'name' => 'Admin Tenant',
                'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
                'password' => bcrypt('x'),
            ]
        );
        if (! $user->hasRole('user_admin')) {
            $user->assignRole('user_admin');
        }

        return $user->fresh();
    }

    private function tenant(): Tenant
    {
        return Tenant::create([
            'name' => 'Kopi Tes '.uniqid(),
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'Retail'])->id,
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'is_active' => true,
        ]);
    }

    public function test_kredensial_dikirim_sekali_pakai_lewat_cache(): void
    {
        $tenant = $this->tenant();

        $response = $this->actingAs($this->admin())
            ->post("/settings/tenant-accounts/{$tenant->id}", ['password' => 'rahasia-123']);

        $response->assertRedirect();

        $token = $response->getSession()->get('credl');
        $this->assertNotNull($token, 'Flash credl (token) harus dikirim');
        $this->assertNull($response->getSession()->get('credential'), 'Password tidak boleh ada di session');

        $this->actingAs($this->admin())
            ->getJson("/settings/tenant-accounts/credential/{$token}")
            ->assertOk()
            ->assertJson(['mode' => 'created', 'username' => $tenant->tenantUser->username, 'password' => 'rahasia-123']);

        $this->actingAs($this->admin())
            ->getJson("/settings/tenant-accounts/credential/{$token}")
            ->assertNotFound();

        $this->assertTrue(Hash::check('rahasia-123', TenantUser::where('tenant_id', $tenant->id)->firstOrFail()->password));
    }

    public function test_index_tapi_butuh_users_manage(): void
    {
        $this->actingAs($this->admin())->get('/settings/tenant-accounts')->assertOk();

        Permission::firstOrCreate(['name' => 'settings.access', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'settings_only', 'guard_name' => 'web']);
        $role->syncPermissions(['settings.access']);
        $user = User::firstOrCreate(
            ['employee_number' => 'TSO-1'],
            [
                'name' => 'Settings Only',
                'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
                'password' => bcrypt('x'),
            ]
        );
        $user->assignRole('settings_only');

        $this->actingAs($user->fresh())->get('/settings/tenant-accounts')->assertForbidden();
    }
}
