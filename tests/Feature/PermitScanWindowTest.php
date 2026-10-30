<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\PermitRequest;
use App\Models\PermitScanSetting;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\PermitScanWindowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PermitScanWindowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function at(int $day, int $hour, int $minute = 0): void
    {
        // 2026-10-26 = Senin.
        Carbon::setTestNow(Carbon::create(2026, 10, 26 + ($day - 1), $hour, $minute, 0, 'Asia/Makassar'));
    }

    private function makePermit(array $overrides = []): PermitRequest
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        $tenant = Tenant::create(['name' => 'Toko Uji', 'branch_id' => $branch->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);
        Tenancy::create(['unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'status' => 'active', 'start_date' => '2026-10-01']);
        $staff = User::create(['name' => 'Staff', 'email' => 'staff@t.id', 'employee_number' => 'STF-1', 'branch_id' => $branch->id, 'password' => bcrypt('x')]);

        return PermitRequest::create([
            'permit_number' => 'IZN-'.uniqid(),
            'activity_types' => ['kerja'],
            'request_date' => '2026-10-26',
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'store_name_snapshot' => $tenant->name,
            'pic_name' => 'PIC Toko',
            'pic_phone' => '081234567890',
            'job_type' => 'Perbaikan lampu',
            'work_start_date' => '2026-10-26',
            'work_end_date' => '2026-11-15',
            'requested_by_type' => User::class,
            'requested_by_id' => $staff->id,
            'barcode_token' => (string) Str::uuid(),
            'status' => 'completed',
            ...$overrides,
        ])->load('scannableCode');
    }

    public function test_scan_diblokir_di_luar_jam(): void
    {
        $permit = $this->makePermit();
        $this->at(1, 12); // Senin 12.00 — jendela tutup.

        $res = $this->get("/scan/{$permit->scannableCode->token}");

        $res->assertStatus(403);
        $this->assertSame('Scan/Closed', $res->viewData('page')['component']);
        $res->assertSee($permit->permit_number);
    }

    public function test_scan_dibuka_pada_jam_akses(): void
    {
        $permit = $this->makePermit();

        $this->at(1, 23); // Senin malam.
        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();

        $this->at(1, 7); // Senin pagi sebelum 08.50.
        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();
    }

    public function test_batas_pagi_senin_sampai_sabtu_0850(): void
    {
        $permit = $this->makePermit();

        $this->at(1, 8, 50);
        $this->get("/scan/{$permit->scannableCode->token}")->assertStatus(403);
    }

    public function test_minggu_pagi_tutup_0950(): void
    {
        $permit = $this->makePermit();

        $this->at(7, 9, 30);
        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();

        $this->at(7, 10);
        $this->get("/scan/{$permit->scannableCode->token}")->assertStatus(403);
    }

    public function test_permit_pameran_tidak_dibatasi_jam(): void
    {
        $permit = $this->makePermit(['activity_types' => ['pameran']]);
        $this->at(1, 12);

        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();
    }

    public function test_pembatasan_nonaktif_membuka_scan_kapan_saja(): void
    {
        PermitScanSetting::simpan(['enabled' => false, 'windows' => PermitScanSetting::defaults()]);
        $permit = $this->makePermit();
        $this->at(1, 12);

        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();
    }

    public function test_hari_dimatikan_menutup_akses_seharian(): void
    {
        $windows = PermitScanSetting::defaults();
        $windows['1']['enabled'] = false;
        PermitScanSetting::simpan(['enabled' => true, 'windows' => $windows]);
        $permit = $this->makePermit();

        $this->at(1, 23); // Senin malam — hari Senin dimatikan.
        $this->get("/scan/{$permit->scannableCode->token}")->assertStatus(403);

        $this->at(1, 7); // Senin pagi — tutup pagi Senin ikut mati.
        $this->get("/scan/{$permit->scannableCode->token}")->assertStatus(403);

        $this->at(2, 7); // Selasa pagi — masih sesi Senin malam, hari Selasa aktif.
        $this->get("/scan/{$permit->scannableCode->token}")->assertOk();
    }

    public function test_ringkasan_jam_sesuai_default(): void
    {
        $summary = app(PermitScanWindowService::class)->summary();

        $this->assertSame('Senin–Sabtu 22.10–08.50 · Minggu 22.10–09.50', $summary);
    }

    public function test_setting_disimpan_dan_divalidasi(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        Permission::firstOrCreate(['name' => 'settings.permit_scan']);
        Role::firstOrCreate(['name' => 'admin'])->syncPermissions(['settings.permit_scan']);
        $admin = User::create([
            'name' => 'Admin', 'email' => 'admin@t.id',
            'employee_number' => 'ADM-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        $admin->assignRole('admin');

        $windows = PermitScanSetting::defaults();
        $windows['7']['close'] = '10:00';

        $this->actingAs($admin)->put('/settings/permit-scan', [
            'enabled' => true,
            'windows' => $windows,
        ])->assertRedirect();

        $this->assertSame('10:00', PermitScanSetting::current()->windows['7']['close']);

        $this->actingAs($admin)->put('/settings/permit-scan', [
            'enabled' => true,
            'windows' => ['1' => ['open' => '22:10', 'close' => 'jam-salah', 'enabled' => true]],
        ])->assertSessionHasErrors('windows.1.close');
    }
}
