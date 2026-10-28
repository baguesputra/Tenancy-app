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

class PermitLanggananParkirTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TenantCategorySeeder::class);
        $this->seed(DepartmentSeeder::class);
        config(['permit.enabled' => true]);
        Carbon::setTestNow(Carbon::create(2026, 10, 20, 10, 0, 0, 'Asia/Makassar'));

        foreach (['permits.view', 'permits.create', 'permits.approve'] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function branch(string $code = 'TST'): Branch
    {
        return Branch::firstOrCreate(['code' => $code], ['name' => 'Cabang '.$code]);
    }

    private function user(string $role, ?string $departmentName = null, ?Branch $branch = null): User
    {
        $branch ??= $this->branch();
        $department = $departmentName ? Department::firstOrCreate(['name' => $departmentName]) : null;

        $user = User::create([
            'name' => ucfirst($role),
            'email' => $role.uniqid().'@t.id',
            'employee_number' => strtoupper($role).'-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $department?->id,
            'password' => bcrypt('password'),
        ]);

        $roleModel = Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        $roleModel->syncPermissions(['permits.view', 'permits.create', 'permits.approve']);
        $user->assignRole($role);

        return $user;
    }

    private function tenant(Branch $branch): Tenant
    {
        $unit = Unit::create([
            'branch_id' => $branch->id,
            'floor' => 'GF',
            'block' => 'A',
            'unit_number' => uniqid(),
            'unit_code' => 'GF-A-'.uniqid(),
            'is_active' => true,
        ]);

        $tenant = Tenant::create([
            'name' => 'Toko Parkir '.uniqid(),
            'branch_id' => $branch->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'Retail'])->id,
            'is_active' => true,
        ]);

        Tenancy::create([
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'status' => 'active',
            'start_date' => Carbon::today()->toDateString(),
        ]);

        return $tenant;
    }

    private function payload(Tenant $tenant, array $overrides = []): array
    {
        return array_merge([
            'form_mode' => 'parkir',
            'tenant_id' => $tenant->id,
            'activity_types' => ['langganan_parkir'],
            'request_date' => Carbon::today()->toDateString(),
            'pic_name' => 'Budi Penanggung Jawab',
            'vehicle_plate' => 'DA 1234 AB',
            'vehicle_type' => 'mobil',
            'applicant_name' => 'Siti Pemohon',
            'applicant_position' => 'Store Manager',
        ], $overrides);
    }

    public function test_parkir_uses_tc_number_and_supervisor_manager_chain(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());

        $permit = app(PermitRequestService::class)->create(
            $this->payload($tenant),
            $staff
        );

        $this->assertSame(['langganan_parkir'], $permit->activity_types);
        $this->assertSame('TC', PermitNumberService::codeFor($permit->activity_types));
        $this->assertStringContainsString('/TC/', $permit->permit_number);
        $this->assertSame('DA 1234 AB', $permit->vehicle_plate);
        $this->assertSame('mobil', $permit->vehicle_type);
        $this->assertSame('Siti Pemohon', $permit->applicant_name);
        $this->assertSame('Store Manager', $permit->applicant_position);
        $this->assertSame($tenant->name, $permit->store_name_snapshot);

        $steps = $permit->approvals()->orderBy('order')->get();
        $this->assertSame(['tenancy', 'branch_manager'], $steps->pluck('step_key')->all());
        $this->assertSame(['Approval Supervisor Tenant', 'Approval Manager Cabang'], $steps->pluck('label')->all());
        $this->assertNull($steps[1]->department_id);
    }

    public function test_customer_form_uses_tc_number_and_single_tenancy_approval(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $payload = [
            'form_mode' => 'customer',
            'customer_company_name' => 'PT Contoh Customer',
            'customer_invoice_address' => 'Jl. Contoh No. 1',
            'customer_company_phone' => '0511123456',
            'customer_npwp_number' => '',
            'customer_npwp_name' => '',
            'customer_npwp_address' => '',
            'customer_pic_name' => 'Budi Customer',
            'customer_pic_position' => 'Manager',
            'customer_pic_ktp' => '6371010101010001',
            'customer_pic_phone' => '081234567890',
            'customer_pic_email' => 'budi@example.test',
            'customer_tenant_relation' => '',
            'customer_billing_description' => 'Tagihan administrasi',
            'customer_amount' => '1500000',
            'customer_city' => 'Banjarmasin',
            'customer_notes' => '',
            'customer_request_date' => '2026-10-20',
        ];

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=customer')
            ->post('/permit-requests', $payload)
            ->assertRedirect();

        $permit = PermitRequest::latest('id')->firstOrFail();
        $this->assertSame(['customer_form'], $permit->activity_types);
        $this->assertSame('TC', PermitNumberService::codeFor($permit->activity_types));
        $this->assertSame('PT Contoh Customer', $permit->store_name_snapshot);
        $this->assertSame('Budi Customer', $permit->pic_name);
        $this->assertSame('2026-10-20', $permit->request_date->format('Y-m-d'));
        $this->assertSame(['tenancy'], $permit->approvals()->pluck('step_key')->all());
        $this->assertSame('Tenancy', $permit->approvals()->first()->department->name);
        $this->assertSame('1500000', (string) $permit->customer_form_data['customer_amount']);

        $this->actingAs($staff)
            ->get("/permit-requests/{$permit->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_customer_revision_tracks_date_and_resets_tenancy_approval(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['customer_form'],
            'request_date' => '2026-10-20',
            'customer_request_date' => '2026-10-20',
            'customer_company_name' => 'PT Contoh Customer',
            'customer_pic_name' => 'Budi Customer',
            'customer_pic_phone' => '081234567890',
            'customer_amount' => '1500000',
        ], $staff);
        $permit->approvals()->first()->update(['status' => 'approved', 'approved_by' => $staff->id, 'approved_at' => now()]);
        $permit->update(['status' => 'completed']);

        $revisionData = [
            'customer_company_name' => 'PT Contoh Customer',
            'customer_invoice_address' => 'Jl. Contoh No. 1',
            'customer_company_phone' => '0511123456',
            'customer_pic_name' => 'Budi Customer',
            'customer_pic_position' => 'Manager',
            'customer_pic_ktp' => '6371010101010001',
            'customer_pic_phone' => '081234567890',
            'customer_pic_email' => 'budi@example.test',
            'customer_billing_description' => 'Tagihan administrasi',
            'customer_amount' => '1500000',
            'customer_city' => 'Banjarmasin',
            'customer_request_date' => '2026-10-21',
            'reason' => 'Tanggal pengajuan perlu diperbarui.',
        ];

        $revision = app(PermitRequestService::class)->revise($permit, $revisionData, $staff);

        $this->assertSame('2026-10-20', $revision->changes['customer_request_date']['old']);
        $this->assertSame('2026-10-21', $revision->changes['customer_request_date']['new']);
        $this->assertSame('2026-10-21', $permit->fresh()->request_date->format('Y-m-d'));
        $this->assertSame('pending', $permit->fresh()->status);
        $this->assertSame('pending', $permit->approvals()->first()->status);
    }

    public function test_customer_approval_rejects_user_outside_tenancy_department(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $otherDepartmentStaff = $this->user('tenancy_staff', 'Building Service');
        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['customer_form'],
            'request_date' => '2026-10-20',
            'customer_company_name' => 'PT Contoh Customer',
            'customer_pic_name' => 'Budi Customer',
            'customer_pic_phone' => '081234567890',
        ], $staff);

        $this->actingAs($otherDepartmentStaff)
            ->post("/approvals/{$permit->approvals()->first()->id}/approve")
            ->assertSessionHasErrors('approval');

        $this->assertSame('pending', $permit->approvals()->first()->fresh()->status);
    }

    public function test_store_parkir_via_http_ignores_standard_permit_fields(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=parkir')
            ->post('/permit-requests', $this->payload($tenant, [
                'activity_types' => ['kerja'],
                'worker_count' => 0,
                'work_start_date' => null,
                'job_type' => 'Tidak boleh tersimpan',
            ]))
            ->assertRedirect();

        $permit = PermitRequest::latest('id')->firstOrFail();
        $this->assertSame(['langganan_parkir'], $permit->activity_types);
        $this->assertNull($permit->worker_count);
        $this->assertNull($permit->job_type);
        $this->assertSame('DA 1234 AB', $permit->vehicle_plate);
    }

    public function test_store_parkir_validates_required_fields(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());

        foreach (['vehicle_plate', 'vehicle_type', 'applicant_name', 'applicant_position'] as $field) {
            $this->actingAs($staff)
                ->from('/permit-requests/create?mode=parkir')
                ->post('/permit-requests', $this->payload($tenant, [$field => '']))
                ->assertSessionHasErrors($field);
        }

        $this->actingAs($staff)
            ->from('/permit-requests/create?mode=parkir')
            ->post('/permit-requests', $this->payload($tenant, ['tenant_id' => null]))
            ->assertSessionHasErrors('tenant_id');
    }

    public function test_create_parkir_mode_returns_active_tenants(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());

        $res = $this->actingAs($staff)->get('/permit-requests/create?mode=parkir');

        $res->assertOk();
        $this->assertSame('parkir', $res->viewData('page')['props']['formMode']);
        $row = collect($res->viewData('page')['props']['tenants'])->firstWhere('id', $tenant->id);
        $this->assertNotNull($row);
        $this->assertSame('GF', $row['floor']);
    }

    public function test_parkir_pdf_returns_form_langganan(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $res = $this->actingAs($staff)->get("/permit-requests/{$permit->id}/pdf");

        $res->assertOk();
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('Form-Langganan-Parkir-', $res->headers->get('Content-Disposition'));
        $this->assertStringContainsString('/Subtype /Image', $res->getContent());
    }

    public function test_parkir_pdf_view_matches_word_form_layout(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $html = view('pdf.permit-langganan-parkir', [
            'permit' => $permit,
            'tenantName' => $tenant->name,
            'lantai' => $permit->floor_snapshot ?: '—',
            'blok' => $permit->block_snapshot ?: '—',
            'nomor' => $permit->unit_number_snapshot ?: '—',
            'tanggal' => '20',
            'bulan' => 'Oktober',
            'tahun' => '2026',
            'vehicleTypeLabel' => 'MOBIL (R4)',
            'logoData' => 'data:image/png;base64,abc',
            'printedAt' => '20 Oktober 2026, 10:00 WITA',
        ])->render();

        $this->assertStringContainsString('data:image/png;base64,abc', $html);
        $this->assertStringContainsString('Form Langganan Parkir', $html);
        $this->assertStringContainsString('No. Pengajuan: '.$permit->permit_number, $html);
        $this->assertStringContainsString('Lantai : GF', $html);
        $this->assertStringContainsString('Blok : A', $html);
        $this->assertStringContainsString('No : '.$permit->unit_number_snapshot, $html);
        $this->assertStringContainsString('Nama : Siti Pemohon', $html);
        $this->assertStringContainsString('Jabatan : Store Manager', $html);
        $this->assertStringContainsString('Tenancy &amp; FO Dept.', $html);
        $this->assertStringContainsString('border-top: 0.5pt solid #000', $html);
        $this->assertStringContainsString('border-bottom: 0.5pt solid #000', $html);
        $this->assertStringNotContainsString('1px dotted', $html);
    }

    public function test_branch_manager_approval_is_limited_to_permit_branch(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $tenancyStep = $permit->approvals()->where('step_key', 'tenancy')->firstOrFail();
        $this->actingAs($staff)
            ->post("/approvals/{$tenancyStep->id}/approve")
            ->assertRedirect();

        $managerStep = $permit->approvals()->where('step_key', 'branch_manager')->firstOrFail();
        $otherManager = $this->user('manager', null, $this->branch('OTH'));

        $this->actingAs($otherManager)
            ->post("/approvals/{$managerStep->id}/approve")
            ->assertSessionHasErrors('approval');
        $this->assertSame('pending', $managerStep->fresh()->status);

        $branchManager = $this->user('manager', null, $this->branch());
        $this->actingAs($branchManager)
            ->post("/approvals/{$managerStep->id}/approve")
            ->assertRedirect();

        $this->assertSame('approved', $managerStep->fresh()->status);
        $this->assertSame('completed', $permit->fresh()->status);
    }

    public function test_show_exposes_branch_manager_action_only_to_same_branch_manager(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $branchManager = $this->user('manager', null, $this->branch());
        $otherManager = $this->user('manager', null, $this->branch('OTH'));

        $same = $this->actingAs($branchManager)->get("/permit-requests/{$permit->id}");
        $same->assertOk();
        $this->assertTrue($same->viewData('page')['props']['permit']['can_approve_branch_manager']);

        $other = $this->actingAs($otherManager)->get("/permit-requests/{$permit->id}");
        $other->assertOk();
        $this->assertFalse($other->viewData('page')['props']['permit']['can_approve_branch_manager']);
    }

    public function test_index_counts_parkir_separately_from_tenant(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $res = $this->actingAs($staff)->get('/permit-requests');
        $res->assertOk();

        $props = $res->viewData('page')['props'];
        $this->assertSame(1, $props['summary']['counts']['parkir']);
        $this->assertSame(0, $props['summary']['counts']['tenant']);
        $this->assertSame(1, $props['summary']['status']['pending']);
        $this->assertSame(1, $props['summary']['my_turn']);

        $row = collect($props['permits']['data'])->firstWhere('id', $permit->id);
        $this->assertNotNull($row);
        $this->assertSame('parkir', $row['category']);
        $this->assertSame(['Langganan Parkir'], $row['activity_labels']);

        $filteredProps = $this->actingAs($staff)->get('/permit-requests?status=completed')->viewData('page')['props'];
        $this->assertSame(1, $filteredProps['summary']['status']['pending']);
        $this->assertSame(0, $filteredProps['summary']['status']['completed']);

        $categoryProps = $this->actingAs($staff)->get('/permit-requests?category=parkir')->viewData('page')['props'];
        $this->assertSame(1, $categoryProps['summary']['filtered_total']);
        $this->assertSame(1, $categoryProps['summary']['status']['pending']);
        $this->assertSame(1, $categoryProps['summary']['my_turn']);
        $this->assertSame(0, $categoryProps['summary']['counts']['tenant']);
    }

    public function test_parkir_is_excluded_from_revision_flow(): void
    {
        $staff = $this->user('tenancy_staff', 'Tenancy');
        $tenant = $this->tenant($this->branch());
        $permit = app(PermitRequestService::class)->create($this->payload($tenant), $staff);

        $res = $this->actingAs($staff)->get("/permit-requests/{$permit->id}");

        $res->assertOk();
        $this->assertFalse($res->viewData('page')['props']['can_revise']);

        $this->actingAs($staff)
            ->post("/permit-requests/{$permit->id}/revise", [
                'work_start_date' => Carbon::today()->toDateString(),
                'work_end_date' => Carbon::today()->toDateString(),
                'reason' => 'Perubahan data parkir',
            ])
            ->assertStatus(422);
    }
}
