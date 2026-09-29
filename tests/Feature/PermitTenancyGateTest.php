<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\PermitRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitTenancyGateTest extends TestCase
{
    use RefreshDatabase;

    private function tenant(string $tenancyStatus): Tenant
    {
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $unit = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF',
            'unit_number' => uniqid(), 'unit_code' => 'GF-'.uniqid(), 'is_active' => true,
        ]);
        $tenant = Tenant::create([
            'name' => 'Toko '.uniqid(), 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);

        if ($tenancyStatus !== 'none') {
            Tenancy::create([
                'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
                'status' => $tenancyStatus, 'start_date' => today()->toDateString(),
            ]);
        }

        return $tenant;
    }

    private function staff(): User
    {
        Permission::firstOrCreate(['name' => 'permits.create', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'tenancy', 'guard_name' => 'web'])
            ->syncPermissions(['permits.create']);

        $user = User::create([
            'name' => 'Staf Tenancy', 'email' => 'gate-'.uniqid().'@t.id',
            'employee_number' => 'G-'.uniqid(),
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole('tenancy');

        return $user;
    }

    public function test_permit_blocked_when_tenancy_not_active(): void
    {
        $tenant = $this->tenant('proses');
        $service = app(PermitRequestService::class);

        $this->expectException(ValidationException::class);

        $service->create([
            'tenant_id' => $tenant->id,
            'activity_types' => ['kerja'],
            'request_date' => today()->toDateString(),
            'work_start_date' => today()->toDateString(),
            'work_end_date' => today()->toDateString(),
        ], $this->staff());
    }

    public function test_permit_blocked_when_tenancy_missing_entirely(): void
    {
        $tenant = $this->tenant('none');
        $service = app(PermitRequestService::class);

        $this->expectException(ValidationException::class);

        $service->create([
            'tenant_id' => $tenant->id,
            'activity_types' => ['kerja'],
            'request_date' => today()->toDateString(),
            'work_start_date' => today()->toDateString(),
            'work_end_date' => today()->toDateString(),
        ], $this->staff());
    }

    public function test_permit_allowed_when_tenancy_active(): void
    {
        $tenant = $this->tenant('active');
        $service = app(PermitRequestService::class);

        $permit = $service->create([
            'tenant_id' => $tenant->id,
            'activity_types' => ['kerja'],
            'request_date' => today()->toDateString(),
            'work_start_date' => today()->toDateString(),
            'work_end_date' => today()->toDateString(),
        ], $this->staff());

        $this->assertNotNull($permit->id);
        $this->assertSame($tenant->id, $permit->tenant_id);
    }

    public function test_vendor_without_tenant_still_allowed(): void
    {
        $service = app(PermitRequestService::class);

        $permit = $service->create([
            'activity_types' => ['kerja'],
            'request_date' => today()->toDateString(),
            'work_start_date' => today()->toDateString(),
            'work_end_date' => today()->toDateString(),
            'contractor_company' => 'PT Vendor Luar',
        ], $this->staff());

        $this->assertNotNull($permit->id);
    }

    public function test_tenant_dropdown_only_shows_active_tenancy(): void
    {
        $active = $this->tenant('active');
        $proses = $this->tenant('proses');

        $response = $this->actingAs($this->staff())->get('/permit-requests/create')->assertOk();

        $names = collect($response->viewData('page')['props']['tenants'])->pluck('name');

        $this->assertTrue($names->contains($active->name));
        $this->assertFalse($names->contains($proses->name));
    }
}
