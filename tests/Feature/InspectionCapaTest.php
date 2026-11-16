<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistSection;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionAnswer;
use App\Models\InspectionFinding;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionFindingService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class InspectionCapaTest extends TestCase
{
    use RefreshDatabase;

    private function seedSidakContext(): array
    {
        $this->seed(PermissionSeeder::class);

        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $otherBranch = Branch::create(['name' => 'Cabang Lain', 'code' => 'LIN']);
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        $tenant = Tenant::create(['name' => 'Kopi Jaya', 'branch_id' => $branch->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);

        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);
        $section = ChecklistSection::create(['checklist_template_id' => $template->id, 'name' => 'Keamanan', 'order' => 1]);
        $itemNeg = ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'APAR Tersedia',
            'type' => 'binary_choice',
            'option_positive' => 'Ada',
            'option_negative' => 'Tidak Ada',
            'photo_required_on_negative' => false,
            'order' => 1,
        ]);
        $itemPos = ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'Lantai Bersih',
            'type' => 'binary_choice',
            'option_positive' => 'Ya',
            'option_negative' => 'Tidak',
            'photo_required_on_negative' => false,
            'order' => 2,
        ]);

        $staff = User::create([
            'name' => 'Inspector',
            'email' => 'insp@test.id',
            'employee_number' => 'INSP-1',
            'branch_id' => $branch->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $staff->assignRole('tenancy_staff');

        $otherStaff = User::create([
            'name' => 'Staff Cabang Lain',
            'email' => 'other@test.id',
            'employee_number' => 'OTH-1',
            'branch_id' => $otherBranch->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $otherStaff->assignRole('tenancy_staff');

        return compact('branch', 'otherBranch', 'tenant', 'template', 'itemNeg', 'itemPos', 'staff', 'otherStaff', 'unit');
    }

    public function test_menyelesaikan_inspeksi_otomatis_membuat_temuan_capa_hanya_untuk_jawaban_negatif(): void
    {
        $ctx = $this->seedSidakContext();
        $session = InspectionSession::create(['branch_id' => $ctx['branch']->id, 'user_id' => $ctx['staff']->id, 'started_at' => now(), 'status' => 'in_progress']);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $ctx['tenant']->id,
            'checklist_template_id' => $ctx['template']->id,
            'checklist_snapshot' => $ctx['template']->toSnapshotArray($ctx['tenant']),
            'status' => 'draft',
        ]);

        InspectionAnswer::create([
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $ctx['itemNeg']->id,
            'value' => 'Tidak Ada',
            'note' => 'APAR kadaluarsa',
        ]);
        InspectionAnswer::create([
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $ctx['itemPos']->id,
            'value' => 'Ya',
        ]);

        $this->actingAs($ctx['staff'])
            ->post("/inspections/{$inspection->id}/complete")
            ->assertRedirect();

        $this->assertDatabaseCount('inspection_findings', 1);
        $finding = InspectionFinding::first();
        $this->assertSame($ctx['itemNeg']->id, $finding->checklist_item_id);
        $this->assertSame('open', $finding->status);
        $this->assertSame('minor', $finding->severity);
        $this->assertSame('APAR kadaluarsa', $finding->finding_note);
        $this->assertNotNull($finding->due_date);
    }

    public function test_mengubah_jawaban_negatif_menjadi_positif_membersihkan_temuan_open(): void
    {
        $ctx = $this->seedSidakContext();
        $session = InspectionSession::create(['branch_id' => $ctx['branch']->id, 'user_id' => $ctx['staff']->id, 'started_at' => now(), 'status' => 'in_progress']);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $ctx['tenant']->id,
            'checklist_template_id' => $ctx['template']->id,
            'checklist_snapshot' => $ctx['template']->toSnapshotArray($ctx['tenant']),
            'status' => 'draft',
        ]);

        $answer = InspectionAnswer::create([
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $ctx['itemNeg']->id,
            'value' => 'Tidak Ada',
        ]);

        $this->actingAs($ctx['staff'])->post("/inspections/{$inspection->id}/complete");
        $this->assertDatabaseCount('inspection_findings', 1);

        $answer->update(['value' => 'Ada']);
        $this->actingAs($ctx['staff'])->post("/inspection-sessions/{$session->id}/complete");

        $this->assertDatabaseCount('inspection_findings', 0);
    }

    public function test_alur_lengkap_capa_dari_publik_qr_hingga_verifikasi_staff(): void
    {
        Storage::fake('public');
        $ctx = $this->seedSidakContext();

        $session = InspectionSession::create(['branch_id' => $ctx['branch']->id, 'user_id' => $ctx['staff']->id, 'started_at' => now(), 'status' => 'completed']);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $ctx['tenant']->id,
            'checklist_template_id' => $ctx['template']->id,
            'checklist_snapshot' => $ctx['template']->toSnapshotArray($ctx['tenant']),
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        InspectionAnswer::create([
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $ctx['itemNeg']->id,
            'value' => 'Tidak Ada',
        ]);
        app(InspectionFindingService::class)->syncFromInspection($inspection);

        $finding = InspectionFinding::firstOrFail();
        $token = ScannableCode::create([
            'token' => (string) Str::uuid(),
            'scannable_type' => Inspection::class,
            'scannable_id' => $inspection->id,
        ])->token;

        // 1. Staff atur severity, tenggat, instruksi
        $this->actingAs($ctx['staff'])
            ->patch("/inspection-findings/{$finding->id}", [
                'severity' => 'critical',
                'due_date' => now()->addDays(3)->toDateString(),
                'action_required' => 'Pasang APAR baru 3kg',
            ])
            ->assertRedirect();

        $this->assertSame('critical', $finding->fresh()->severity);
        $this->assertSame('Pasang APAR baru 3kg', $finding->fresh()->action_required);

        // 2. Staff cabang lain ditolak 403
        $this->actingAs($ctx['otherStaff'])
            ->post("/inspection-findings/{$finding->id}/verify")
            ->assertForbidden();

        // 3. Publik (tenant tanpa login) mengirim bukti perbaikan
        $this->post("/scan/{$token}/findings/{$finding->id}/submit", [
            'resolved_by_name' => 'Budi (Store Mgr)',
            'resolution_note' => 'APAR baru sudah dipasang di dekat kasir.',
            'photo' => UploadedFile::fake()->image('apar-baru.jpg'),
        ])->assertRedirect();

        $finding->refresh();
        $this->assertSame('submitted', $finding->status);
        $this->assertSame('Budi (Store Mgr)', $finding->resolved_by_name);
        $this->assertNotNull($finding->resolution_photo_path);
        Storage::disk('public')->assertExists($finding->resolution_photo_path);

        // 4. Staff menolak dulu -> status menjadi rejected
        $this->actingAs($ctx['staff'])
            ->post("/inspection-findings/{$finding->id}/reject", [
                'verification_note' => 'Foto belum menunjukkan segel APAR.',
            ])
            ->assertRedirect();
        $this->assertSame('rejected', $finding->fresh()->status);

        // 5. Publik kirim ulang setelah rejected
        $this->post("/scan/{$token}/findings/{$finding->id}/submit", [
            'resolved_by_name' => 'Budi',
            'resolution_note' => 'Foto segel APAR terpasang.',
            'photo' => UploadedFile::fake()->image('apar-segel.jpg'),
        ])->assertRedirect();
        $this->assertSame('submitted', $finding->fresh()->status);

        // 6. Staff memverifikasi -> status menjadi verified
        $this->actingAs($ctx['staff'])
            ->post("/inspection-findings/{$finding->id}/verify", [
                'verification_note' => 'Sesuai standar.',
            ])
            ->assertRedirect();
        $this->assertSame('verified', $finding->fresh()->status);

        // 7. Publik tidak dapat menimpa temuan yang sudah verified
        $this->post("/scan/{$token}/findings/{$finding->id}/submit", [
            'resolved_by_name' => 'Anon',
            'resolution_note' => 'Spam',
            'photo' => UploadedFile::fake()->image('spam.jpg'),
        ])->assertSessionHasErrors('finding');
    }

    public function test_hub_capa_dan_deteksi_temuan_berulang(): void
    {
        $ctx = $this->seedSidakContext();

        foreach ([1, 2] as $idx) {
            $session = InspectionSession::create([
                'branch_id' => $ctx['branch']->id,
                'user_id' => $ctx['staff']->id,
                'started_at' => now()->subDays($idx),
                'status' => 'completed',
            ]);
            $inspection = Inspection::create([
                'inspection_session_id' => $session->id,
                'tenant_id' => $ctx['tenant']->id,
                'checklist_template_id' => $ctx['template']->id,
                'checklist_snapshot' => $ctx['template']->toSnapshotArray($ctx['tenant']),
                'status' => 'completed',
                'completed_at' => now()->subDays($idx),
            ]);
            InspectionAnswer::create([
                'inspection_id' => $inspection->id,
                'checklist_item_id' => $ctx['itemNeg']->id,
                'value' => 'Tidak Ada',
            ]);
            app(InspectionFindingService::class)->syncFromInspection($inspection);
        }

        $this->actingAs($ctx['staff'])
            ->get('/inspection-findings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('InspectionFindings/Index')
                ->where('summary.total', 2)
                ->where('summary.open', 2)
            );

        $this->actingAs($ctx['staff'])
            ->get("/tenant-profiles/{$ctx['tenant']->id}/detail")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('TenantProfiles/Show')
                ->has('findings', 2)
                ->where('findings.0.repeat_count', 2)
            );
    }

    public function test_mobile_api_complete_membuat_capa_dan_show_mengembalikan_findings(): void
    {
        $ctx = $this->seedSidakContext();
        $session = InspectionSession::create(['branch_id' => $ctx['branch']->id, 'user_id' => $ctx['staff']->id, 'started_at' => now(), 'status' => 'in_progress']);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $ctx['tenant']->id,
            'checklist_template_id' => $ctx['template']->id,
            'checklist_snapshot' => $ctx['template']->toSnapshotArray($ctx['tenant']),
            'status' => 'draft',
        ]);
        InspectionAnswer::create([
            'inspection_id' => $inspection->id,
            'checklist_item_id' => $ctx['itemNeg']->id,
            'value' => 'Tidak Ada',
        ]);

        $token = $ctx['staff']->createToken('mobile-test')->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/v1/inspections/{$inspection->id}/complete")
            ->assertOk();

        $this->assertDatabaseCount('inspection_findings', 1);

        $this->withToken($token)
            ->getJson("/api/v1/inspections/{$inspection->id}")
            ->assertOk()
            ->assertJsonCount(1, 'findings')
            ->assertJsonPath('findings.0.item_label', 'APAR Tersedia');
    }
}
