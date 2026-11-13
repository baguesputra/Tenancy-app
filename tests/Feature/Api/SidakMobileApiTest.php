<?php

namespace Tests\Feature\Api;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistSection;
use App\Models\ChecklistTemplate;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\UnitGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SidakMobileApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_mobile_sidak_endpoints_lengkap(): void
    {
        foreach (['sidak.view', 'sidak.manage', 'sidak.answer'] as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => 'inspector', 'guard_name' => 'web']);
        $role->syncPermissions(['sidak.view', 'sidak.manage', 'sidak.answer']);

        $branch = Branch::create(['name' => 'Duta Mall Banjarmasin', 'code' => 'BJM']);
        $deptEng = Department::create(['name' => 'Engineering']);
        $deptSec = Department::create(['name' => 'Security']);

        $inspector = User::create([
            'name' => 'Budi Inspector',
            'email' => 'inspector@dutamall.com',
            'employee_number' => 'INSP-01',
            'branch_id' => $branch->id,
            'department_id' => $deptEng->id,
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);
        $inspector->assignRole('inspector');

        $mate = User::create([
            'name' => 'Rudi Security',
            'email' => 'rudi@dutamall.com',
            'employee_number' => 'SEC-01',
            'branch_id' => $branch->id,
            'department_id' => $deptSec->id,
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);

        $tc = TenantCategory::create(['name' => 'Retail']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $template = ChecklistTemplate::create(['name' => 'Checklist F&B', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);
        $section = ChecklistSection::create(['checklist_template_id' => $template->id, 'name' => 'Kebersihan', 'order' => 1]);
        ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'Area kasir bersih',
            'type' => 'binary_choice',
            'option_positive' => 'Sesuai',
            'option_negative' => 'Tidak Sesuai',
            'order' => 1,
        ]);

        $tenant = Tenant::create([
            'name' => 'Kopi Kenangan',
            'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id,
            'product_category_id' => $pc->id,
            'pic_name' => 'Sari',
            'pic_position' => 'Manager',
            'pic_phone' => '0812345',
            'is_active' => true,
        ]);
        $unit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'block' => 'A',
            'unit_number' => '01',
            'unit_code' => 'GF-01',
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
        ]);

        $token = $inspector->createToken('mobile')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/staff-options')
            ->assertOk()
            ->assertJsonPath('staffByDepartment.Security.0.id', $mate->id);

        $this->withToken($token)
            ->getJson('/api/v1/tenants')
            ->assertOk()
            ->assertJsonPath('tenants.0.unit_code', 'GF-01')
            ->assertJsonPath('tenants.0.product_category', 'F&B');

        $createRes = $this->withToken($token)
            ->postJson('/api/v1/inspection-sessions', [
                'participant_ids' => [$mate->id],
                'notes' => 'Sidak rutin pagi',
            ])
            ->assertCreated()
            ->assertJsonPath('session.pic_name', 'Budi Inspector')
            ->assertJsonPath('session.branch_name', 'Duta Mall Banjarmasin');

        $sessionId = $createRes->json('session.id');

        $this->withToken($token)
            ->getJson('/api/v1/inspection-sessions')
            ->assertOk()
            ->assertJsonPath('sessions.0.id', $sessionId);

        $addRes = $this->withToken($token)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/tenants", ['tenant_id' => $tenant->id])
            ->assertCreated()
            ->assertJsonPath('inspection.tenant.unit_code', 'GF-01');

        $inspectionId = $addRes->json('inspection.id');

        $this->withToken($token)
            ->getJson("/api/v1/inspections/{$inspectionId}")
            ->assertOk()
            ->assertJsonPath('formHeader.location', 'Lantai GF · Blok A · No. 01')
            ->assertJsonPath('formHeader.pic', 'Budi Inspector')
            ->assertJsonPath('checklist.sections.0.name', 'Kebersihan')
            ->assertJsonPath('checklist.sections.0.title', 'Kebersihan')
            ->assertJsonPath('inspection.tenant.product_category.name', 'F&B');

        $this->assertDatabaseHas('inspections', ['id' => $inspectionId, 'tenant_id' => $tenant->id]);
    }

    public function test_mobile_scan_menerima_url_qr_unit_area_gabungan_dan_anggota_grup(): void
    {
        foreach (['sidak.view', 'sidak.manage', 'sidak.answer'] as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => 'inspector', 'guard_name' => 'web']);
        $role->syncPermissions(['sidak.view', 'sidak.manage', 'sidak.answer']);

        $branch = Branch::create(['name' => 'Duta Mall Banjarmasin', 'code' => 'BJM']);
        $dept = Department::create(['name' => 'Engineering']);

        $inspector = User::create([
            'name' => 'Budi Inspector',
            'email' => 'scanner@dutamall.com',
            'employee_number' => 'INSP-02',
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);
        $inspector->assignRole('inspector');

        $mate = User::create([
            'name' => 'Rudi Partner',
            'email' => 'rudi2@dutamall.com',
            'employee_number' => 'ENG-02',
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);

        $tc = TenantCategory::create(['name' => 'Retail']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $template = ChecklistTemplate::create(['name' => 'Checklist F&B', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);
        $section = ChecklistSection::create(['checklist_template_id' => $template->id, 'name' => 'Kebersihan', 'order' => 1]);
        ChecklistItem::create([
            'checklist_section_id' => $section->id,
            'label' => 'Area kasir bersih',
            'type' => 'binary_choice',
            'option_positive' => 'Sesuai',
            'option_negative' => 'Tidak Sesuai',
            'order' => 1,
        ]);

        // Unit tunggal
        $singleTenant = Tenant::create([
            'name' => 'Tenant Tunggal',
            'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id,
            'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        $singleUnit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'unit_number' => '01',
            'unit_code' => 'GF-01',
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $singleUnit->id,
            'tenant_id' => $singleTenant->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
        ]);

        // Area gabungan: kontrak di primaryUnit + unit_group_id
        $groupTenant = Tenant::create([
            'name' => 'Tenant Area Gabungan',
            'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id,
            'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        $primaryUnit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'unit_number' => '02',
            'unit_code' => 'GF-02',
            'is_active' => true,
        ]);
        $memberUnit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'unit_number' => '03',
            'unit_code' => 'GF-03',
            'is_active' => true,
        ]);
        $group = UnitGroup::create(['branch_id' => $branch->id, 'name' => 'Area Senja']);
        $group->units()->sync([
            $primaryUnit->id => ['is_primary' => true],
            $memberUnit->id => ['is_primary' => false],
        ]);
        Tenancy::create([
            'unit_id' => $primaryUnit->id,
            'unit_group_id' => $group->id,
            'tenant_id' => $groupTenant->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
        ]);

        $emptyUnit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'unit_number' => '04',
            'unit_code' => 'GF-04',
            'is_active' => true,
        ]);

        $permit = PermitRequest::create([
            'permit_number' => 'PRW-TST-001',
            'activity_types' => ['kerja'],
            'request_date' => now()->toDateString(),
            'branch_id' => $branch->id,
            'store_name_snapshot' => 'Tenant Tunggal',
            'requested_by_type' => User::class,
            'requested_by_id' => $inspector->id,
            'barcode_token' => 'TOK-PERMIT-1',
        ]);

        $apiToken = $inspector->createToken('mobile')->plainTextToken;
        $sessionRes = $this->withToken($apiToken)
            ->postJson('/api/v1/inspection-sessions', ['participant_ids' => [$mate->id]])
            ->assertCreated();
        $sessionId = $sessionRes->json('session.id');

        // 1. Scan full URL QR unit (persis yang tercetak di stiker PDF)
        $singleScan = $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $singleUnit->scanUrl])
            ->assertCreated()
            ->assertJsonPath('inspection.tenant.id', $singleTenant->id);

        // 2. Scan token UUID mentah untuk unit yang sama mengembalikan inspeksi yang sama
        $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $singleUnit->scannableCode->token])
            ->assertCreated()
            ->assertJsonPath('inspection.id', $singleScan->json('inspection.id'));

        // 3. Scan QR Area Gabungan (UnitGroup) via URL penuh
        $groupScan = $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $group->scanUrl])
            ->assertCreated()
            ->assertJsonPath('inspection.tenant.id', $groupTenant->id);

        // 4. Scan QR unit anggota grup non-primary via URL penuh tetap menemukan tenant grupnya
        $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $memberUnit->scanUrl])
            ->assertCreated()
            ->assertJsonPath('inspection.id', $groupScan->json('inspection.id'));

        // 5. Unit kosong mengembalikan error validasi
        $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $emptyUnit->scanUrl])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'Unit GF-04 kosong, tidak ada tenant aktif.');

        // 6. QR Surat Izin ditolak dengan pesan spesifik
        $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => $permit->refresh()->scanUrl])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'Ini adalah QR Surat Izin, bukan QR unit untuk sidak.');

        // 7. QR tidak dikenal ditolak
        $this->withToken($apiToken)
            ->postJson("/api/v1/inspection-sessions/{$sessionId}/scan", ['token' => 'https://example.com/scan/tidak-ada'])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'QR tidak dikenal. Pastikan QR unit yang dipindai.');
    }
}
