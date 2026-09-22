<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\PermitNumberService;
use App\Services\PermitRequestService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermitNumberTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        foreach (['permits.view', 'permits.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'manager']);
        $role->syncPermissions(['permits.view', 'permits.create']);
        $staff = User::create([
            'name' => 'Mgr', 'email' => 'mgr@t.id',
            'employee_number' => 'MGR-1', 'branch_id' => null,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('manager');

        return $staff;
    }

    private function payload(array $types = ['kerja']): array
    {
        return [
            'activity_types' => $types,
            'request_date' => '2026-09-22',
            'store_name_snapshot' => 'Area X',
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
            'work_end_time' => '17:00',
        ];
    }

    public function test_scan_expired_permit_returns_gone(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $permit = app(PermitRequestService::class)->create($this->payload(['kerja']), $staff);

        Carbon::setTestNow('2026-09-25 10:00');
        $this->assertTrue($permit->fresh()->is_expired);
        $this->actingAs($staff)->get('/scan/'.$permit->fresh()->scannableCode->token)->assertStatus(410);
        Carbon::setTestNow();
    }

    private function marketingStaff(): User
    {
        foreach (['permits.view', 'permits.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'marketing_staff']);
        $role->syncPermissions(['permits.view', 'permits.create']);
        $staff = User::create([
            'name' => 'Mkt', 'email' => 'mkt@t.id',
            'employee_number' => 'MKT-1', 'branch_id' => null,
            'password' => bcrypt('x'),
        ]);
        $staff->assignRole('marketing_staff');

        return $staff;
    }

    private function openCounterTenant(): Tenant
    {
        $cat = TenantCategory::firstOrCreate(['name' => 'Open Counter']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        return Tenant::create([
            'name' => 'Bazar Test', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
    }

    private function regularTenant(): Tenant
    {
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);
        $pc = ProductCategory::firstOrCreate(['name' => 'Retail']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        return Tenant::create([
            'name' => 'Toko Biasa', 'branch_id' => $branch->id,
            'tenant_category_id' => $cat->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
    }

    public function test_code_for_picks_ep_for_pameran(): void
    {
        $this->assertSame('E&P', PermitNumberService::codeFor(['pameran']));
        $this->assertSame('TC', PermitNumberService::codeFor(['kerja']));
    }

    public function test_sequential_numbers_unique_per_code(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $service = app(PermitRequestService::class);

        $a = $service->create($this->payload(['kerja']), $staff);
        $b = $service->create($this->payload(['kerja']), $staff);
        $c = $service->create($this->payload(['pameran']), $staff);

        $this->assertSame('001/TC/IX/26', $a->permit_number);
        $this->assertSame('002/TC/IX/26', $b->permit_number);
        $this->assertSame('001/E&P/IX/26', $c->permit_number);
        Carbon::setTestNow();
    }

    public function test_pameran_uses_marketing_chain(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $permit = app(PermitRequestService::class)->create($this->payload(['pameran']), $staff);

        $this->assertSame(
            ['marketing', 'finance', 'bs', 'security'],
            $permit->approvals()->orderBy('order')->pluck('step_key')->all()
        );
        Carbon::setTestNow();
    }

    public function test_store_rejects_manual_permit_number(): void
    {
        $staff = $this->staff();

        $this->actingAs($staff)->post('/permit-requests', $this->payload() + ['permit_number' => '999/TC/IX/26'])
            ->assertSessionHasErrors('permit_number');
    }

    public function test_marketing_create_locked_to_open_counter(): void
    {
        $mkt = $this->marketingStaff();
        $oc = $this->openCounterTenant();

        $res = $this->actingAs($mkt)->get('/permit-requests/create');
        $res->assertOk();
        $this->assertTrue($res->viewData('page')['props']['isMarketingLocked']);
        $this->assertCount(1, $res->viewData('page')['props']['tenants']);
    }

    public function test_marketing_rejects_non_open_counter_tenant(): void
    {
        $mkt = $this->marketingStaff();
        $regular = $this->regularTenant();

        $this->actingAs($mkt)->post('/permit-requests', [
            'tenant_id' => $regular->id,
            'request_date' => '2026-09-22',
            'stand_name' => 'Stand X',
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
            'pic_name' => 'Budi',
            'pic_phone' => '0811',
        ])->assertForbidden();
    }

    public function test_marketing_creates_exhibition_with_split_goods(): void
    {
        Carbon::setTestNow('2026-09-22');
        $mkt = $this->marketingStaff();
        $oc = $this->openCounterTenant();

        $res = $this->actingAs($mkt)->post('/permit-requests', [
            'tenant_id' => $oc->id,
            'request_date' => '2026-09-22',
            'stand_name' => 'Stand Kopi',
            'floor_snapshot' => 'GF',
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-24',
            'work_start_time' => '08:00',
            'work_end_time' => '17:00',
            'access_route' => 'Loading dock barat',
            'pic_name' => 'Budi',
            'pic_phone' => '0811',
            'goods_light' => [['description' => 'Gelas', 'quantity_note' => '10']],
            'goods_heavy' => [['description' => 'Meja', 'quantity_note' => '2']],
        ]);
        $res->assertRedirect();

        $permit = PermitRequest::where('permit_number', '001/E&P/IX/26')->firstOrFail();
        $this->assertSame('Bazar Test — Stand Kopi', $permit->store_name_snapshot);
        $this->assertSame(['light', 'heavy'], $permit->goods()->orderBy('id')->pluck('weight_class')->all());
        $this->assertSame(
            ['marketing', 'finance', 'bs', 'security'],
            $permit->approvals()->orderBy('order')->pluck('step_key')->all()
        );
        Carbon::setTestNow();
    }

    public function test_marketing_index_and_show_only_exhibition(): void
    {
        Carbon::setTestNow('2026-09-22');
        $mkt = $this->marketingStaff();
        $service = app(PermitRequestService::class);
        $umum = $service->create($this->payload(['kerja']), $this->staff());

        $res = $this->actingAs($mkt)->get('/permit-requests')->assertOk();
        $props = $res->viewData('page')['props'];
        $this->assertSame('pameran', $props['categoryLocked']);
        $this->assertSame('pameran', $props['filters']['category']);
        $numbers = collect($props['permits']['data'])->pluck('permit_number')->all();
        $this->assertNotContains($umum->permit_number, $numbers);
        $this->actingAs($mkt)->get("/permit-requests/{$umum->id}")
            ->assertForbidden();
        $res = $this->actingAs($mkt)->get('/permit-requests?category=tenant')->assertOk();
        $numbers = collect($res->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        $this->assertNotContains($umum->permit_number, $numbers);
        Carbon::setTestNow();
    }

    public function test_index_filters_by_category_search_and_activity(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $service = app(PermitRequestService::class);
        $pameran = $service->create($this->payload(['pameran']), $staff);
        $kerja = $service->create($this->payload(['kerja']), $staff);

        $numbers = function ($res) {
            return collect($res->viewData('page')['props']['permits']['data'])->pluck('permit_number')->all();
        };

        $res = $this->actingAs($staff)->get('/permit-requests?category=pameran')->assertOk();
        $this->assertContains($pameran->permit_number, $numbers($res));
        $this->assertNotContains($kerja->permit_number, $numbers($res));

        $res = $this->actingAs($staff)->get('/permit-requests?search='.urlencode($kerja->permit_number))->assertOk();
        $this->assertContains($kerja->permit_number, $numbers($res));
        $this->assertNotContains($pameran->permit_number, $numbers($res));

        $res = $this->actingAs($staff)->get('/permit-requests?activity_type=kerja')->assertOk();
        $this->assertContains($kerja->permit_number, $numbers($res));
        $this->assertNotContains($pameran->permit_number, $numbers($res));
        Carbon::setTestNow();
    }

    public function test_revise_resets_bs_and_logs_changes(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $service = app(PermitRequestService::class);
        $permit = $service->create($this->payload(['kerja']), $staff);

        $permit->approvals()->where('step_key', 'tenancy')->update(['status' => 'approved']);
        $permit->approvals()->where('step_key', 'bs')->update(['status' => 'approved']);

        $res = $this->actingAs($staff)->post("/permit-requests/{$permit->id}/revise", [
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-30',
            'work_end_time' => '18:00',
            'access_route' => 'Pintu timur',
            'reason' => 'Pekerjaan mundur seminggu karena material telat.',
        ]);
        $res->assertRedirect();

        $permit->refresh();
        $this->assertSame('2026-09-30', $permit->work_end_date->format('Y-m-d'));
        $this->assertSame('pending', $permit->approvals()->where('step_key', 'bs')->first()->status);
        $this->assertSame('pending', $permit->approvals()->where('step_key', 'security')->first()->status);
        $this->assertSame('approved', $permit->approvals()->where('step_key', 'tenancy')->first()->status);
        $this->assertSame('pending', $permit->status);

        $rev = $permit->revisions()->firstOrFail();
        $this->assertSame(1, $rev->revision_no);
        $this->assertArrayHasKey('work_end_date', $rev->changes);
        $this->assertSame('Pekerjaan mundur seminggu karena material telat.', $rev->reason);
        $this->assertTrue($permit->fresh()->expires_at->format('Y-m-d') === '2026-09-30');
        Carbon::setTestNow();
    }

    public function test_revise_rejected_when_completed_or_reason_short(): void
    {
        Carbon::setTestNow('2026-09-22');
        $staff = $this->staff();
        $permit = app(PermitRequestService::class)->create($this->payload(['kerja']), $staff);
        $permit->update(['status' => 'completed']);

        $this->actingAs($staff)->post("/permit-requests/{$permit->id}/revise", [
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-30',
            'reason' => 'Pekerjaan mundur seminggu.',
        ])->assertStatus(422);

        $permit->update(['status' => 'pending']);
        $this->actingAs($staff)->post("/permit-requests/{$permit->id}/revise", [
            'work_start_date' => '2026-09-23',
            'work_end_date' => '2026-09-30',
            'reason' => 'Pendek.',
        ])->assertSessionHasErrors('reason');
        Carbon::setTestNow();
    }
}
