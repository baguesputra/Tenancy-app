<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Department;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\TenantCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitTimeLockTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TenantCategorySeeder::class);
        $this->seed(DepartmentSeeder::class);
        config(['permit.enabled' => true]);
    }

    private function makeUser(array $roles = [], array $overrides = []): User
    {
        foreach (['permits.view', 'permits.create'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@t.id',
            'employee_number' => 'TST-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('password'),
            ...$overrides,
        ]);
        if ($roles) {
            foreach ($roles as $role) {
                $r = Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
                $r->syncPermissions(['permits.view', 'permits.create']);
                $user->assignRole($role);
            }
        }

        return $user;
    }

    private function getPermitPayload(): array
    {
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $unit = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF',
            'unit_number' => uniqid(), 'unit_code' => 'GF-'.uniqid(), 'is_active' => true,
        ]);
        $tenant = Tenant::create([
            'name' => 'Test Tenant '.uniqid(),
            'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id,
            'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'status' => 'active', 'start_date' => Carbon::today()->toDateString(),
        ]);

        return [
            'tenant_id' => $tenant->id,
            'activity_types' => ['kerja'],
            'request_date' => Carbon::today()->toDateString(),
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->toDateString(),
            'worker_count' => 3,
        ];
    }

    public function test_time_lock_allows_during_working_hours(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 10, 0, 0, 'Asia/Makassar')); // 10:00

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_blocks_during_locked_hours(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 23, 0, 0, 'Asia/Makassar')); // 23:00 (locked)

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_blocks_early_morning(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 6, 0, 0, 'Asia/Makassar')); // 06:00 (locked)

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_allows_super_admin_anytime(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 23, 0, 0, 'Asia/Makassar')); // 23:00 (locked)

        $user = $this->makeUser(['super_admin']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_disabled_allows_anytime(): void
    {
        config(['permit.enabled' => false]);
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 23, 0, 0, 'Asia/Makassar')); // 23:00 (would be locked)

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_allows_at_boundary_end(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 9, 50, 0, 'Asia/Makassar')); // 09:50 (lock ends)

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_blocks_at_boundary_start(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 9, 29, 22, 50, 0, 'Asia/Makassar')); // 22:50 (lock starts)

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }

    public function test_time_lock_overnight_cross_midnight(): void
    {
        // Test midnight (00:00) - should be locked
        Carbon::setTestNow(Carbon::create(2026, 9, 30, 0, 0, 0, 'Asia/Makassar')); // 00:00

        $user = $this->makeUser(['tenancy_staff']);
        $payload = $this->getPermitPayload();

        $response = $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('permit_requests', ['tenant_id' => $payload['tenant_id']]);
    }
}
