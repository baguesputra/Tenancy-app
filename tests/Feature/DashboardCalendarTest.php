<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Tenancy;
use App\Models\Unit;
use App\Models\User;
use App\Services\PermitRequestService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardCalendarTest extends TestCase
{
    use RefreshDatabase;

    private function manager(): User
    {
        $role = Role::firstOrCreate(['name' => 'manager']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $staff = User::create([
            'name' => 'Mgr', 'employee_number' => 'MGR-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    public function test_calendar_contains_permit_and_contract_end(): void
    {
        Carbon::setTestNow('2026-09-22');
        $mgr = $this->manager();

        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['kerja'], 'request_date' => '2026-09-22',
            'store_name_snapshot' => 'Area X',
            'work_start_date' => '2026-09-25', 'work_end_date' => '2026-09-27',
        ], $mgr);

        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $tenant = Tenant::create([
            'name' => 'Toko A', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id, 'is_active' => true,
        ]);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'start_date' => '2026-01-01', 'end_date' => '2026-09-28', 'status' => 'active',
        ]);

        $res = $this->actingAs($mgr)->get('/dashboard?cal_month=2026-09')->assertOk();
        $events = collect($res->viewData('page')['props']['calendar']['events']);
        $this->assertTrue($events->contains(fn ($e) => str_contains($e['id'], 'permit-')));
        $end = $events->firstWhere('type', 'contract_end');
        $this->assertNotNull($end);
        $this->assertTrue($end['urgent']);
        Carbon::setTestNow();
    }
}
