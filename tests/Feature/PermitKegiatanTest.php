<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\PermitNumberService;
use App\Services\PermitRequestService;
use Carbon\Carbon;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\TenantCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitKegiatanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TenantCategorySeeder::class);
        $this->seed(DepartmentSeeder::class);
        config(['permit.enabled' => true]);
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 10, 0, 0, 'Asia/Makassar'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function staff(): User
    {
        foreach (['permits.view', 'permits.create', 'permits.revise'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $role = Role::firstOrCreate(['name' => 'tenancy_staff', 'guard_name' => 'web']);
        $role->syncPermissions(['permits.view', 'permits.create', 'permits.revise']);
        $user = User::create([
            'name' => 'Staff', 'email' => 'staff'.uniqid().'@t.id',
            'employee_number' => 'STF-'.uniqid(),
            'branch_id' => $branch->id, 'department_id' => $dept->id,
            'password' => bcrypt('password'),
        ]);
        $user->assignRole('tenancy_staff');

        return $user;
    }

    private function tenant(): Tenant
    {
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $unit = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF', 'block' => 'A',
            'unit_number' => uniqid(), 'unit_code' => 'GF-A-'.uniqid(), 'is_active' => true,
        ]);
        $tenant = Tenant::create([
            'name' => 'Toko '.uniqid(), 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'status' => 'active', 'start_date' => Carbon::today()->toDateString(),
        ]);

        return $tenant;
    }

    private function kegiatanPayload(Tenant $tenant, array $overrides = []): array
    {
        return array_merge([
            'form_mode' => 'kegiatan',
            'tenant_id' => $tenant->id,
            'kegiatan_type' => 'event',
            'event_name' => 'Launching Produk Baru',
            'event_area' => 'Atrium Utama GF',
            'request_date' => Carbon::today()->toDateString(),
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->toDateString(),
            'pic_name' => 'Ibu Mila',
        ], $overrides);
    }

    public function test_code_for_kegiatan_types(): void
    {
        $this->assertSame('EVT', PermitNumberService::codeFor(['event']));
        $this->assertSame('MTG', PermitNumberService::codeFor(['meeting_internal']));
        $this->assertSame('STO', PermitNumberService::codeFor(['stock_opname']));
        $this->assertSame('TC', PermitNumberService::codeFor(['kerja']));
    }

    public function test_kegiatan_uses_tenancy_manager_chain(): void
    {
        $staff = $this->staff();
        $tenant = $this->tenant();

        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['event'],
            'request_date' => Carbon::today()->toDateString(),
            'tenant_id' => $tenant->id,
            'event_name' => 'Launching',
            'event_area' => 'Atrium',
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->toDateString(),
        ], $staff);

        $this->assertSame(['event'], $permit->activity_types);
        $this->assertStringContainsString('/EVT/', $permit->permit_number);
        $this->assertSame(
            ['tenancy', 'tenant_manager'],
            $permit->approvals()->orderBy('order')->pluck('step_key')->all()
        );
        $this->assertSame('GF / A / '.$tenant->activeTenancy->unit->unit_number,
            collect([$permit->floor_snapshot, $permit->block_snapshot, $permit->unit_number_snapshot])->filter()->join(' / '));
    }

    public function test_store_kegiatan_via_http(): void
    {
        $staff = $this->staff();
        $tenant = $this->tenant();

        $res = $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['kegiatan_type' => 'meeting_internal']));

        $res->assertRedirect();
        $permit = PermitRequest::latest('created_at')->first();
        $this->assertSame(['meeting_internal'], $permit->activity_types);
        $this->assertStringContainsString('/MTG/', $permit->permit_number);
        $this->assertSame('Launching Produk Baru', $permit->event_name);
        $this->assertSame('Atrium Utama GF', $permit->event_area);
        $this->assertSame($tenant->name, $permit->store_name_snapshot);
    }

    public function test_store_kegiatan_validates_required_fields(): void
    {
        $staff = $this->staff();
        $tenant = $this->tenant();

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['tenant_id' => null]))
            ->assertSessionHasErrors('tenant_id');

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['event_name' => 'AB']))
            ->assertSessionHasErrors('event_name');

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['event_area' => '']))
            ->assertSessionHasErrors('event_area');

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['kegiatan_type' => 'kerja']))
            ->assertSessionHasErrors('kegiatan_type');

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=kegiatan')
            ->post('/permit-requests', $this->kegiatanPayload($tenant, ['pic_name' => 'AB']))
            ->assertSessionHasErrors('pic_name');
    }

    public function test_create_kegiatan_mode_returns_units(): void
    {
        $staff = $this->staff();
        $tenant = $this->tenant();

        $res = $this->actingAs($staff)->get('/permit-requests/create?mode=kegiatan');
        $res->assertOk();
        $this->assertSame('kegiatan', $res->viewData('page')['props']['formMode']);
        $tenants = collect($res->viewData('page')['props']['tenants']);
        $row = $tenants->firstWhere('id', $tenant->id);
        $this->assertNotNull($row);
        $this->assertSame('GF', $row['floor']);
        $this->assertSame($tenant->activeTenancy->unit->unit_number, $row['unit_number']);
    }

    public function test_kegiatan_pdf_returns_certificate(): void
    {
        $staff = $this->staff();
        $tenant = $this->tenant();

        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['stock_opname'],
            'request_date' => Carbon::today()->toDateString(),
            'tenant_id' => $tenant->id,
            'event_name' => 'Stock Opname Gudang',
            'event_area' => 'Dalam Unit Tenant',
            'pic_name' => 'Ibu Mila',
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->toDateString(),
            'work_start_time' => '15:00',
            'work_end_time' => '18:00',
        ], $staff);

        $this->assertStringContainsString('/STO/', $permit->permit_number);

        $res = $this->actingAs($staff)->get("/permit-requests/{$permit->id}/pdf");
        $res->assertOk();
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('Izin-Kegiatan-', $res->headers->get('Content-Disposition'));
    }
}
