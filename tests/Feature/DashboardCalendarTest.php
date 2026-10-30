<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\LooSection;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
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

    private function manager(array $permissions = []): User
    {
        $role = Role::firstOrCreate(['name' => 'manager']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        if ($permissions !== []) {
            $role->givePermissionTo($permissions);
        }

        $staff = User::create([
            'name' => 'Mgr', 'employee_number' => 'MGR-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    private function calendarEvents(User $user, string $month): \Illuminate\Support\Collection
    {
        $res = $this->actingAs($user)->get("/dashboard?cal_month={$month}")->assertOk();

        return collect($res->viewData('page')['props']['calendar']['events']);
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

    public function test_calendar_contains_national_holidays(): void
    {
        Carbon::setTestNow('2026-03-01');
        $mgr = $this->manager();

        $res = $this->actingAs($mgr)->get('/dashboard?cal_month=2026-03')->assertOk();
        $holidays = collect($res->viewData('page')['props']['calendar']['events'])
            ->filter(fn ($e) => in_array($e['type'], ['libur_nasional', 'cuti_bersama'], true));

        $this->assertCount(7, $holidays);
        $nyepi = $holidays->firstWhere('id', 'holiday-2026-03-19');
        $this->assertSame('Hari Suci Nyepi (Tahun Baru Saka 1948)', $nyepi['title']);
        $this->assertNull($nyepi['url']);

        $september = $this->actingAs($mgr)->get('/dashboard?cal_month=2026-09')->assertOk();
        $this->assertEmpty(collect($september->viewData('page')['props']['calendar']['events'])
            ->filter(fn ($e) => in_array($e['type'], ['libur_nasional', 'cuti_bersama'], true)));

        Carbon::setTestNow();
    }

    public function test_calendar_marks_kegiatan_with_kind_prefix(): void
    {
        Carbon::setTestNow('2026-09-22');
        $mgr = $this->manager();

        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $tenant = Tenant::create([
            'name' => 'Toko B', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id, 'is_active' => true,
        ]);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '02', 'unit_code' => 'GF-02', 'is_active' => true]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'start_date' => '2026-01-01', 'status' => 'active',
        ]);

        app(PermitRequestService::class)->create([
            'activity_types' => ['event'], 'request_date' => '2026-09-22',
            'tenant_id' => $tenant->id,
            'event_name' => 'Beauty Class', 'event_area' => 'Atrium',
            'work_start_date' => '2026-09-25', 'work_end_date' => '2026-09-27',
        ], $mgr);

        $res = $this->actingAs($mgr)->get('/dashboard?cal_month=2026-09')->assertOk();
        $events = collect($res->viewData('page')['props']['calendar']['events']);
        $kegiatan = $events->firstWhere('type', 'kegiatan');
        $this->assertNotNull($kegiatan);
        $this->assertStringStartsWith('Event:', $kegiatan['title']);
        $this->assertStringContainsString('/EVT/', $kegiatan['title']);
        $this->assertSame('2026-09-25', $kegiatan['start']);
        $this->assertSame('2026-09-27', $kegiatan['end']);
        Carbon::setTestNow();
    }

    /** Parkir & customer tidak punya rentang kerja — harus muncul lewat request_date. */
    public function test_calendar_includes_parkir_and_customer_without_work_dates(): void
    {
        Carbon::setTestNow('2026-10-20');
        $mgr = $this->manager();

        app(PermitRequestService::class)->create([
            'activity_types' => ['langganan_parkir'], 'request_date' => '2026-10-20',
            'store_name_snapshot' => 'ZAP', 'vehicle_plate' => 'DA 1234 AD',
            'vehicle_type' => 'mobil', 'applicant_name' => 'Wicaksono',
            'applicant_position' => 'Store Manager',
        ], $mgr);

        app(PermitRequestService::class)->create([
            'activity_types' => ['customer_form'], 'request_date' => '2026-10-28',
            'customer_company_name' => 'PT Customer Uji',
            'customer_pic_name' => 'Budi', 'customer_pic_phone' => '0812',
            'customer_pic_email' => 'budi@example.test',
            'customer_billing_description' => 'Tagihan',
        ], $mgr);

        $events = $this->calendarEvents($mgr, '2026-10');

        $parkir = $events->firstWhere('type', 'parkir');
        $this->assertNotNull($parkir, 'Agenda parkir harus muncul di kalender.');
        $this->assertSame('2026-10-20', $parkir['start']);
        $this->assertSame('2026-10-20', $parkir['end']);
        $this->assertStringContainsString('/PRK/', $parkir['title']);
        $this->assertStringContainsString('DA 1234 AD', $parkir['title']);
        $this->assertStringStartsWith('/permit-requests/', $parkir['url']);

        $customer = $events->firstWhere('type', 'customer');
        $this->assertNotNull($customer, 'Agenda customer harus muncul di kalender.');
        $this->assertSame('2026-10-28', $customer['start']);
        $this->assertStringContainsString('/CST/', $customer['title']);

        Carbon::setTestNow();
    }

    /** Isi & submit di detik yang sama = satu agenda, bukan dua. */
    public function test_calendar_dedupes_section_filled_submitted_same_instant(): void
    {
        Carbon::setTestNow('2026-10-24');
        $mgr = $this->manager(['loos.view']);

        $loo = Loo::create([
            'loo_number' => 'LOO/2026/TST/0001',
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'marketing_id' => $mgr->id,
            'prospective_tenant_name' => 'Calon Tenant',
            'status' => 'draft',
            'loo_received_date' => '2026-10-24',
        ]);

        $instant = Carbon::parse('2026-10-24 05:36:17');

        LooSection::create([
            'loo_id' => $loo->id, 'section_key' => 'legalitas', 'section_label' => 'Legalitas',
            'filled_at' => $instant, 'submitted_at' => $instant->copy(), 'is_submitted' => true,
        ]);
        LooSection::create([
            'loo_id' => $loo->id, 'section_key' => 'biaya_termin', 'section_label' => 'Biaya & Termin',
            'filled_at' => Carbon::parse('2026-10-24 06:00:52'), 'submitted_at' => null,
        ]);

        $events = $this->calendarEvents($mgr, '2026-10');

        $legalitas = $events->filter(fn ($e) => str_contains($e['title'], 'Legalitas'));
        $this->assertCount(1, $legalitas, 'Section dengan isi == submit harus jadi satu agenda.');
        $this->assertSame('section_submitted', $legalitas->first()['type']);
        $this->assertStringContainsString('diisi & disubmit', $legalitas->first()['title']);

        $this->assertCount(1, $events->filter(fn ($e) => $e['type'] === 'section_filled' && str_contains($e['title'], 'Biaya')));

        Carbon::setTestNow();
    }

    /** Kontrak yang hanya jatuh di luar bulan tampilan tidak boleh menyelinap masuk. */
    public function test_calendar_does_not_leak_adjacent_month_contracts(): void
    {
        Carbon::setTestNow('2026-10-10');
        $mgr = $this->manager();

        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $tenant = Tenant::create([
            'name' => 'Toko Luar Bulan', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id, 'is_active' => true,
        ]);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '09', 'unit_code' => 'GF-09', 'is_active' => true]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'start_date' => '2026-01-01', 'end_date' => '2026-11-05',
            'status' => 'active',
        ]);

        // September: kontrak berakhir 5 Nov berada di luar September. Dulu jendela
        // "segera" (now..now+30d) menyuntikkannya ke sini; sekarang warn window
        // hanya dipakai saat membuka bulan berjalan.
        $september = $this->calendarEvents($mgr, '2026-09');
        $this->assertCount(0, $september->filter(fn ($e) => str_contains((string) $e['title'], 'Toko Luar Bulan')));

        // Oktober = bulan berjalan: tanggal berakhirnya masuk lewat warn window 30 hari.
        $october = $this->calendarEvents($mgr, '2026-10');
        $this->assertCount(1, $october->filter(fn ($e) => $e['type'] === 'contract_end' && str_contains((string) $e['title'], 'Toko Luar Bulan')));

        Carbon::setTestNow();
    }
}
