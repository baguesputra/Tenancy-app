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
use App\Services\PermitRequestService;
use Carbon\Carbon;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\TenantCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitRequestFormTest extends TestCase
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

    private function makeUser(array $roles = ['tenancy_staff']): User
    {
        foreach (['permits.view', 'permits.create', 'permits.approve'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test'.uniqid().'@t.id',
            'employee_number' => 'TST-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('password'),
        ]);
        foreach ($roles as $role) {
            $r = Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
            $r->syncPermissions(['permits.view', 'permits.create', 'permits.approve']);
            $user->assignRole($role);
        }

        return $user;
    }

    private function payload(array $overrides = []): array
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

        return array_merge([
            'tenant_id' => $tenant->id,
            'activity_types' => ['kerja'],
            'request_date' => Carbon::today()->toDateString(),
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->toDateString(),
            'worker_count' => 3,
            'goods' => [['description' => 'Kabel', 'quantity_note' => '2', 'unit' => 'roll']],
        ], $overrides);
    }

    public function test_worker_count_wajib_diisi(): void
    {
        $user = $this->makeUser();
        $payload = $this->payload();
        unset($payload['worker_count']);

        $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $payload)
            ->assertSessionHasErrors('worker_count');

        $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $this->payload(['worker_count' => 0]))
            ->assertSessionHasErrors('worker_count');
    }

    public function test_jenis_kegiatan_split_diterima_dan_tersimpan(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $this->payload([
                'activity_types' => ['masuk_barang', 'keluar_alat', 'fit_out', 'renovasi'],
            ]))
            ->assertRedirect();

        $permit = PermitRequest::latest('id')->firstOrFail();
        $this->assertSame(['masuk_barang', 'keluar_alat', 'fit_out', 'renovasi'], $permit->activity_types);
        $this->assertSame(3, (int) $permit->worker_count);
        $this->assertSame('roll', $permit->goods()->first()->unit);

        // Nilai gabungan lama ditolak.
        $this->actingAs($user)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $this->payload(['activity_types' => ['masuk_keluar_barang']]))
            ->assertSessionHasErrors('activity_types.0');
    }

    public function test_security_diblokir_saat_foto_ktp_kurang(): void
    {
        Storage::fake('public');
        $securityDept = Department::firstOrCreate(['name' => 'Security']);
        foreach (['Tenancy', 'Building Service'] as $d) {
            Department::firstOrCreate(['name' => $d]);
        }

        $staff = $this->makeUser();
        $permit = app(PermitRequestService::class)->create($this->payload(['goods' => []]), $staff);
        $this->assertSame(3, (int) $permit->worker_count);
        $this->assertSame(0, $permit->workers()->count());

        $guard = $this->makeUser();
        $guard->update(['department_id' => $securityDept->id]);

        // Tanpa foto KTP → ditolak.
        $this->actingAs($guard)
            ->post("/permit-requests/{$permit->id}/complete-security-check")
            ->assertSessionHasErrors('security');

        // 1 foto (< 3) → masih ditolak.
        $this->actingAs($guard)->post("/permit-requests/{$permit->id}/ktp-photos", [
            'photo' => UploadedFile::fake()->image('ktp1.jpg'),
        ])->assertRedirect();
        $this->actingAs($guard)
            ->post("/permit-requests/{$permit->id}/complete-security-check")
            ->assertSessionHasErrors('security');

        // 3 foto (= jumlah) → lolos.
        for ($i = 2; $i <= 3; $i++) {
            $this->actingAs($guard)->post("/permit-requests/{$permit->id}/ktp-photos", [
                'photo' => UploadedFile::fake()->image("ktp{$i}.jpg"),
            ])->assertRedirect();
        }
        // Tahap tenancy + BS disetujui dulu agar status bisa completed.
        $permit->approvals()->where('step_key', '!=', 'security')->update(['status' => 'approved']);
        $this->actingAs($guard)
            ->post("/permit-requests/{$permit->id}/complete-security-check")
            ->assertRedirect();
        $this->assertSame('completed', $permit->fresh()->status);
    }

    public function test_flag_manager_menambah_step_setelah_tenancy(): void
    {
        $staff = $this->makeUser();

        $this->actingAs($staff)
            ->from('/permit-requests/create')
            ->post('/permit-requests', $this->payload(['needs_manager_approval' => true]))
            ->assertRedirect();

        $permit = PermitRequest::latest('id')->firstOrFail();
        $this->assertTrue((bool) $permit->needs_manager_approval);
        $this->assertSame(
            ['tenancy', 'tenant_manager', 'bs', 'security'],
            $permit->approvals()->orderBy('order')->pluck('step_key')->all()
        );

        $biasa = app(PermitRequestService::class)->create($this->payload(), $staff);
        $this->assertSame(
            ['tenancy', 'bs', 'security'],
            $biasa->approvals()->orderBy('order')->pluck('step_key')->all()
        );
    }

    public function test_approve_manager_hanya_oleh_role_manager_tenancy(): void
    {
        $staff = $this->makeUser();
        $permit = app(PermitRequestService::class)->create($this->payload(['needs_manager_approval' => true]), $staff);
        $steps = $permit->approvals()->orderBy('order')->get()->keyBy('step_key');

        // Staff tenancy biasa menyetujui tahap tenancy...
        $this->actingAs($staff)->post("/approvals/{$steps['tenancy']->id}/approve")->assertRedirect();

        // ...tapi tidak boleh approve tahap manager.
        $this->actingAs($staff)
            ->post("/approvals/{$steps['tenant_manager']->id}/approve")
            ->assertSessionHasErrors('approval');
        $this->assertSame('pending', $steps['tenant_manager']->fresh()->status);

        // Manager tenancy boleh.
        $manager = $this->makeUser(['manager']);
        $this->actingAs($manager)->post("/approvals/{$steps['tenant_manager']->id}/approve")->assertRedirect();
        $this->assertSame('approved', $steps['tenant_manager']->fresh()->status);
    }

    public function test_migrasi_area_jadi_vendor(): void
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $staff = $this->makeUser();
        $legacy = PermitRequest::create([
            'permit_number' => 'LEG-'.uniqid(),
            'activity_types' => ['kerja'],
            'request_date' => Carbon::today()->toDateString(),
            'tenant_id' => null,
            'branch_id' => $branch->id,
            'store_name_snapshot' => 'Atrium Utama',
            'is_external' => false,
            'contractor_company' => null,
            'requested_by_type' => User::class,
            'requested_by_id' => $staff->id,
            'barcode_token' => uniqid(),
            'status' => 'pending',
        ]);

        $migration = include database_path('migrations/2026_10_13_090100_merge_permit_area_into_vendor.php');
        $migration->up();

        $this->assertTrue((bool) $legacy->fresh()->is_external);

        $res = $this->actingAs($staff)->get('/permit-requests?category=vendor')->assertOk();
        $numbers = collect($res->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        $this->assertContains($legacy->permit_number, $numbers);

        $res = $this->actingAs($staff)->get('/permit-requests?category=tenant')->assertOk();
        $numbers = collect($res->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        $this->assertNotContains($legacy->permit_number, $numbers);
    }
}
