<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function branch(string $code): Branch
    {
        return Branch::firstOrCreate(['code' => $code], ['name' => "Cabang {$code}"]);
    }

    private function user(string $roleName, array $permissions, Branch $branch, array $extraRoles = []): User
    {
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Test '.$roleName.' '.Str::random(4),
            'employee_number' => 'PV-'.Str::upper(Str::random(8)),
            'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);

        $user->assignRole($roleName);
        if ($extraRoles) {
            $user->assignRole($extraRoles);
        }

        return $user;
    }

    private function permit(Branch $branch, User $creator, array $activityTypes, string $store, ?Tenant $tenant = null): PermitRequest
    {
        return PermitRequest::create([
            'permit_number' => 'TST/'.Str::upper(Str::random(8)).'/2026',
            'activity_types' => $activityTypes,
            'request_date' => '2026-09-22',
            'branch_id' => $branch->id,
            'tenant_id' => $tenant?->id,
            'store_name_snapshot' => $store,
            'work_start_date' => '2026-09-25',
            'work_end_date' => '2026-09-27',
            'requested_by_type' => User::class,
            'requested_by_id' => $creator->id,
            'status' => 'pending',
            'barcode_token' => (string) Str::uuid(),
        ]);
    }

    public function test_index_follows_pameran_visibility_matrix(): void
    {
        $branchA = $this->branch('PVA');
        $branchB = $this->branch('PVB');
        $creator = $this->user('tenancy_staff', ['permits.view'], $branchA);

        $pameranA = $this->permit($branchA, $creator, ['pameran'], 'Open Counter A');
        $kerjaA = $this->permit($branchA, $creator, ['kerja'], 'Tenant A');
        $pameranB = $this->permit($branchB, $creator, ['pameran'], 'Open Counter B');

        $marketing = $this->user('marketing', ['permits.view', 'permits.create'], $branchA);
        $marketingProps = $this->actingAs($marketing)->get('/permit-requests')->assertOk()->viewData('page')['props'];
        $marketingNumbers = collect($marketingProps['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($pameranA->permit_number, $marketingNumbers);
        $this->assertNotContains($kerjaA->permit_number, $marketingNumbers);
        $this->assertNotContains($pameranB->permit_number, $marketingNumbers);
        $this->assertSame('pameran', $marketingProps['categoryLocked']);
        $this->assertSame([], $marketingProps['hiddenCategories']);

        $tenancy = $this->user('tenancy_staff', ['permits.view', 'permits.create'], $branchA);
        $tenancyProps = $this->actingAs($tenancy)->get('/permit-requests')->assertOk()->viewData('page')['props'];
        $tenancyNumbers = collect($tenancyProps['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($kerjaA->permit_number, $tenancyNumbers);
        $this->assertNotContains($pameranA->permit_number, $tenancyNumbers);
        $this->assertNotContains($pameranB->permit_number, $tenancyNumbers);
        $this->assertContains('pameran', $tenancyProps['hiddenCategories']);

        $sanitized = $this->actingAs($tenancy)->get('/permit-requests?category=pameran')->assertOk();
        $sanitizedNumbers = collect($sanitized->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($kerjaA->permit_number, $sanitizedNumbers);
        $this->assertNotContains($pameranA->permit_number, $sanitizedNumbers);

        $finance = $this->user('finance_staff', ['permits.view'], $branchA);
        $financeNumbers = collect($this->actingAs($finance)->get('/permit-requests')->assertOk()->viewData('page')['props']['permits']['data'])
            ->pluck('permit_number')->all();
        $this->assertContains($pameranA->permit_number, $financeNumbers);
        $this->assertContains($kerjaA->permit_number, $financeNumbers);
        $this->assertNotContains($pameranB->permit_number, $financeNumbers);

        $manager = $this->user('manager', ['permits.view'], $branchA);
        $managerNumbers = collect($this->actingAs($manager)->get('/permit-requests')->assertOk()->viewData('page')['props']['permits']['data'])
            ->pluck('permit_number')->all();
        $this->assertContains($pameranA->permit_number, $managerNumbers);
        $this->assertContains($kerjaA->permit_number, $managerNumbers);
        $this->assertContains($pameranB->permit_number, $managerNumbers);

        $dual = $this->user('marketing', ['permits.view'], $branchA, ['manager']);
        $dualProps = $this->actingAs($dual)->get('/permit-requests')->assertOk()->viewData('page')['props'];
        $dualNumbers = collect($dualProps['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($pameranA->permit_number, $dualNumbers);
        $this->assertContains($kerjaA->permit_number, $dualNumbers);
        $this->assertNull($dualProps['categoryLocked']);
    }

    public function test_record_access_blocks_other_branch_and_hidden_pameran(): void
    {
        $branchA = $this->branch('PVA');
        $branchB = $this->branch('PVB');
        $creator = $this->user('tenancy_staff', ['permits.view'], $branchA);

        $pameranA = $this->permit($branchA, $creator, ['pameran'], 'Open Counter A');
        $kerjaA = $this->permit($branchA, $creator, ['kerja'], 'Tenant A');
        $pameranB = $this->permit($branchB, $creator, ['pameran'], 'Open Counter B');

        $marketing = $this->user('marketing', ['permits.view'], $branchA);
        $this->actingAs($marketing)->get("/permit-requests/{$pameranA->id}")->assertOk();
        $this->actingAs($marketing)->get("/permit-requests/{$kerjaA->id}")->assertForbidden();
        $this->actingAs($marketing)->get("/permit-requests/{$pameranB->id}")->assertForbidden();
        $this->actingAs($marketing)->get("/permit-requests/{$pameranB->id}/pdf")->assertForbidden();

        $tenancy = $this->user('tenancy_staff', ['permits.view'], $branchA);
        $this->actingAs($tenancy)->get("/permit-requests/{$kerjaA->id}")->assertOk();
        $this->actingAs($tenancy)->get("/permit-requests/{$pameranA->id}")->assertForbidden();
        $this->actingAs($tenancy)->get("/permit-requests/{$pameranA->id}/pdf")->assertForbidden();

        $finance = $this->user('finance_staff', ['permits.view'], $branchA);
        $this->actingAs($finance)->get("/permit-requests/{$pameranA->id}")->assertOk();
        $this->actingAs($finance)->get("/permit-requests/{$pameranB->id}")->assertForbidden();
    }

    public function test_create_only_offers_pameran_to_allowed_roles(): void
    {
        $branch = $this->branch('PVA');
        $tenancy = $this->user('tenancy_staff', ['permits.view', 'permits.create'], $branch);

        $tenancyCreate = $this->actingAs($tenancy)->get('/permit-requests/create?mode=pameran')->assertOk();
        $tenancyProps = $tenancyCreate->viewData('page')['props'];
        $this->assertFalse($tenancyProps['canCreatePameran']);
        $this->assertSame('kerja', $tenancyProps['formMode']);

        $this->actingAs($tenancy)->post('/permit-requests', [
            'form_mode' => 'pameran',
            'activity_types' => ['pameran'],
            'request_date' => '2026-09-22',
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
        ])->assertForbidden();

        $this->actingAs($tenancy)->post('/permit-requests', [
            'form_mode' => 'kerja',
            'activity_types' => ['pameran'],
            'request_date' => '2026-09-22',
            'store_name_snapshot' => 'Area X',
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
            'worker_count' => 2,
        ])->assertForbidden();

        $marketing = $this->user('marketing', ['permits.view', 'permits.create'], $branch);
        $marketingProps = $this->actingAs($marketing)->get('/permit-requests/create')->assertOk()->viewData('page')['props'];
        $this->assertTrue($marketingProps['canCreatePameran']);
        $this->assertTrue($marketingProps['isMarketingLocked']);

        $manager = $this->user('manager', ['permits.view', 'permits.create'], $branch);
        $managerProps = $this->actingAs($manager)->get('/permit-requests/create?mode=pameran')->assertOk()->viewData('page')['props'];
        $this->assertTrue($managerProps['canCreatePameran']);
        $this->assertTrue($managerProps['isMarketingLocked']);
    }

    public function test_tenant_profile_and_show_permit_follow_visibility(): void
    {
        $branch = $this->branch('PVA');
        $creator = $this->user('tenancy_staff', ['permits.view'], $branch);
        $tenant = Tenant::create([
            'name' => 'Tenant Profile',
            'branch_id' => $branch->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'Retail'])->id,
            'is_active' => true,
        ]);

        $pameran = $this->permit($branch, $creator, ['pameran'], 'Open Counter Profile', $tenant);
        $kerja = $this->permit($branch, $creator, ['kerja'], 'Tenant Profile', $tenant);

        $marketing = $this->user('marketing', ['tenants.view', 'permits.view'], $branch);

        $row = collect($this->actingAs($marketing)->get('/tenant-profiles')->assertOk()->viewData('page')['props']['tenants']['data'])
            ->firstWhere('id', $tenant->id);
        $this->assertSame(1, $row['permits_pending_count']);

        $detail = $this->actingAs($marketing)->get("/tenant-profiles/{$tenant->id}/detail")->assertOk();
        $detailPermits = collect($detail->viewData('page')['props']['permits'])->pluck('permit_number')->all();
        $this->assertContains($pameran->permit_number, $detailPermits);
        $this->assertNotContains($kerja->permit_number, $detailPermits);

        $this->actingAs($marketing)->get("/tenant-profiles/{$tenant->id}/permits/{$pameran->id}")->assertOk();
        $this->actingAs($marketing)->get("/tenant-profiles/{$tenant->id}/permits/{$kerja->id}")->assertForbidden();
    }

    public function test_dashboard_calendar_filters_hidden_permits(): void
    {
        $branchA = $this->branch('PVA');
        $branchB = $this->branch('PVB');
        $creator = $this->user('tenancy_staff', ['permits.view'], $branchA);

        $pameranA = $this->permit($branchA, $creator, ['pameran'], 'Open Counter A');
        $kerjaA = $this->permit($branchA, $creator, ['kerja'], 'Tenant A');
        $pameranB = $this->permit($branchB, $creator, ['pameran'], 'Open Counter B');

        $marketing = $this->user('marketing', ['permits.view'], $branchA);
        $marketingEvents = collect($this->actingAs($marketing)->get('/dashboard?cal_month=2026-09')->assertOk()->viewData('page')['props']['calendar']['events']);
        $this->assertTrue($marketingEvents->contains('id', "permit-{$pameranA->id}"));
        $this->assertFalse($marketingEvents->contains('id', "permit-{$kerjaA->id}"));
        $this->assertFalse($marketingEvents->contains('id', "permit-{$pameranB->id}"));

        $tenancy = $this->user('tenancy_staff', ['permits.view'], $branchA);
        $tenancyEvents = collect($this->actingAs($tenancy)->get('/dashboard?cal_month=2026-09')->assertOk()->viewData('page')['props']['calendar']['events']);
        $this->assertTrue($tenancyEvents->contains('id', "permit-{$kerjaA->id}"));
        $this->assertFalse($tenancyEvents->contains('id', "permit-{$pameranA->id}"));
        $this->assertFalse($tenancyEvents->contains('id', "permit-{$pameranB->id}"));
    }
}
