<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class LooTenantSyncTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    private User $actor;

    private Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Storage::fake('public');

        $this->branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $this->unit = Unit::create([
            'branch_id' => $this->branch->id, 'floor' => 'GF',
            'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true,
        ]);

        foreach (['loos.view', 'loos.transition', 'tenants.view', 'tenants.edit', 'tenants.delete', 'loos.fitout_approve', 'loos.accounting_submit'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        Role::firstOrCreate(['name' => 'tenant_mgmt', 'guard_name' => 'web'])
            ->syncPermissions(['loos.view', 'loos.transition', 'tenants.view', 'tenants.edit', 'tenants.delete', 'loos.fitout_approve', 'loos.accounting_submit']);

        $this->actor = User::create([
            'name' => 'Aktor', 'email' => 'aktor-'.uniqid().'@t.id',
            'employee_number' => 'A-'.uniqid(),
            'branch_id' => $this->branch->id, 'password' => bcrypt('x'),
        ]);
        $this->actor->assignRole('tenant_mgmt');
    }

    private function makeLoo(string $status = 'pre_handover'): Loo
    {
        $loo = Loo::create([
            'loo_number' => Loo::generateLooNumber('TST', now()->year),
            'branch_id' => $this->branch->id,
            'marketing_id' => $this->actor->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'unit_id' => $this->unit->id,
            'prospective_tenant_name' => 'Kopi Senja',
            'status' => $status,
            'current_stage' => Loo::getStageFromStatus($status),
        ]);

        $this->fillSection($loo, 'legalitas', [
            'entity_name' => 'PT Senja Abadi',
            'entity_type' => 'PT',
            'npwp' => 'loos/1/sections/npwp.pdf',
            'nib' => 'loos/1/sections/nib.pdf',
            'sk_pendirian' => 'loos/1/sections/sk.pdf',
            'tgl_sk_pendirian' => '2020-01-15',
            'akta_perubahan_terakhir' => 'loos/1/sections/akta-perubahan.pdf',
            'surat_kuasa' => 'loos/1/sections/surat-kuasa.pdf',
            'ktp' => 'loos/1/sections/ktp.pdf',
            'ktp_badan_hukum' => 'loos/1/sections/ktp-badan-hukum.pdf',
            'pic_legal_name' => 'Sinta Legal',
            'pic_legal_phone' => '0812-0000-0001',
            'pic_legal_email' => 'legal@sENJA.test',
        ]);

        $this->fillSection($loo, 'biaya_termin', [
            'monthly_rent' => 45000000,
            'service_charge' => 5500000,
            'security_deposit' => 3,
            'fitout_dp_pct' => 30,
            'area_sqm_loo' => 120,
            'rent_per_sqm' => 375000,
            'contract_start_date' => '2026-10-01',
            'contract_end_date' => '2029-09-30',
        ]);

        $this->fillSection($loo, 'manajemen_tenant', [
            'brand_name' => 'Kopi Senja',
            'trade_name' => 'Senja Coffee',
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_categories' => [ProductCategory::firstOrCreate(['name' => 'F&B'])->id],
            'unit_id' => $this->unit->id,
            'contact_person_name' => 'Budi Customer',
            'contact_person_phone' => '0812-0000-0002',
            'contact_person_email' => 'budi@sENJA.test',
            'emergency_contact_name' => 'Dina Darurat',
            'emergency_contact_phone' => '0812-0000-0003',
        ]);

        $this->fillSection($loo, 'pre_fitout', [
            'contractor_pic_name' => 'Kontraktor Budi',
            'contractor_pic_phone' => '0812-0000-0004',
            'design_drawing_path' => null,
        ]);

        $this->fillSection($loo, 'ba_handover', [
            'handover_date' => '2026-09-28',
        ]);

        $this->fillSection($loo, 'pre_handover', [
            'final_inspection_date' => '2026-09-29',
        ]);

        return $loo;
    }

    private function fillSection(Loo $loo, string $key, array $data): void
    {
        $loo->sections()->create([
            'section_key' => $key,
            'section_label' => $key,
            'data' => $data,
            'is_submitted' => true,
            'submitted_at' => now(),
            'filled_by' => $this->actor->id,
            'filled_at' => now(),
        ]);
    }

    public function test_completed_loo_creates_tenant_and_tenancy(): void
    {
        $loo = $this->makeLoo();

        $this->actingAs($this->actor)
            ->post("/loos/{$loo->id}/transition", ['status' => 'completed'])
            ->assertRedirect();

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $this->assertNotNull($tenant, 'Tenant harus dibuat saat LOO completed');

        $this->assertSame('Kopi Senja', $tenant->name);
        $this->assertSame('PT Senja Abadi', $tenant->legal_entity_name);
        $this->assertSame('loos/1/sections/npwp.pdf', $tenant->npwp_file_path);
        $this->assertSame('loos/1/sections/nib.pdf', $tenant->nib_file_path);
        $this->assertSame('loos/1/sections/sk.pdf', $tenant->akta_file_path);
        $this->assertSame('loos/1/sections/akta-perubahan.pdf', $tenant->akta_perubahan_file_path);
        $this->assertSame('loos/1/sections/surat-kuasa.pdf', $tenant->power_of_attorney_file_path);
        $this->assertSame('loos/1/sections/ktp.pdf', $tenant->ktp_file_path);
        $this->assertSame('loos/1/sections/ktp-badan-hukum.pdf', $tenant->ktp_badan_hukum_file_path);
        $this->assertSame('Sinta Legal', $tenant->legal_pic_name);
        $this->assertSame('Kontraktor Budi', $tenant->fitout_pic_name);
        $this->assertSame('GF', $tenant->floor_map);
        $this->assertSame('GF-01', $tenant->location_map);
        $this->assertSame('Senja Coffee', $tenant->trade_name);
        $this->assertSame($this->branch->id, $tenant->branch_id);
        $this->assertTrue($tenant->is_active);

        $tenancy = $tenant->tenancies()->first();
        $this->assertNotNull($tenancy, 'Tenancy harus dibuat dari unit LOO');
        $this->assertSame($this->unit->id, $tenancy->unit_id);
        $this->assertSame('active', $tenancy->status);
        $this->assertSame('2026-10-01', $tenancy->start_date->toDateString());
        $this->assertSame('2029-09-30', $tenancy->end_date->toDateString());
        $this->assertEquals(45000000, $tenancy->rent_value);
        $this->assertEquals(5500000, $tenancy->service_charge);
        $this->assertEquals(120, $tenancy->total_area_sqm);
        $this->assertEquals(30, $tenancy->down_payment_percent);
        // deposit = 3 bulan x 45 juta
        $this->assertEquals(135000000, $tenancy->deposit_value);
    }

    public function test_completed_loo_tidak_buat_akun_portal(): void
    {
        $loo = $this->makeLoo();

        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $this->assertNotNull($tenant, 'Tenant tetap dibuat saat LOO completed');
        $this->assertFalse(Schema::hasTable('tenant_users'), 'Tabel akun portal harus sudah dihapus');
    }

    public function test_completed_loo_creates_contacts(): void
    {
        $loo = $this->makeLoo();

        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $types = $tenant->contacts()->pluck('type')->all();

        $this->assertContains('operasional', $types);
        $this->assertContains('darurat', $types);
    }

    public function test_sync_is_idempotent(): void
    {
        $loo = $this->makeLoo();

        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);
        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $this->assertSame(1, Tenant::where('loo_id', $loo->id)->count());
        $this->assertSame(1, Tenant::where('loo_id', $loo->id)->first()->tenancies()->count());
    }

    public function test_sync_ends_previous_tenancy_on_same_unit(): void
    {
        $previous = Tenant::create([
            'name' => 'Tenant Lama', 'branch_id' => $this->branch->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'F&B'])->id,
            'is_active' => true,
        ]);
        $old = $previous->tenancies()->create([
            'unit_id' => $this->unit->id,
            'status' => 'active',
            'start_date' => '2020-01-01',
        ]);

        $loo = $this->makeLoo();
        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $old->refresh();
        $this->assertSame('ended', $old->status);
    }

    public function test_sync_skipped_when_loo_not_completed(): void
    {
        $loo = $this->makeLoo('accounting_review');

        $this->actingAs($this->actor)
            ->post("/loos/{$loo->id}/transition", ['status' => 'tenant_mgmt_review'])
            ->assertRedirect();

        $this->assertDatabaseCount('tenants', 0);
    }

    public function test_sync_without_unit_skips_tenancy(): void
    {
        $loo = $this->makeLoo();
        $loo->update(['unit_id' => null]);

        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $this->assertNotNull($tenant, 'Tenant tetap dibuat walau unit belum ada');
        $this->assertSame(0, $tenant->tenancies()->count());
    }

    public function test_loo_backed_tenant_only_allows_pic_edit(): void
    {
        $loo = $this->makeLoo();
        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $this->assertTrue($tenant->isLooBacked());

        // Coba ubah field non-PIC + PIC sekaligus. Field non-PIC harus diabaikan.
        $this->actingAs($this->actor)->put("/tenants/{$tenant->id}", [
            'name' => 'NAMA BARU HARUS DIABAIKAN',
            'legal_entity_name' => 'PT BARU HARUS DIABAIKAN',
            'npwp_number' => '99.999.999.9-999.999',
            'pic_name' => 'PIC Baru',
            'pic_phone' => '0899',
            'company_phone' => '0898',
        ])->assertRedirect();

        $tenant->refresh();
        $this->assertSame('Kopi Senja', $tenant->name, 'nama tidak boleh diubah');
        $this->assertSame('PT Senja Abadi', $tenant->legal_entity_name, 'legal entity tidak boleh diubah');
        $this->assertSame('loos/1/sections/npwp.pdf', $tenant->npwp_file_path, 'file npwp tidak boleh diubah');
        $this->assertSame('PIC Baru', $tenant->pic_name, 'PIC boleh diubah');
        $this->assertSame('0899', $tenant->pic_phone);
        $this->assertSame('0898', $tenant->company_phone);
    }

    public function test_legacy_tenant_allows_full_edit(): void
    {
        $legacy = Tenant::create([
            'name' => 'Legacy', 'branch_id' => $this->branch->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'F&B'])->id,
            'is_active' => true,
        ]);

        $this->assertFalse($legacy->isLooBacked());

        $this->actingAs($this->actor)->put("/tenants/{$legacy->id}", [
            'name' => 'Legacy Baru',
            'legal_entity_name' => 'PT Legacy',
            'tenant_category_id' => $legacy->tenant_category_id,
            'product_category_id' => $legacy->product_category_id,
            'branch_id' => $this->branch->id,
        ])->assertRedirect();

        $legacy->refresh();
        $this->assertSame('Legacy Baru', $legacy->name);
        $this->assertSame('PT Legacy', $legacy->legal_entity_name);
    }

    public function test_loo_backed_tenant_cannot_be_deleted(): void
    {
        $loo = $this->makeLoo();
        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();

        $this->actingAs($this->actor)
            ->delete("/tenants/{$tenant->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('tenant');

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_sync_only_reads_submitted_sections(): void
    {
        $loo = $this->makeLoo();
        // Tandai legalitas belum disubmit
        $loo->sections()->where('section_key', 'legalitas')->update(['is_submitted' => false]);

        $this->actingAs($this->actor)->post("/loos/{$loo->id}/transition", ['status' => 'completed']);

        $tenant = Tenant::where('loo_id', $loo->id)->first();
        $this->assertNull($tenant->legal_entity_name, 'section belum submit tidak boleh ikut tersinkron');
        $this->assertSame('Kopi Senja', $tenant->name, 'section submit tetap ikut tersinkron');
    }
}
