<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\InspectionSession;
use App\Models\InspectionSessionParticipant;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionService;
use Database\Seeders\ChecklistSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InspectionFormHeaderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_show_mengirim_kop_lokasi_pic_dan_petugas(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Tenant']);
        $pc = ProductCategory::create(['name' => 'Retail']);
        $this->seed(ChecklistSeeder::class);

        $tenant = Tenant::create([
            'name' => 'Toko Uji', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'pic_name' => 'Budi', 'pic_position' => 'SPV', 'pic_phone' => '0811',
            'is_active' => true,
        ]);
        $unit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => '1', 'block' => 'A', 'unit_number' => '12',
        ]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'status' => 'active',
            'start_date' => now()->toDateString(),
        ]);

        $user = User::create([
            'name' => 'Inspector', 'email' => 'insp@t.id',
            'employee_number' => 'INSP-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        foreach (['sidak.view', 'sidak.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'inspector']);
        $role->syncPermissions(['sidak.view', 'sidak.create']);
        $user->assignRole('inspector');
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $user->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);
        InspectionSessionParticipant::create([
            'inspection_session_id' => $session->id, 'user_id' => $user->id,
            'name_snapshot' => 'Andi', 'department_name_snapshot' => 'Engineering',
        ]);

        $inspection = app(InspectionService::class)->addInspection($session, $tenant);

        $res = $this->actingAs($user)->get("/inspections/{$inspection->id}");

        $res->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('formHeader.location', 'Lantai 1 · Blok A · No. 12')
            ->where('formHeader.tenant_pic.name', 'Budi')
            ->where('formHeader.pic', 'Inspector')
            ->has('formHeader.officers', 1)
            ->where('formHeader.officers.0.name', 'Andi')
            ->where('formHeader.officers.0.department', 'Engineering')
        );
    }
}
