<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SessionScanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function makeStaff(Branch $branch, array $perms = ['sidak.view', 'sidak.create']): User
    {
        foreach ($perms as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'inspector']);
        $role->syncPermissions($perms);
        $staff = User::create([
            'name' => 'Inspector',
            'email' => 'insp@t.id',
            'employee_number' => 'INSP-1',
            'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('inspector');

        return $staff;
    }

    private function seedUnitTenant(Branch $branch): array
    {
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF',
            'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true,
        ]);
        $tenant = Tenant::create([
            'name' => 'Toko Scan', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'status' => 'active', 'start_date' => now()->toDateString(),
        ]);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);

        return [$unit, $tenant];
    }

    public function test_scan_valid_token_creates_inspection_in_open_session(): void
    {
        $branch = Branch::create(['name' => 'Cabang Scan', 'code' => 'SCN']);
        $staff = $this->makeStaff($branch);
        [$unit] = $this->seedUnitTenant($branch);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => $unit->scannableCode->token])
            ->assertRedirect();

        $this->assertDatabaseHas('inspections', [
            'inspection_session_id' => $session->id,
        ]);
    }

    public function test_scan_unknown_token_returns_token_error(): void
    {
        $branch = Branch::create(['name' => 'Cabang Scan', 'code' => 'SCN']);
        $staff = $this->makeStaff($branch);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => 'token-ngaco'])
            ->assertSessionHasErrors('token');
    }

    public function test_scan_twice_returns_same_inspection(): void
    {
        $branch = Branch::create(['name' => 'Cabang Scan', 'code' => 'SCN']);
        $staff = $this->makeStaff($branch);
        [$unit] = $this->seedUnitTenant($branch);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $first = $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => $unit->scannableCode->token])
            ->assertRedirect();
        $firstId = basename($first->headers->get('Location'));

        $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => $unit->scannableCode->token])
            ->assertRedirect("/inspections/{$firstId}");

        $this->assertSame(1, Inspection::where('inspection_session_id', $session->id)->count());
    }

    public function test_scan_tenant_inspected_by_other_returns_token_error(): void
    {
        $branch = Branch::create(['name' => 'Cabang Scan', 'code' => 'SCN']);
        $staff = $this->makeStaff($branch);
        $other = User::create([
            'name' => 'Other', 'email' => 'other@t.id', 'employee_number' => 'INSP-2',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $other->assignRole('inspector');
        [$unit, $tenant] = $this->seedUnitTenant($branch);
        $otherSession = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $other->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);
        app(InspectionService::class)->addInspection($otherSession, $tenant);

        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => $unit->scannableCode->token])
            ->assertSessionHasErrors('token');
    }

    public function test_scan_empty_unit_returns_token_error(): void
    {
        $branch = Branch::create(['name' => 'Cabang Scan', 'code' => 'SCN']);
        $staff = $this->makeStaff($branch);
        $this->seedUnitTenant($branch);
        $empty = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF',
            'unit_number' => '02', 'unit_code' => 'GF-02', 'is_active' => true,
        ]);
        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        $this->actingAs($staff)
            ->post("/inspection-sessions/{$session->id}/scan", ['token' => $empty->scannableCode->token])
            ->assertSessionHasErrors('token');
    }
}
