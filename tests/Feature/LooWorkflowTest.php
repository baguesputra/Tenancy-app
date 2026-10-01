<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
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

class LooWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName, array $permissions = ['loos.view', 'loos.create', 'loos.edit', 'loos.transition']): User
    {
        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Test '.$roleName,
            'email' => $roleName.'@'.uniqid().'.t.id',
            'employee_number' => 'T-'.uniqid(),
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function makeLoo(): Loo
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);

        return Loo::create([
            'loo_number' => Loo::generateLooNumber($branch->code, 2026),
            'branch_id' => $branch->id,
            'marketing_id' => $this->userWithRole('marketing_loo_input')->id,
            'tenant_category_id' => $cat->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    public function test_loo_number_is_generated_and_sequential(): void
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $first = Loo::generateLooNumber($branch->code, 2026);
        $this->assertSame('LOO/2026/TST/0001', $first);

        $this->makeLoo();
        $second = Loo::generateLooNumber($branch->code, 2026);
        $this->assertSame('LOO/2026/TST/0002', $second);
    }

    public function test_stage_follows_status_transition(): void
    {
        $loo = $this->makeLoo();
        $this->assertSame('marketing', $loo->current_stage);

        $loo->updateStatus('legal_review');
        $this->assertSame('legal_review', $loo->fresh()->status);
        $this->assertSame('legal', $loo->fresh()->current_stage);

        $loo->updateStatus('accounting_review');
        $this->assertSame('accounting', $loo->fresh()->current_stage);

        $loo->updateStatus('fitout');
        $this->assertSame('fitout', $loo->fresh()->current_stage);

        $loo->updateStatus('completed');
        $fresh = $loo->fresh();
        $this->assertSame('completed', $fresh->status);
        $this->assertNotNull($fresh->completed_at);
    }

    public function test_cancel_stamps_cancelled_at(): void
    {
        $loo = $this->makeLoo();
        $loo->updateStatus('cancelled');
        $this->assertNotNull($loo->fresh()->cancelled_at);
    }

    public function test_index_requires_auth(): void
    {
        $this->get('/loos')->assertRedirect('/login');
    }

    public function test_marketing_sees_index_and_can_create(): void
    {
        $marketing = $this->userWithRole('marketing_loo_input');

        $this->actingAs($marketing)->get('/loos')->assertOk();
        $this->actingAs($marketing)->get('/loos/create')->assertOk();

        $this->makeLoo();
        $this->actingAs($marketing)->get('/loos')->assertOk();
    }

    public function test_user_cannot_edit_loo_from_other_branch(): void
    {
        $loo = $this->makeLoo();
        $other = User::create([
            'name' => 'Other Branch',
            'email' => 'other@t.id',
            'employee_number' => 'O-1',
            'branch_id' => Branch::create(['code' => 'OTH', 'name' => 'Cabang Lain'])->id,
            'password' => bcrypt('x'),
        ]);
        $other->assignRole('marketing_loo_input');

        $this->actingAs($other)->get("/loos/{$loo->id}")->assertForbidden();
    }

    public function test_transition_rejects_skipping_stages(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing_loo_input');

        // draft -> pre_handover lompat 5 stage
        $this->actingAs($user)
            ->from("/loos/{$loo->id}")
            ->post("/loos/{$loo->id}/transition", ['status' => 'pre_handover'])
            ->assertSessionHasErrors('status');

        $this->assertSame('draft', $loo->fresh()->status);
    }

    public function test_transition_logs_history(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing_loo_input');

        $this->actingAs($user)->post("/loos/{$loo->id}/transition", ['status' => 'legal_review']);

        $this->assertSame('legal_review', $loo->fresh()->status);
        $this->assertDatabaseHas('loo_histories', [
            'loo_id' => $loo->id,
            'user_id' => $user->id,
            'action' => 'status_changed',
            'from_status' => 'draft',
            'to_status' => 'legal_review',
        ]);
    }

    public function test_legal_can_fill_legalitas_and_advances_stage(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_edit', 'loos.legal_submit']);

        $this->actingAs($legal)->post("/loos/{$loo->id}/sections/legalitas", [
            'entity_name' => 'PT Contoh Sengkala',
            'entity_type' => 'PT',
            'submit' => '1',
        ]);

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'legalitas',
            'is_submitted' => true,
        ]);

        $this->assertSame('accounting_review', $loo->fresh()->status);
        $this->assertSame('accounting', $loo->fresh()->current_stage);
    }

    public function test_user_cannot_fill_section_without_permission(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_edit']);

        // marketing punya loos.transition tapi TIDAK punya loos.legal_edit
        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/biaya_termin", ['monthly_rent' => '5000000'])
            ->assertForbidden();

        $this->assertDatabaseMissing('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'biaya_termin',
        ]);
    }

    public function test_section_can_be_filled_early_without_advancing_status(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);

        // Paralel: accounting boleh isi section-nya duluan walau stage masih legal.
        $accounting = $this->userWithRole('accounting_staff', ['loos.view', 'loos.transition', 'loos.accounting_edit']);

        $this->actingAs($accounting)
            ->post("/loos/{$loo->id}/sections/biaya_termin", ['monthly_rent' => '5000000', 'submit' => '1'])
            ->assertRedirect();

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'biaya_termin',
            'is_submitted' => true,
        ]);
        // Submit duluan tidak melompatkan status.
        $this->assertSame('legal_review', $loo->fresh()->status);
    }

    public function test_cannot_fill_section_when_loo_terminal(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'cancelled', 'current_stage' => 'legal']);

        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_edit']);

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/legalitas", ['entity_name' => 'PT X', 'submit' => '1'])
            ->assertStatus(422);
    }

    public function test_save_draft_does_not_advance_stage(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_edit']);

        $this->actingAs($legal)->post("/loos/{$loo->id}/sections/legalitas", [
            'entity_name' => 'PT Draft Saja',
            'submit' => '0',
        ]);

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'legalitas',
            'is_submitted' => false,
        ]);
        $this->assertSame('legal_review', $loo->fresh()->status);
    }

    public function test_unknown_section_key_returns_404(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing_loo_input');

        $this->actingAs($user)
            ->post("/loos/{$loo->id}/sections/tidak_ada", ['x' => 'y'])
            ->assertNotFound();
    }

    public function test_tenant_from_other_branch_rejected_on_store(): void
    {
        $user = $this->userWithRole('marketing_loo_input');
        $otherTenant = Tenant::create([
            'name' => 'Tenant Cabang Lain',
            'branch_id' => Branch::create(['code' => 'OTH', 'name' => 'Lain'])->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'Retail'])->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->post('/loos/store', [
                'branch_id' => $user->branch_id,
                'tenant_id' => $otherTenant->id,
            ])
            ->assertSessionHasErrors('tenant_id');
    }

    public function test_marketing_id_is_logged_in_user_on_store(): void
    {
        $user = $this->userWithRole('marketing_loo_input');

        $this->actingAs($user)
            ->post('/loos/store', ['branch_id' => $user->branch_id])
            ->assertRedirect();

        $this->assertSame($user->id, Loo::latest('id')->first()->marketing_id);
    }

    public function test_other_division_cannot_advance_legal_review(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);
        $accounting = $this->userWithRole('accounting_staff', ['loos.view', 'loos.transition', 'loos.accounting_submit']);

        $this->actingAs($accounting)
            ->post("/loos/{$loo->id}/transition", ['status' => 'accounting_review'])
            ->assertForbidden();

        $this->assertSame('legal_review', $loo->fresh()->status);
    }

    public function test_forward_blocked_until_section_submitted(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_submit']);

        // section legalitas belum diisi/disubmit sama sekali
        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/transition", ['status' => 'accounting_review'])
            ->assertStatus(422);

        $this->assertSame('legal_review', $loo->fresh()->status);
    }

    public function test_forward_blocked_until_all_stage_sections_submitted(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'tenant_mgmt_review', 'current_stage' => 'tenant_mgmt']);
        $tm = $this->userWithRole('tenant_mgmt_staff', ['loos.view', 'loos.transition', 'loos.tenant_mgmt_submit']);

        // baru manajemen_tenant disubmit, pre_fitout belum
        $loo->sections()->create([
            'section_key' => 'manajemen_tenant',
            'section_label' => 'Manajemen Tenant',
            'data' => [],
            'is_submitted' => true,
            'submitted_at' => now(),
            'filled_by' => $tm->id,
            'filled_at' => now(),
        ]);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/transition", ['status' => 'measurement'])
            ->assertStatus(422);

        $loo->sections()->create([
            'section_key' => 'pre_fitout',
            'section_label' => 'Pre-Fitout',
            'data' => [],
            'is_submitted' => true,
            'submitted_at' => now(),
            'filled_by' => $tm->id,
            'filled_at' => now(),
        ]);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/transition", ['status' => 'measurement'])
            ->assertRedirect();

        $this->assertSame('measurement', $loo->fresh()->status);
    }

    public function test_cancel_only_by_uploader_or_admin(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition']);

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/transition", ['status' => 'cancelled', 'cancel_reason' => 'salah'])
            ->assertForbidden();

        $this->assertSame('draft', $loo->fresh()->status);

        $this->actingAs($loo->marketing)
            ->post("/loos/{$loo->id}/transition", ['status' => 'cancelled', 'cancel_reason' => 'dibatalkan marketing'])
            ->assertRedirect();

        $this->assertSame('cancelled', $loo->fresh()->status);
    }

    public function test_show_transitions_only_for_own_division(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'legal_review', 'current_stage' => 'legal']);

        $accounting = $this->userWithRole('accounting_staff', ['loos.view', 'loos.transition', 'loos.accounting_submit']);
        $legal = $this->userWithRole('legal_staff', ['loos.view', 'loos.transition', 'loos.legal_submit']);

        $this->actingAs($accounting)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('transitions', []));

        // section legalitas belum disubmit → hanya mundur (draft) yang tampil
        $this->actingAs($legal)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('transitions', 1)
                ->where('transitions.0.value', 'draft'));

        $loo->sections()->create([
            'section_key' => 'legalitas',
            'section_label' => 'Legalitas',
            'data' => [],
            'is_submitted' => true,
            'submitted_at' => now(),
            'filled_by' => $legal->id,
            'filled_at' => now(),
        ]);

        $this->actingAs($legal)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('transitions', 2));
    }

    public function test_file_access_cover_only_roles_and_full_access(): void
    {
        Storage::fake('local');

        $loo = $this->makeLoo();
        $cover = UploadedFile::fake()->create('cover.pdf', 5, 'application/pdf')->store('loos/cover', 'local');
        $isi = UploadedFile::fake()->create('isi.pdf', 5, 'application/pdf')->store('loos/isi', 'local');
        $loo->update(['cover_file_path' => $cover, 'isi_file_path' => $isi]);

        $tenancy = $this->userWithRole('tenancy_staff');
        $tenantMgmt = $this->userWithRole('tenant_mgmt_staff');
        $legal = $this->userWithRole('legal_staff');
        $marketing = $this->userWithRole('marketing_loo_input');

        // cover terbuka untuk semua pemilik loos.view
        $this->actingAs($tenancy)->get("/loos/{$loo->id}/files/cover_file")->assertOk();

        // isi ditutup untuk tenancy + tenant_mgmt
        $this->actingAs($tenancy)->get("/loos/{$loo->id}/files/isi_file")->assertForbidden();
        $this->actingAs($tenantMgmt)->get("/loos/{$loo->id}/files/isi_file")->assertForbidden();

        // isi terbuka untuk legal + marketing
        $this->actingAs($legal)->get("/loos/{$loo->id}/files/isi_file")->assertOk();
        $this->actingAs($marketing)->get("/loos/{$loo->id}/files/isi_file")->assertOk();

        // key tidak dikenal → 404
        $this->actingAs($legal)->get("/loos/{$loo->id}/files/tidak_ada")->assertNotFound();

        // props files: tenancy hanya menerima cover, URL relatif (bukan APP_URL absolut)
        $this->actingAs($tenancy)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('files', 1)
                ->where('files.0.key', 'cover_file')
                ->where('files.0.type', 'pdf')
                ->where('files.0.url', "/loos/{$loo->id}/files/cover_file"));
    }

    public function test_creating_loo_notifies_viewers_same_branch_and_all_branch_roles(): void
    {
        Permission::firstOrCreate(['name' => 'loos.view', 'guard_name' => 'web']);

        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $otherBranch = Branch::firstOrCreate(['code' => 'OTH'], ['name' => 'Cabang Lain']);

        $creator = $this->userWithRole('marketing_loo_input');
        $legalSame = $this->userWithRole('legal_staff', ['loos.view']);
        $legalOther = $this->userOnBranch('legal_staff', $otherBranch->id, ['loos.view']);
        $managerOther = $this->userOnBranch('manager', $otherBranch->id, ['loos.view']);
        $superOther = $this->userOnBranch('super_admin', $otherBranch->id, []);

        $this->actingAs($creator)->post('/loos/store', [
            'branch_id' => $branch->id,
            'prospective_tenant_name' => 'Toko Baru',
        ])->assertRedirect();

        $this->assertDatabaseHas('notifications', ['notifiable_id' => $legalSame->id, 'notifiable_type' => User::class]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $managerOther->id, 'notifiable_type' => User::class]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $superOther->id, 'notifiable_type' => User::class]);
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $legalOther->id]);
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $creator->id]);
    }

    private function userOnBranch(string $roleName, int $branchId, array $permissions): User
    {
        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Test '.$roleName.' other',
            'email' => $roleName.'-'.uniqid().'@t.id',
            'employee_number' => 'T-'.uniqid(),
            'branch_id' => $branchId,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }
}
