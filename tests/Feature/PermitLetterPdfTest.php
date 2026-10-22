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
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitLetterPdfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TenantCategorySeeder::class);
        $this->seed(DepartmentSeeder::class);
        config(['permit.enabled' => true]);
        Carbon::setTestNow(Carbon::create(2026, 10, 22, 10, 0, 0, 'Asia/Makassar'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function staff(Branch $branch): User
    {
        foreach (['permits.view', 'permits.create'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $role = Role::firstOrCreate(['name' => 'tenancy_staff', 'guard_name' => 'web']);
        $role->syncPermissions(['permits.view', 'permits.create']);
        $user = User::create([
            'name' => 'Staff Tenancy',
            'email' => 'staff'.uniqid().'@t.id',
            'employee_number' => 'STF-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('password'),
        ]);
        $user->assignRole('tenancy_staff');

        return $user;
    }

    private function tenant(Branch $branch): Tenant
    {
        $cat = TenantCategory::first();
        $prodCat = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create([
            'unit_code' => 'DM1-GF-01',
            'unit_number' => '01',
            'branch_id' => $branch->id,
            'floor' => 'Ground Floor',
            'block' => 'A',
            'status' => 'occupied',
        ]);

        $t = Tenant::create([
            'tenant_category_id' => $cat->id,
            'branch_id' => $branch->id,
            'product_category_id' => $prodCat->id,
            'name' => 'Kopi Kenangan',
            'company_name' => 'PT Bumi Berkah',
            'brand_name' => 'Kopi Kenangan',
            'status' => 'active',
            'phone' => '08123456789',
        ]);

        Tenancy::create([
            'tenant_id' => $t->id,
            'unit_id' => $unit->id,
            'status' => 'active',
            'start_date' => Carbon::now()->subMonths(1),
            'end_date' => Carbon::now()->addYear(),
        ]);

        return $t;
    }

    public function test_sik_pdf_matches_dmb_format_and_downloads_properly(): void
    {
        $branch = Branch::create(['name' => 'Duta Mall 1', 'code' => 'DM1']);
        $staff = $this->staff($branch);
        $tenant = $this->tenant($branch);

        $permit = app(PermitRequestService::class)->create([
            'activity_types' => ['kerja', 'masuk_barang'],
            'request_date' => Carbon::today()->toDateString(),
            'tenant_id' => $tenant->id,
            'job_type' => 'Pemasangan Interior & Rak Kasir',
            'access_route' => 'Loading Dock Barat',
            'pic_name' => 'Budi Santoso',
            'pic_phone' => '081233344455',
            'work_start_date' => Carbon::today()->toDateString(),
            'work_end_date' => Carbon::today()->addDays(2)->toDateString(),
            'work_start_time' => '22:00',
            'work_end_time' => '05:00',
            'worker_count' => 2,
            'contractor_company' => 'CV Mandiri Karya',
            'contractor_pic' => 'Andi Wijaya',
            'contractor_phone' => '081999888777',
            'contractor_address' => 'Jl. Veteran No. 45 Banjarmasin',
            'notes' => 'Harap menggunakan APD lengkap dan menjaga kebersihan area kerja.',
            'goods' => [
                ['description' => 'Bor Listrik Makita', 'quantity' => 2, 'unit' => 'unit'],
                ['description' => 'Kayu Multiplek 12mm', 'quantity' => 10, 'unit' => 'lembar'],
            ],
        ], $staff);

        $permit->workers()->createMany([
            ['name' => 'Ahmad Dani'],
            ['name' => 'Bambang Irawan'],
        ]);

        $res = $this->actingAs($staff)->get("/permit-requests/{$permit->id}/pdf");
        $res->assertOk();
        $this->assertStringContainsString('application/pdf', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('Surat-Izin-', $res->headers->get('Content-Disposition'));

        // Render view HTML directly to assert the DMB reference layout contents
        $html = view('pdf.permit-letter', [
            'permit' => $permit->fresh(['workers', 'goods', 'tenant', 'approvals']),
            'requestedByLabel' => 'Kopi Kenangan',
            'activityLabels' => collect(['Kerja', 'Masuk Barang']),
            'location' => 'Ground Floor / A / 01',
            'schedule' => '22 Oktober 2026 s/d 24 Oktober 2026',
            'time' => '22.00–05.00 WITA',
            'requestDate' => '22 Oktober 2026',
            'goodsPhotos' => [],
            'statusLabel' => 'Menunggu Persetujuan',
            'printedAt' => '22 Oktober 2026, 10:00 WITA',
            'leftSigner' => ['role' => 'Tenancy', 'approval' => null],
            'rightSigner' => ['role' => 'Building Service', 'approval' => null],
            'isKegiatan' => false,
            'kegiatanNameLabel' => 'Nama Kegiatan',
            'securityStep' => null,
            'tenancyStep' => null,
            'bsStep' => null,
            'managerStep' => null,
            'workersPresent' => 2,
            'workersTotal' => 2,
            'goodsVerified' => 2,
            'goodsTotal' => 2,
            'scanUrl' => 'http://localhost/permits/scan/test-token',
            'logoData' => null,
            'hariTgl' => 'Kamis, 22 Oktober 2026',
            'isKerja' => true,
            'isLembur' => false,
            'isBarang' => true,
            'isAlat' => false,
            'isBukaTutup' => false,
            'isFitout' => false,
            'startDate' => '22 Oktober 2026',
            'endDate' => '24 Oktober 2026',
            'startTime' => '22.00 WITA',
            'endTime' => '05.00 WITA',
            'goodsRows' => ['Bor Listrik Makita (2 unit)', 'Kayu Multiplek 12mm (10 lembar)'],
            'tenantPhone' => '08123456789',
            'workers' => $permit->workers,
        ])->render();

        $this->assertStringContainsString('SURAT IJIN', $html);
        $this->assertStringContainsString('Always Ahead...!', $html);
        $this->assertStringContainsString('1. KERJA', $html);
        $this->assertStringContainsString('3. MASUK / KELUAR BARANG', $html);
        $this->assertStringContainsString('Data Kontraktor', $html);
        $this->assertStringContainsString('CV Mandiri Karya', $html);
        $this->assertStringContainsString('Daftar Nama Pekerja', $html);
        $this->assertStringContainsString('Ahmad Dani', $html);
        $this->assertStringContainsString('Bambang Irawan', $html);
        $this->assertStringContainsString('Daftar Barang / Peralatan Kerja / Properti', $html);
        $this->assertStringContainsString('Bor Listrik Makita (2 unit)', $html);
        $this->assertStringContainsString('Pekerjaan', $html);
        $this->assertStringContainsString('Pemasangan Interior &amp; Rak Kasir', $html);
        $this->assertStringContainsString('Loading Dock Barat', $html);
        $this->assertStringContainsString('Pemohon,', $html);
        $this->assertStringContainsString('Tenant / Kontraktor', $html);
        $this->assertStringContainsString('Tenancy Department', $html);
        $this->assertStringContainsString('Apabila form ini tidak diperlihatkan, maka security berhak menghentikan kegiatan.', $html);
        $this->assertStringContainsString('1. Lembar putih untuk pemohon', $html);
        $this->assertStringContainsString('2. Lembar biru untuk security loading dock', $html);
        $this->assertStringContainsString('3. Lembar kuning untuk building service', $html);
        $this->assertStringContainsString('4. Lembar merah untuk arsip', $html);
        $this->assertStringContainsString('Jl. A. Yani Km. 2', $html);
    }
}
