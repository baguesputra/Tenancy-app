<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistSection;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionAnswer;
use App\Models\InspectionSession;
use App\Models\Loo;
use App\Models\LooSection;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionFindingService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ExportReportsTest extends TestCase
{
    use RefreshDatabase;

    private function seedBasics(): array
    {
        $this->seed(PermissionSeeder::class);

        $branchA = Branch::create(['name' => 'Cabang A', 'code' => 'CBA']);
        $branchB = Branch::create(['name' => 'Cabang B', 'code' => 'CBB']);
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'Fashion']);

        $unitA = Unit::create(['branch_id' => $branchA->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        $unitB = Unit::create(['branch_id' => $branchB->id, 'floor' => '1F', 'unit_number' => '02', 'unit_code' => '1F-02', 'is_active' => true]);

        $tenantA = Tenant::create(['name' => 'Toko Alpha', 'branch_id' => $branchA->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);
        $tenantB = Tenant::create(['name' => 'Toko Beta', 'branch_id' => $branchB->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);

        Tenancy::create([
            'unit_id' => $unitA->id,
            'tenant_id' => $tenantA->id,
            'contract_number' => 'CTR-A-001',
            'status' => 'active',
            'start_date' => now()->subMonths(6)->toDateString(),
            'end_date' => now()->addDays(20)->toDateString(),
            'rent_value' => 15000000,
        ]);

        Tenancy::create([
            'unit_id' => $unitB->id,
            'tenant_id' => $tenantB->id,
            'contract_number' => 'CTR-B-001',
            'status' => 'active',
            'start_date' => now()->subMonths(6)->toDateString(),
            'end_date' => now()->addDays(200)->toDateString(),
            'rent_value' => 25000000,
        ]);

        return compact('branchA', 'branchB', 'tc', 'pc', 'unitA', 'unitB', 'tenantA', 'tenantB');
    }

    private function loadSpreadsheet($response)
    {
        $file = $response->getFile();

        return IOFactory::load($file->getPathname());
    }

    public function test_staff_tanpa_permission_ditolak_semua_export(): void
    {
        $basics = $this->seedBasics();
        $staff = User::create([
            'name' => 'Staff Polos',
            'email' => 'polos@test.id',
            'employee_number' => 'EMP-00',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $staff->assignRole('staff');

        $this->actingAs($staff)->get('/permit-requests/export')->assertForbidden();
        $this->actingAs($staff)->get('/inspection-sessions/export')->assertForbidden();
        $this->actingAs($staff)->get('/loos/export')->assertForbidden();
        $this->actingAs($staff)->get('/tenancies/export')->assertForbidden();
    }

    public function test_export_permit_requests_menghormati_visibilitas_marketing(): void
    {
        $basics = $this->seedBasics();

        $marketing = User::create([
            'name' => 'Marketing',
            'email' => 'mkt@test.id',
            'employee_number' => 'MKT-1',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $marketing->assignRole('marketing');

        PermitRequest::create([
            'permit_number' => 'IZN-PAMERAN-1',
            'activity_types' => ['pameran'],
            'request_date' => now()->toDateString(),
            'tenant_id' => $basics['tenantA']->id,
            'branch_id' => $basics['branchA']->id,
            'store_name_snapshot' => 'Booth Pameran Alpha',
            'requested_by_type' => User::class,
            'requested_by_id' => $marketing->id,
            'barcode_token' => (string) Str::uuid(),
            'status' => 'pending',
        ]);

        PermitRequest::create([
            'permit_number' => 'IZN-KERJA-1',
            'activity_types' => ['kerja'],
            'request_date' => now()->toDateString(),
            'tenant_id' => $basics['tenantA']->id,
            'branch_id' => $basics['branchA']->id,
            'store_name_snapshot' => 'Toko Kerja Alpha',
            'requested_by_type' => User::class,
            'requested_by_id' => $marketing->id,
            'barcode_token' => (string) Str::uuid(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($marketing)->get('/permit-requests/export');
        $response->assertOk();

        $sheet = $this->loadSpreadsheet($response)->getActiveSheet();
        $rows = $sheet->toArray();

        $this->assertCount(2, $rows); // 1 header + 1 pameran
        $this->assertSame('IZN-PAMERAN-1', $rows[1][0]);
    }

    public function test_export_sidak_menghasilkan_dua_sheet_dan_sesuai_branch(): void
    {
        $basics = $this->seedBasics();

        $tenancy = User::create([
            'name' => 'Tenancy A',
            'email' => 'tenancy@test.id',
            'employee_number' => 'TEN-1',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $tenancy->assignRole('tenancy_staff');

        $template = ChecklistTemplate::create(['name' => 'Template Fashion', 'is_active' => true]);
        $section = ChecklistSection::create(['checklist_template_id' => $template->id, 'name' => 'Kebersihan', 'order' => 1]);
        $item = ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'Kaca etalase',
            'type' => 'binary_choice',
            'option_positive' => 'Baik',
            'option_negative' => 'Tidak Baik',
            'photo_required_on_negative' => false,
            'order' => 1,
        ]);

        $sessionA = InspectionSession::create(['branch_id' => $basics['branchA']->id, 'user_id' => $tenancy->id, 'started_at' => now(), 'status' => 'completed']);
        $inspectionA = Inspection::create([
            'inspection_session_id' => $sessionA->id,
            'tenant_id' => $basics['tenantA']->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => $template->toSnapshotArray($basics['tenantA']),
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        InspectionAnswer::create([
            'inspection_id' => $inspectionA->id,
            'checklist_item_id' => $item->id,
            'value' => 'Tidak Baik',
            'note' => 'Berdebu',
        ]);
        app(InspectionFindingService::class)->syncFromInspection($inspectionA);

        $sessionB = InspectionSession::create(['branch_id' => $basics['branchB']->id, 'user_id' => $tenancy->id, 'started_at' => now(), 'status' => 'completed']);
        Inspection::create([
            'inspection_session_id' => $sessionB->id,
            'tenant_id' => $basics['tenantB']->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => $template->toSnapshotArray($basics['tenantB']),
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($tenancy)->get('/inspection-sessions/export');
        $response->assertOk();

        $spreadsheet = $this->loadSpreadsheet($response);
        $this->assertSame(2, $spreadsheet->getSheetCount());

        $complianceRows = $spreadsheet->getSheet(0)->toArray();
        $findingRows = $spreadsheet->getSheet(1)->toArray();

        $this->assertCount(2, $complianceRows); // hanya Cabang A
        $this->assertSame('Toko Alpha', $complianceRows[1][5]);
        $this->assertCount(2, $findingRows);
        $this->assertSame('Kaca etalase', $findingRows[1][5]);

        $singleRes = $this->actingAs($tenancy)->get("/inspection-sessions/{$sessionA->id}/export");
        $singleRes->assertOk();
        $singleSheet = $this->loadSpreadsheet($singleRes)->getSheet(0)->toArray();
        $this->assertCount(2, $singleSheet);
        $this->assertSame('Toko Alpha', $singleSheet[1][5]);
    }

    public function test_export_loo_menyembunyikan_kolom_finansial_untuk_role_cover_only(): void
    {
        $basics = $this->seedBasics();

        $tenancy = User::create([
            'name' => 'Tenancy',
            'email' => 'tenancy-loo@test.id',
            'employee_number' => 'TEN-2',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $tenancy->assignRole('tenancy_staff');

        $accounting = User::create([
            'name' => 'Accounting',
            'email' => 'acc-loo@test.id',
            'employee_number' => 'ACC-1',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $accounting->assignRole('accounting');

        $loo = Loo::create([
            'loo_number' => 'LOO/2026/CBA/0001',
            'branch_id' => $basics['branchA']->id,
            'marketing_id' => $accounting->id,
            'prospective_tenant_name' => 'Calon Brand',
            'status' => 'pengisian_divisi',
            'current_stage' => 'marketing',
        ]);
        LooSection::create([
            'loo_id' => $loo->id,
            'section_key' => 'biaya_termin',
            'section_label' => 'Biaya & Termin',
            'data' => ['monthly_rent' => 99000000, 'service_charge' => 2500000],
            'is_submitted' => true,
        ]);

        $resTenancy = $this->actingAs($tenancy)->get('/loos/export');
        $resTenancy->assertOk();
        $rowsTenancy = $this->loadSpreadsheet($resTenancy)->getActiveSheet()->toArray();
        $this->assertNotContains('Sewa Bulanan (Rp)', $rowsTenancy[0]);
        $this->assertNotContains(99000000, $rowsTenancy[1]);

        $resAcc = $this->actingAs($accounting)->get('/loos/export');
        $resAcc->assertOk();
        $rowsAcc = $this->loadSpreadsheet($resAcc)->getActiveSheet()->toArray();
        $this->assertContains('Sewa Bulanan (Rp)', $rowsAcc[0]);
        $this->assertTrue(
            collect($rowsAcc[1])->contains(fn ($v) => (string) $v === '99000000'),
            'Nilai sewa tidak ditemukan di baris export: '.json_encode($rowsAcc[1])
        );
    }

    public function test_export_tenancies_mendukung_filter_expiring_in_days(): void
    {
        $basics = $this->seedBasics();
        $manager = User::create([
            'name' => 'Manager',
            'email' => 'mgr@test.id',
            'employee_number' => 'MGR-1',
            'branch_id' => $basics['branchA']->id,
            'password' => bcrypt('x'),
            'is_active' => true,
        ]);
        $manager->assignRole('manager');

        $response = $this->actingAs($manager)->get('/tenancies/export?expiring_in_days=30');
        $response->assertOk();

        $rows = $this->loadSpreadsheet($response)->getActiveSheet()->toArray();
        $this->assertCount(2, $rows); // hanya CTR-A-001 (20 hari lagi), bukan CTR-B-001 (200 hari)
        $this->assertSame('CTR-A-001', $rows[1][0]);
    }
}
