<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\PermitRequest;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AccessMatrixTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $roleName, array $permissions): User
    {
        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Test '.$roleName,
            'employee_number' => 'AM-'.uniqid(),
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function makeLoo(User $marketing): Loo
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        return Loo::create([
            'loo_number' => Loo::generateLooNumber($branch->code, 2026),
            'branch_id' => $branch->id,
            'marketing_id' => $marketing->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    public function test_guest_dialihkan_ke_login(): void
    {
        $this->get('/permit-requests')->assertRedirect('/login');
        $this->get('/loos')->assertRedirect('/login');
    }

    public function test_staff_tanpa_permission_ditolak(): void
    {
        $staff = $this->makeUser('staff', []);

        $this->actingAs($staff)->get('/permit-requests')->assertForbidden();
        $this->actingAs($staff)->get('/loos')->assertForbidden();
        $this->actingAs($staff)->get('/settings/users')->assertForbidden();
    }

    public function test_matriks_permit_requests(): void
    {
        $tenancy = $this->makeUser('tenancy_staff', [
            'sidak.view', 'sidak.manage', 'sidak.answer',
            'permits.view', 'permits.create', 'permits.revise', 'permits.approve', 'permits.inspect',
            'loos.view', 'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit', 'loos.transition',
        ]);
        $marketing = $this->makeUser('marketing', [
            'tenants.view', 'permits.view', 'permits.create', 'permits.revise', 'permits.approve',
            'loos.view', 'loos.create', 'loos.edit', 'loos.transition',
        ]);
        $bs = $this->makeUser('bs_staff', ['permits.view', 'permits.approve']);

        $this->actingAs($tenancy)->get('/permit-requests')->assertOk();
        $this->actingAs($tenancy)->get('/permit-requests/create')->assertOk();
        $this->actingAs($marketing)->get('/permit-requests')->assertOk();
        $this->actingAs($marketing)->get('/permit-requests/create')->assertOk();
        $this->actingAs($bs)->get('/permit-requests')->assertOk();
        $this->actingAs($bs)->get('/permit-requests/create')->assertForbidden();
    }

    public function test_matriks_loos(): void
    {
        $marketing = $this->makeUser('marketing', [
            'permits.view', 'loos.view', 'loos.create', 'loos.edit', 'loos.transition',
        ]);
        $viewer = $this->makeUser('viewer_only', ['loos.view']);
        $bs = $this->makeUser('bs_staff', ['permits.view', 'permits.approve']);
        $loo = $this->makeLoo($marketing);

        $this->actingAs($marketing)->get('/loos')->assertOk();
        $this->actingAs($marketing)->get('/loos/create')->assertOk();
        $this->actingAs($marketing)->get("/loos/{$loo->id}/edit")->assertOk();
        $this->actingAs($viewer)->get('/loos')->assertOk();
        $this->actingAs($viewer)->get('/loos/create')->assertForbidden();
        $this->actingAs($viewer)->get("/loos/{$loo->id}/edit")->assertForbidden();
        $this->actingAs($bs)->get('/loos')->assertForbidden();
    }

    public function test_matriks_revise_dan_inspect_terpisah(): void
    {
        // Tanpa permission baru: 403 dari middleware (gerbang pertama).
        // Dengan permission: lolos middleware ke guard bisnis di controller/service.
        $reviser = $this->makeUser('reviser_only', ['permits.view', 'permits.create', 'permits.revise']);

        $permit = PermitRequest::create([
            'permit_number' => 'PRW-TST-'.uniqid(),
            'activity_types' => ['kerja'],
            'request_date' => '2026-10-20',
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'store_name_snapshot' => 'Area X',
            'requested_by_type' => User::class,
            'requested_by_id' => $reviser->id,
            'barcode_token' => 'TOK-'.uniqid(),
            'status' => 'pending',
        ]);

        // Role tanpa permits.revise: ditolak middleware walau payload valid.
        $noPerms = $this->makeUser('no_new_perms', ['permits.view']);
        $this->actingAs($noPerms)->post("/permit-requests/{$permit->id}/revise", [
            'work_start_date' => '2026-10-21',
            'work_end_date' => '2026-10-22',
            'reason' => 'Jadwal mundur karena material telat.',
        ])->assertForbidden();

        // Role dengan permits.revise tapi bukan tenancy_staff: lolos middleware,
        // ditolak guard kepemilikan form (bukti dua lapis bekerja independen).
        $this->actingAs($reviser)->post("/permit-requests/{$permit->id}/revise", [
            'work_start_date' => '2026-10-21',
            'work_end_date' => '2026-10-22',
            'reason' => 'Jadwal mundur karena material telat.',
        ])->assertForbidden();
    }

    public function test_users_manage_wajib_untuk_kelola_user(): void
    {
        $templatesOnly = $this->makeUser('templates_only', ['settings.templates']);
        $userAdmin = $this->makeUser('user_admin', ['users.manage']);
        $roleId = Role::where('name', 'user_admin')->firstOrFail()->id;

        $this->actingAs($templatesOnly)->get('/settings/users')->assertForbidden();
        $this->actingAs($templatesOnly)->put("/settings/access-control/{$roleId}", ['permissions' => []])->assertForbidden();
        $this->actingAs($userAdmin)->get('/settings/users')->assertOk();
        $this->actingAs($userAdmin)->put("/settings/access-control/{$roleId}", ['permissions' => ['users.manage']])->assertRedirect();
    }

    public function test_settings_index_menampilkan_hub_sesuai_izin(): void
    {
        $templatesOnly = $this->makeUser('settings_entry', ['settings.templates']);
        $docOnly = $this->makeUser('doc_entry', ['settings.documents']);
        $none = $this->makeUser('no_settings', []);

        $this->actingAs($templatesOnly)->get('/settings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Settings/Home'));

        $this->actingAs($docOnly)->get('/settings')->assertOk();
        $this->actingAs($none)->get('/settings')->assertForbidden();
    }

    public function test_settings_modul_terisolasi_per_permission(): void
    {
        $templatesOnly = $this->makeUser('templates_iso', ['settings.templates']);

        $this->actingAs($templatesOnly)->get('/settings/inspection-templates')->assertOk();
        $this->actingAs($templatesOnly)->get('/settings/gate')->assertForbidden();
        $this->actingAs($templatesOnly)->get('/settings/permit-scan')->assertForbidden();
        $this->actingAs($templatesOnly)->get('/settings/documents')->assertForbidden();
        $this->actingAs($templatesOnly)->get('/settings/access-control')->assertForbidden();
    }
}
