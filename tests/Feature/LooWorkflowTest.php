<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
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
        // Route isi section & approve ada di grup middleware `loos.transition`,
        // jadi tiap editor perlu permission itu di samping permission divisinya.
        $permissions = array_values(array_unique([...$permissions, 'loos.transition']));

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
            'marketing_id' => $this->userWithRole('marketing')->id,
            'tenant_category_id' => $cat->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    /** Buat section yang sudah disubmit langsung (melewati alur HTTP). */
    private function seedSubmitted(Loo $loo, string $key, array $data = [], ?User $actor = null): void
    {
        $actor ??= User::find($loo->marketing_id);

        $loo->sections()->updateOrCreate(
            ['section_key' => $key],
            [
                'section_label' => config("loo_sections.{$key}.label", $key),
                'data' => $data,
                'is_submitted' => true,
                'submitted_at' => now(),
                'filled_by' => $actor->id,
                'filled_at' => now(),
            ]
        );
    }

    private function submitDivisions(Loo $loo, ?User $actor = null): void
    {
        foreach (['legalitas', 'biaya_termin', 'manajemen_tenant'] as $key) {
            $this->seedSubmitted($loo, $key, [], $actor);
        }
    }

    /** Lengkapi fase sebelum $phase supaya fase itu terbuka. */
    private function reachPhase(Loo $loo, string $phase, ?User $actor = null): void
    {
        $order = [
            'pengukuran_ulang' => ['legalitas', 'biaya_termin', 'manajemen_tenant'],
            'sebelum_fitout' => ['legalitas', 'biaya_termin', 'manajemen_tenant', 'pre_handover'],
            'setelah_fitout' => ['legalitas', 'biaya_termin', 'manajemen_tenant', 'pre_handover', 'fitout_checklist_pre'],
        ];

        foreach ($order[$phase] ?? [] as $key) {
            $this->seedSubmitted($loo, $key, [], $actor);
        }
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

    public function test_stage_mapping_follows_pipeline_status(): void
    {
        $this->assertSame('marketing', Loo::getStageFromStatus('draft'));
        $this->assertSame('marketing', Loo::getStageFromStatus('pengisian_divisi'));
        $this->assertSame('pre_handover', Loo::getStageFromStatus('pengukuran_ulang'));
        $this->assertSame('ba_handover', Loo::getStageFromStatus('sebelum_fitout'));
        $this->assertSame('fitout', Loo::getStageFromStatus('setelah_fitout'));
        $this->assertSame('completed', Loo::getStageFromStatus('completed'));
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
        $marketing = $this->userWithRole('marketing');

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
        $other->assignRole('marketing');

        $this->actingAs($other)->get("/loos/{$loo->id}")->assertForbidden();
    }

    public function test_transition_only_allows_cancel(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing');

        // Status tidak lagi bisa diubah manual ke fase mana pun.
        $this->actingAs($user)
            ->from("/loos/{$loo->id}")
            ->post("/loos/{$loo->id}/transition", ['status' => 'sebelum_fitout'])
            ->assertSessionHasErrors('status');

        $this->assertSame('draft', $loo->fresh()->status);
    }

    public function test_status_follows_section_filling_and_logs_history(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);

        $this->actingAs($legal)->post("/loos/{$loo->id}/sections/legalitas", [
            'entity_name' => 'PT Contoh Sengkala',
            'entity_type' => 'PT',
            'submit' => '1',
        ])->assertRedirect();

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'legalitas',
            'is_submitted' => true,
        ]);

        // Belum semua divisi → masih fase pengisian divisi.
        $fresh = $loo->fresh();
        $this->assertSame('pengisian_divisi', $fresh->status);
        $this->assertSame('marketing', $fresh->current_stage);
        $this->assertDatabaseHas('loo_histories', [
            'loo_id' => $loo->id,
            'action' => 'status_changed',
            'to_status' => 'pengisian_divisi',
        ]);
    }

    public function test_all_divisions_submitted_advances_to_pengukuran_ulang(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $acct = $this->userWithRole('accounting', ['loos.view', 'loos.accounting_edit']);
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);

        $this->actingAs($legal)->post("/loos/{$loo->id}/sections/legalitas", ['entity_name' => 'PT A', 'submit' => '1']);
        $this->actingAs($acct)->post("/loos/{$loo->id}/sections/biaya_termin", ['monthly_rent' => '5000000', 'submit' => '1']);
        $this->actingAs($tm)->post("/loos/{$loo->id}/sections/manajemen_tenant", ['brand_name' => 'Kopi', 'submit' => '1']);

        $this->assertSame('pengukuran_ulang', $loo->fresh()->status);
        $this->assertSame('pre_handover', $loo->fresh()->current_stage);
    }

    public function test_legal_uploads_documents_and_rejects_files_over_five_mb(): void
    {
        Storage::fake('public');
        $loo = $this->makeLoo();
        $loo->update(['status' => 'pengisian_divisi', 'current_stage' => 'marketing']);
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $this->assertTrue($legal->can('loos.legal_edit'));
        $this->assertSame($loo->branch_id, $legal->branch_id);

        $files = [
            'npwp' => UploadedFile::fake()->create('npwp.pdf', 10, 'application/pdf'),
            'nib' => UploadedFile::fake()->create('nib.jpg', 10, 'image/jpeg'),
            'sk_pendirian' => UploadedFile::fake()->create('sk.png', 10, 'image/png'),
            'akta_perubahan_terakhir' => UploadedFile::fake()->create('akta.pdf', 10, 'application/pdf'),
            'surat_kuasa' => UploadedFile::fake()->create('kuasa.pdf', 10, 'application/pdf'),
            'ktp' => UploadedFile::fake()->create('ktp.jpg', 10, 'image/jpeg'),
            'ktp_badan_hukum' => UploadedFile::fake()->create('ktp-badan-hukum.png', 10, 'image/png'),
        ];

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/legalitas", $files + [
                'entity_name' => 'PT Dokumen',
                'tgl_sk_pendirian' => '2020-01-15',
            ])
            ->assertRedirect();

        $data = $loo->sections()->where('section_key', 'legalitas')->first()->data;
        foreach (array_keys($files) as $key) {
            $this->assertStringStartsWith("loos/{$loo->id}/sections/", $data[$key]);
            Storage::disk('public')->assertExists($data[$key]);
        }

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/legalitas", [
                'npwp' => UploadedFile::fake()->create('too-large.pdf', 5121, 'application/pdf'),
            ])
            ->assertSessionHasErrors('npwp');
    }

    public function test_tenant_mgmt_section_saves_unit_and_category_to_loo(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'pengisian_divisi', 'current_stage' => 'marketing']);
        $user = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);

        $unit = Unit::create([
            'branch_id' => $loo->branch_id, 'floor' => 'GF', 'block' => 'A',
            'unit_number' => '001', 'unit_code' => 'GF-A-001', 'is_active' => true,
        ]);
        $category = TenantCategory::firstOrCreate(['name' => 'Anchor']);

        $this->actingAs($user)->post("/loos/{$loo->id}/sections/manajemen_tenant", [
            'brand_name' => 'Kopi Senja',
            'trade_name' => 'Senja Coffee',
            'unit_id' => $unit->id,
            'tenant_category_id' => $category->id,
        ])->assertRedirect();

        $loo->refresh();
        $this->assertSame($unit->id, $loo->unit_id);
        $this->assertSame($category->id, $loo->tenant_category_id);
    }

    public function test_tenant_mgmt_rejects_unit_from_other_branch(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'pengisian_divisi', 'current_stage' => 'marketing']);
        $user = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);

        $other = Branch::firstOrCreate(['code' => 'OTH'], ['name' => 'Cabang Lain']);
        $unit = Unit::create([
            'branch_id' => $other->id, 'floor' => 'GF', 'block' => 'A',
            'unit_number' => '001', 'unit_code' => 'GF-OTH-001', 'is_active' => true,
        ]);

        $this->actingAs($user)->post("/loos/{$loo->id}/sections/manajemen_tenant", [
            'brand_name' => 'Kopi Senja',
            'unit_id' => $unit->id,
        ])->assertStatus(422);

        $this->assertNull($loo->fresh()->unit_id);
    }

    public function test_units_endpoint_searches_units_of_loo_branch(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing');

        Unit::create([
            'branch_id' => $loo->branch_id, 'floor' => 'GF', 'block' => 'A',
            'unit_number' => '001', 'unit_code' => 'GF-A-001', 'is_active' => true,
        ]);
        $other = Branch::firstOrCreate(['code' => 'OTH'], ['name' => 'Cabang Lain']);
        Unit::create([
            'branch_id' => $other->id, 'floor' => 'GF', 'block' => 'A',
            'unit_number' => '002', 'unit_code' => 'GF-A-002', 'is_active' => true,
        ]);

        $this->actingAs($user)
            ->getJson("/loos/{$loo->id}/units?search=GF-A")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'GF-A-001']);
    }

    public function test_user_cannot_fill_section_without_permission(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/biaya_termin", ['monthly_rent' => '5000000'])
            ->assertForbidden();

        $this->assertDatabaseMissing('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'biaya_termin',
        ]);
    }

    public function test_division_sections_fillable_parallel_and_keep_status(): void
    {
        $loo = $this->makeLoo();
        $accounting = $this->userWithRole('accounting', ['loos.view', 'loos.accounting_edit']);

        // Semua divisi satu fase: accounting boleh isi walau legal belum.
        $this->actingAs($accounting)
            ->post("/loos/{$loo->id}/sections/biaya_termin", ['monthly_rent' => '5000000', 'submit' => '1'])
            ->assertRedirect();

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'biaya_termin',
            'is_submitted' => true,
        ]);
        $this->assertSame('pengisian_divisi', $loo->fresh()->status);
    }

    public function test_cannot_fill_section_when_loo_terminal(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['status' => 'cancelled', 'current_stage' => 'marketing']);

        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/legalitas", ['entity_name' => 'PT X', 'submit' => '1'])
            ->assertStatus(422);
    }

    public function test_save_draft_moves_status_to_pengisian_divisi(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);

        $this->actingAs($legal)->post("/loos/{$loo->id}/sections/legalitas", [
            'entity_name' => 'PT Draft Saja',
            'submit' => '0',
        ])->assertRedirect();

        $this->assertDatabaseHas('loo_sections', [
            'loo_id' => $loo->id,
            'section_key' => 'legalitas',
            'is_submitted' => false,
        ]);
        $this->assertSame('pengisian_divisi', $loo->fresh()->status);
    }

    public function test_unknown_section_key_returns_404(): void
    {
        $loo = $this->makeLoo();
        $user = $this->userWithRole('marketing');

        $this->actingAs($user)
            ->post("/loos/{$loo->id}/sections/tidak_ada", ['x' => 'y'])
            ->assertNotFound();
    }

    public function test_pengukuran_ulang_locked_until_all_divisions_submitted(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);

        // Divisi belum lengkap → Pengukuran Ulang terkunci.
        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/pre_handover", ['final_inspection_date' => '2026-10-01'])
            ->assertStatus(422);

        $this->submitDivisions($loo);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/pre_handover", ['final_inspection_date' => '2026-10-01', 'submit' => '1'])
            ->assertRedirect();

        $this->assertSame('sebelum_fitout', $loo->fresh()->status);
    }

    public function test_sebelum_fitout_locked_until_pengukuran_ulang_submitted(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->submitDivisions($loo);

        // Pengukuran Ulang baru draft → Sebelum Fitout terkunci.
        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/pre_handover", ['final_inspection_date' => '2026-10-01', 'submit' => '0'])
            ->assertRedirect();
        $this->assertSame('pengukuran_ulang', $loo->fresh()->status);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", ['submit' => '1'])
            ->assertStatus(422);

        // Setelah Pengukuran Ulang disubmit, baru terbuka.
        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/pre_handover", ['final_inspection_date' => '2026-10-01', 'submit' => '1'])
            ->assertRedirect();

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", ['submit' => '1'])
            ->assertRedirect();

        $this->assertSame('setelah_fitout', $loo->fresh()->status);
    }

    public function test_setelah_fitout_locked_until_sebelum_fitout_submitted(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->reachPhase($loo, 'sebelum_fitout', $tm);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", ['submit' => '1'])
            ->assertStatus(422);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", ['submit' => '1'])
            ->assertRedirect();

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", ['submit' => '1'])
            ->assertRedirect();

        $this->assertSame('setelah_fitout', $loo->fresh()->status);
    }

    public function test_gm_approval_after_setelah_fitout_completes_loo(): void
    {
        ProductCategory::firstOrCreate(['name' => 'Retail']);

        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $gm = $this->userWithRole('gm_approval', ['loos.view', 'loos.fitout_approve']);
        $this->reachPhase($loo, 'setelah_fitout', $tm);

        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", ['submit' => '1'])
            ->assertRedirect();
        $this->assertSame('setelah_fitout', $loo->fresh()->status);

        $this->actingAs($gm)
            ->post("/loos/{$loo->id}/fitout/approve")
            ->assertRedirect();

        $fresh = $loo->fresh();
        $this->assertSame('completed', $fresh->status);
        $this->assertNotNull($fresh->completed_at);
        $this->assertTrue((bool) $loo->sections()->where('section_key', 'fitout_checklist_post')->first()->data['checklist']['footer']['gm_approved']);
    }

    public function test_tenant_from_other_branch_rejected_on_store(): void
    {
        $user = $this->userWithRole('marketing');
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
        $user = $this->userWithRole('marketing');

        $this->actingAs($user)
            ->post('/loos/store', ['branch_id' => $user->branch_id])
            ->assertRedirect();

        $this->assertSame($user->id, Loo::latest('id')->first()->marketing_id);
    }

    public function test_cancel_only_by_uploader_or_admin(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.transition']);

        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/transition", ['status' => 'cancelled', 'cancel_reason' => 'salah'])
            ->assertForbidden();

        $this->assertSame('draft', $loo->fresh()->status);

        $this->actingAs($loo->marketing)
            ->post("/loos/{$loo->id}/transition", ['status' => 'cancelled', 'cancel_reason' => 'dibatalkan marketing'])
            ->assertRedirect();

        $this->assertSame('cancelled', $loo->fresh()->status);
    }

    public function test_show_exposes_progress_and_gates_editable_sections(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);

        // Fase awal: hanya divisi yang terbuka, checklist fitout terkunci.
        $this->actingAs($legal)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('progress.phases', 4)
                ->where('progress.status', 'draft')
                ->where('canEditSections', fn ($s) => $s->contains('legalitas')
                    && ! $s->contains('biaya_termin')
                    && ! $s->contains('fitout_checklist_pre')));

        // Setelah divisi + pengukuran ulang selesai: Sebelum Fitout terbuka.
        $this->reachPhase($loo, 'sebelum_fitout', $tm);

        $this->actingAs($tm)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('canEditSections', fn ($s) => $s->contains('fitout_checklist_pre')
                    && ! $s->contains('fitout_checklist_post')));
    }

    public function test_file_access_cover_only_roles_and_full_access(): void
    {
        Storage::fake('local');

        $loo = $this->makeLoo();
        $cover = UploadedFile::fake()->create('cover.pdf', 5, 'application/pdf')->store('loos/cover', 'local');
        $isi = UploadedFile::fake()->create('isi.pdf', 5, 'application/pdf')->store('loos/isi', 'local');
        $loo->update(['cover_file_path' => $cover, 'isi_file_path' => $isi]);

        $tenancy = $this->userWithRole('tenancy_staff');
        $tenantMgmt = $this->userWithRole('tenant_mgmt');
        $legal = $this->userWithRole('legal');
        $marketing = $this->userWithRole('marketing');

        $this->actingAs($tenancy)->get("/loos/{$loo->id}/files/cover_file")->assertOk();

        $this->actingAs($tenancy)->get("/loos/{$loo->id}/files/isi_file")->assertForbidden();
        $this->actingAs($tenantMgmt)->get("/loos/{$loo->id}/files/isi_file")->assertForbidden();

        $this->actingAs($legal)->get("/loos/{$loo->id}/files/isi_file")->assertOk();
        $this->actingAs($marketing)->get("/loos/{$loo->id}/files/isi_file")->assertOk();

        $this->actingAs($legal)->get("/loos/{$loo->id}/files/tidak_ada")->assertNotFound();

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

        $creator = $this->userWithRole('marketing');
        $legalSame = $this->userWithRole('legal', ['loos.view']);
        $legalOther = $this->userOnBranch('legal', $otherBranch->id, ['loos.view']);
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

    public function test_fitout_checklist_pre_config_scope(): void
    {
        $pre = config('loo_sections.fitout_checklist_pre.fields');
        $preChecklist = collect($pre)->firstWhere('type', 'checklist_table');

        $this->assertSame(['legal', 'finance', 'tenancy'], array_column($preChecklist['departments'], 'key'));
        $this->assertFalse($preChecklist['show_footer']);
        $this->assertEmpty(collect($pre)->whereIn('name', [
            'signature_engineering', 'signature_kontraktor', 'signature_tenant', 'signature_gm',
        ]));

        $post = config('loo_sections.fitout_checklist_post.fields');
        $postChecklist = collect($post)->firstWhere('type', 'checklist_table');

        $this->assertSame(['legal', 'finance', 'tenancy', 'engineering', 'kontraktor'], array_column($postChecklist['departments'], 'key'));
        $this->assertArrayNotHasKey('show_footer', $postChecklist);
        $this->assertNotEmpty(collect($post)->whereIn('name', ['signature_tenant', 'signature_gm']));

        $this->assertSame('Pengukuran Ulang', config('loo_sections.pre_handover.label'));
    }

    public function test_fitout_checklist_pre_saves_items_signature_and_restores_other_depts(): void
    {
        Storage::fake('public');

        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->reachPhase($loo, 'sebelum_fitout', $tm);

        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $finance = $this->userWithRole('accounting', ['loos.view', 'loos.accounting_edit']);

        // legal isi dept-nya + TTD legal (draft)
        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", [
                'checklist' => json_encode([
                    'legal' => [
                        'items' => [
                            'psm' => ['status' => 'Ok', 'keterangan' => 'diterima'],
                        ],
                        'signoff' => ['day' => 'Senin', 'date' => '2026-10-01', 'name' => 'Legal Satu'],
                    ],
                    'finance' => [
                        'items' => [
                            'dp_1' => ['status' => 'Pending', 'keterangan' => ''],
                        ],
                    ],
                    'footer' => ['date' => '2026-10-01', 'tenant_name' => 'Penyewa A', 'gm_name' => 'Deputy GM'],
                    'hantu' => ['items' => ['rahasia' => ['status' => 'Ok']]],
                    'engineering' => ['items' => ['megger' => ['status' => 'Ok']]],
                    'kontraktor' => ['items' => ['serah_terima' => ['status' => 'Ok']]],
                ]),
                'signature_legal' => UploadedFile::fake()->create('ttd.png', 5, 'image/png'),
                'signature_tenant' => UploadedFile::fake()->create('ttd-penyewa.png', 5, 'image/png'),
            ])
            ->assertRedirect();

        $section = $loo->sections()->where('section_key', 'fitout_checklist_pre')->first();
        $this->assertFalse($section->is_submitted);
        $this->assertSame('Ok', $section->data['checklist']['legal']['items']['psm']['status']);
        $this->assertNull($section->data['checklist']['finance']['items']['dp_1']['status']);
        $this->assertArrayNotHasKey('hantu', $section->data['checklist']);
        $this->assertArrayNotHasKey('engineering', $section->data['checklist']);
        $this->assertArrayNotHasKey('kontraktor', $section->data['checklist']);
        $this->assertArrayNotHasKey('footer', $section->data['checklist']);
        $this->assertArrayNotHasKey('signature_tenant', $section->data);
        $this->assertArrayNotHasKey('rahasia', $section->data['checklist']['legal']['items']);
        $this->assertSame('Senin', $section->data['checklist']['legal']['signoff']['day']);
        $this->assertArrayHasKey('dp_1', $section->data['checklist']['finance']['items']);
        $this->assertStringStartsWith('loos/', $section->data['signature_legal']);

        // finance isi dept-nya; data legal wajib utuh (merge, bukan timpa)
        $this->actingAs($finance)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", [
                'checklist' => json_encode([
                    'finance' => [
                        'items' => ['dp_1' => ['status' => 'Ok', 'keterangan' => 'lunas']],
                    ],
                ]),
            ])
            ->assertRedirect();

        $section = $loo->sections()->where('section_key', 'fitout_checklist_pre')->first();
        $this->assertSame('Ok', $section->data['checklist']['finance']['items']['dp_1']['status']);
        $this->assertSame('Ok', $section->data['checklist']['legal']['items']['psm']['status']);
        $this->assertArrayNotHasKey('footer', $section->data['checklist']);

        // tm submit (koordinator) → Sebelum Fitout selesai, maju ke Setelah Fitout
        $this->actingAs($tm)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", ['submit' => '1'])
            ->assertRedirect();

        $this->assertTrue($loo->sections()->where('section_key', 'fitout_checklist_pre')->first()->is_submitted);
        $this->assertSame('setelah_fitout', $loo->fresh()->status);
    }

    public function test_tab_visibility_and_tenant_readonly_preview(): void
    {
        $loo = $this->makeLoo();
        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit', 'loos.legal_submit']);
        $tenantMgmt = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit']);
        $admin = $this->userWithRole('admin', ['loos.view']);

        $this->actingAs($legal)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('visibleSectionKeys', ['legalitas', 'biaya_termin', 'manajemen_tenant'])
                ->where('canEditSections', fn ($s) => $s->contains('legalitas') && ! $s->contains('biaya_termin'))
                ->where('readOnlySections', []));

        // Tenant Mgmt: tab Accounting disembunyikan, tab Legal tampil read-only
        // (hanya 4 field badan hukum), Manajemen Tenant tetap bisa diisi.
        $this->actingAs($tenantMgmt)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('visibleSectionKeys', ['legalitas', 'manajemen_tenant'])
                ->where('canEditSections', fn ($s) => $s->contains('manajemen_tenant') && ! $s->contains('legalitas'))
                ->where('readOnlySections.legalitas', ['entity_name', 'entity_type', 'npwp', 'nib']));

        $this->actingAs($admin)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('visibleSectionKeys', ['legalitas', 'biaya_termin', 'manajemen_tenant'])
                ->where('readOnlySections', []));
    }

    public function test_tenant_role_legal_preview_is_read_only(): void
    {
        $loo = $this->makeLoo();
        $tenancy = $this->userWithRole('tenancy_staff', ['loos.view', 'loos.tenant_mgmt_edit', 'loos.tenant_mgmt_submit']);

        $this->actingAs($tenancy)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('visibleSectionKeys', ['legalitas', 'manajemen_tenant'])
                ->where('readOnlySections.legalitas', ['entity_name', 'entity_type', 'npwp', 'nib']));

        // Preview hanya untuk dilihat — server tetap menolak menulis Legal.
        $this->actingAs($tenancy)
            ->post("/loos/{$loo->id}/sections/legalitas", ['entity_name' => 'PT X'])
            ->assertForbidden();
    }

    public function test_fitout_department_edit_restricted_per_role(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->reachPhase($loo, 'setelah_fitout', $tm);

        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $eng = $this->userWithRole('engineering_staff', ['loos.view', 'loos.engineering_edit']);

        // legal isi dept sendiri → ok
        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", [
                'checklist' => json_encode([
                    'legal' => ['items' => ['psm' => ['status' => 'Ok', 'keterangan' => 'ok']]],
                ]),
            ])
            ->assertRedirect();

        $section = $loo->sections()->where('section_key', 'fitout_checklist_post')->first();
        $this->assertSame('Ok', $section->data['checklist']['legal']['items']['psm']['status']);

        // legal ubah dept finance → 403
        $this->actingAs($legal)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", [
                'checklist' => json_encode([
                    'finance' => ['items' => ['dp_1' => ['status' => 'Ok']]],
                ]),
            ])
            ->assertForbidden();

        // engineering isi dept sendiri → ok, data legal tetap utuh
        $this->actingAs($eng)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", [
                'checklist' => json_encode([
                    'engineering' => ['items' => ['megger' => ['status' => 'Ok']]],
                ]),
            ])
            ->assertRedirect();

        $section = $loo->sections()->where('section_key', 'fitout_checklist_post')->first();
        $this->assertSame('Ok', $section->data['checklist']['engineering']['items']['megger']['status']);
        $this->assertSame('Ok', $section->data['checklist']['legal']['items']['psm']['status']);

        // engineering ubah dept legal → 403
        $this->actingAs($eng)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", [
                'checklist' => json_encode([
                    'legal' => ['items' => ['psm' => ['status' => 'Tidak']]],
                ]),
            ])
            ->assertForbidden();

        $this->actingAs($eng)->get('/fitout-checklists')->assertOk();
    }

    public function test_fitout_page_exposes_editable_departments_per_role(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->reachPhase($loo, 'setelah_fitout', $tm);

        $legal = $this->userWithRole('legal', ['loos.view', 'loos.legal_edit']);
        $viewer = $this->userWithRole('viewer_only', ['loos.view']);

        $this->actingAs($legal)->get("/loos/{$loo->id}/fitout")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Loos/FitoutChecklist')
                ->where('editableDepartments', ['legal'])
                ->where('canEditPost', true));

        $this->actingAs($viewer)->get("/loos/{$loo->id}/fitout")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('editableDepartments', [])
                ->where('canEditPost', false)
                ->where('canEditPre', false));
    }

    public function test_tenancy_and_engineering_staff_can_save_own_dept(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit']);
        $this->reachPhase($loo, 'sebelum_fitout', $tm);

        $tenancy = $this->userWithRole('tenancy_staff', ['loos.view', 'loos.tenant_mgmt_edit']);

        $this->actingAs($tenancy)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_pre", [
                'checklist' => json_encode(['tenancy' => ['items' => ['lantai' => ['status' => 'Ok']]]]),
            ])
            ->assertRedirect();

        $this->assertSame('Ok', $loo->sections()->where('section_key', 'fitout_checklist_pre')->first()
            ->data['checklist']['tenancy']['items']['lantai']['status']);

        // Sekarang buka Setelah Fitout untuk engineering.
        $this->seedSubmitted($loo, 'fitout_checklist_pre', [], $tm);
        $eng = $this->userWithRole('engineering_staff', ['loos.view', 'loos.engineering_edit']);

        $this->actingAs($eng)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", [
                'checklist' => json_encode(['engineering' => ['items' => ['megger' => ['status' => 'Ok']]]]),
            ])
            ->assertRedirect();

        $this->assertSame('Ok', $loo->sections()->where('section_key', 'fitout_checklist_post')->first()
            ->data['checklist']['engineering']['items']['megger']['status']);
    }

    public function test_fitout_checklist_hub_index_and_gm_approve(): void
    {
        ProductCategory::firstOrCreate(['name' => 'Retail']);

        $loo = $this->makeLoo();
        $user = $this->userWithRole('tenant_mgmt', ['loos.view', 'loos.tenant_mgmt_edit', 'loos.fitout_approve']);
        $this->reachPhase($loo, 'setelah_fitout', $user);

        $this->actingAs($user)
            ->get('/fitout-checklists')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Loos/Fitout/Index')
                ->has('loos.data', 1)
                ->where('loos.data.0.loo_number', $loo->loo_number)
            );

        $this->actingAs($user)
            ->get("/loos/{$loo->id}/fitout")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Loos/FitoutChecklist')
                ->where('loo.id', $loo->id)
            );

        // Approve butuh checklist Setelah Fitout sudah disubmit.
        $this->actingAs($user)
            ->post("/loos/{$loo->id}/sections/fitout_checklist_post", ['submit' => '1'])
            ->assertRedirect();

        $this->actingAs($user)
            ->post("/loos/{$loo->id}/fitout/approve")
            ->assertRedirect();

        $postSection = $loo->sections()->where('section_key', 'fitout_checklist_post')->first();
        $this->assertTrue($postSection->data['checklist']['footer']['gm_approved']);
        $this->assertSame($user->name, $postSection->data['checklist']['footer']['gm_name']);
    }

    public function test_store_saves_attachments_with_description(): void
    {
        Storage::fake('local');

        $user = $this->userWithRole('marketing');

        $this->actingAs($user)
            ->post('/loos/store', [
                'branch_id' => $user->branch_id,
                'prospective_tenant_name' => 'Toko Baru',
                'attachments' => [
                    ['description' => 'NPWP', 'file' => UploadedFile::fake()->create('npwp.pdf', 5, 'application/pdf')],
                    ['description' => null, 'file' => UploadedFile::fake()->create('denah.png', 5, 'image/png')],
                ],
            ])
            ->assertRedirect();

        $loo = Loo::latest('id')->first();

        $this->assertSame(2, $loo->attachments()->count());
        $this->assertDatabaseHas('loo_attachments', [
            'loo_id' => $loo->id,
            'description' => 'NPWP',
            'original_name' => 'npwp.pdf',
            'uploaded_by' => $user->id,
        ]);
        $this->assertDatabaseHas('loo_attachments', [
            'loo_id' => $loo->id,
            'description' => null,
            'original_name' => 'denah.png',
        ]);
    }

    public function test_update_adds_updates_and_removes_attachments(): void
    {
        Storage::fake('local');

        $user = $this->userWithRole('marketing');
        $loo = $this->makeLoo();

        $keepPath = UploadedFile::fake()->create('keep.pdf', 5, 'application/pdf')
            ->store("loos/{$loo->id}/attachments", 'local');
        $keep = $loo->attachments()->create([
            'path' => $keepPath,
            'original_name' => 'keep.pdf',
            'description' => 'Lama',
            'uploaded_by' => $user->id,
        ]);

        $dropPath = UploadedFile::fake()->create('drop.pdf', 5, 'application/pdf')
            ->store("loos/{$loo->id}/attachments", 'local');
        $drop = $loo->attachments()->create([
            'path' => $dropPath,
            'original_name' => 'drop.pdf',
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->post("/loos/{$loo->id}", [
                'branch_id' => $loo->branch_id,
                'attachments' => [
                    ['id' => $keep->id, 'description' => 'Keterangan Baru'],
                    ['description' => 'Baru', 'file' => UploadedFile::fake()->create('baru.pdf', 5, 'application/pdf')],
                ],
                'removed_attachments' => [$drop->id],
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('loo_attachments', ['id' => $drop->id]);
        $this->assertSame('Keterangan Baru', $keep->fresh()->description);
        $this->assertSame(2, $loo->attachments()->count());
        Storage::disk('local')->assertMissing($dropPath);
        $this->assertDatabaseHas('loo_attachments', [
            'loo_id' => $loo->id,
            'description' => 'Baru',
            'original_name' => 'baru.pdf',
        ]);
    }

    public function test_cover_only_roles_cannot_open_attachments(): void
    {
        Storage::fake('local');

        $loo = $this->makeLoo();
        $path = UploadedFile::fake()->create('npwp.pdf', 5, 'application/pdf')
            ->store("loos/{$loo->id}/attachments", 'local');
        $attachment = $loo->attachments()->create([
            'path' => $path,
            'original_name' => 'npwp.pdf',
            'mime' => 'application/pdf',
            'uploaded_by' => $loo->marketing_id,
        ]);

        $tenancy = $this->userWithRole('tenancy_staff');
        $tenantMgmt = $this->userWithRole('tenant_mgmt');
        $legal = $this->userWithRole('legal');

        $this->actingAs($tenancy)->get("/loos/{$loo->id}/attachments/{$attachment->id}")->assertForbidden();
        $this->actingAs($tenantMgmt)->get("/loos/{$loo->id}/attachments/{$attachment->id}")->assertForbidden();
        $this->actingAs($legal)->get("/loos/{$loo->id}/attachments/{$attachment->id}")->assertOk();

        // Prop attachments disembunyikan dari role cover-only.
        $this->actingAs($tenancy)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('attachments', 0));

        $this->actingAs($legal)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('attachments', 1)
                ->where('attachments.0.label', 'npwp.pdf'));
    }

    public function test_attachment_validation_uses_indonesian_message(): void
    {
        Storage::fake('local');

        $user = $this->userWithRole('marketing');

        $this->actingAs($user)
            ->post('/loos/store', [
                'branch_id' => $user->branch_id,
                'attachments' => [
                    ['description' => 'Salah tipe', 'file' => UploadedFile::fake()->create('catatan.txt', 5, 'text/plain')],
                ],
            ])
            ->assertSessionHasErrors(['attachments.0.file' => 'Dokumen pendukung harus berupa PDF, JPG, atau PNG.']);
    }

    public function test_edit_page_exposes_attachment_size_type_and_url(): void
    {
        Storage::fake('local');

        $user = $this->userWithRole('marketing');
        $loo = $this->makeLoo();

        $path = UploadedFile::fake()->create('denah.png', 7, 'image/png')
            ->store("loos/{$loo->id}/attachments", 'local');
        $attachment = $loo->attachments()->create([
            'path' => $path,
            'original_name' => 'denah.png',
            'mime' => 'image/png',
            'size' => 7168,
            'description' => 'Denah',
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->get("/loos/{$loo->id}/edit")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Loos/Create')
                ->has('attachments', 1)
                ->where('attachments.0.description', 'Denah')
                ->where('attachments.0.size', 7168)
                ->where('attachments.0.type', 'image')
                ->where('attachments.0.url', "/loos/{$loo->id}/attachments/{$attachment->id}"));
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