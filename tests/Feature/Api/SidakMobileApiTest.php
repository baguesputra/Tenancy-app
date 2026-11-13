<?php

namespace Tests\Feature\Api;

use App\Models\Branch;
use App\Models\ChecklistItem;
use App\Models\ChecklistSection;
use App\Models\ChecklistTemplate;
use App\Models\Department;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
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
}
