<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\PermitRequest;
use App\Models\ProductCategory;
use App\Models\ScannableCode;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicScanTest extends TestCase
{
    use RefreshDatabase;

    private function seedTenant(Branch $branch): Tenant
    {
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => 'GF', 'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true]);
        $tenant = Tenant::create(['name' => 'Toko Publik', 'branch_id' => $branch->id, 'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id, 'is_active' => true]);
        Tenancy::create(['unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'status' => 'active', 'start_date' => now()->toDateString()]);

        return $tenant;
    }

    private function makePermit(Tenant $tenant, array $overrides = []): PermitRequest
    {
        $staff = User::create(['name' => 'Staff', 'email' => 'staff@t.id', 'employee_number' => 'STF-1', 'branch_id' => $tenant->branch_id, 'password' => bcrypt('x')]);

        return PermitRequest::create([
            'permit_number' => 'IZN-'.uniqid(),
            'activity_types' => ['kerja'],
            'request_date' => now()->toDateString(),
            'tenant_id' => $tenant->id,
            'branch_id' => $tenant->branch_id,
            'store_name_snapshot' => $tenant->name,
            'pic_name' => 'PIC Toko',
            'pic_phone' => '081234567890',
            'job_type' => 'Perbaikan lampu',
            'work_start_date' => now()->toDateString(),
            'work_end_date' => now()->addDays(2)->toDateString(),
            'requested_by_type' => User::class,
            'requested_by_id' => $staff->id,
            'barcode_token' => (string) Str::uuid(),
            'status' => 'completed',
            ...$overrides,
        ])->load('scannableCode');
    }

    public function test_guest_bisa_lihat_status_izin_tanpa_login(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $permit = $this->makePermit($this->seedTenant($branch));
        $permit->approvals()->create(['label' => 'Tenancy', 'status' => 'approved', 'order' => 1, 'step_key' => 'tenancy', 'notes' => 'catatan internal rahasia']);

        $res = $this->get("/scan/{$permit->scannableCode->token}");

        $res->assertOk();
        $res->assertSee($permit->permit_number);
        $res->assertSee('Toko Publik');
        // Data sensitif tidak boleh bocor ke publik:
        $res->assertDontSee('081234567890');
        $res->assertDontSee('catatan internal rahasia');
    }

    public function test_guest_lihat_halaman_expired_untuk_izin_kedaluwarsa(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $permit = $this->makePermit($this->seedTenant($branch), [
            'work_start_date' => now()->subDays(3)->toDateString(),
            'work_end_date' => now()->subDay()->toDateString(),
        ]);

        $this->get("/scan/{$permit->scannableCode->token}")
            ->assertStatus(410)
            ->assertSee($permit->permit_number);
    }

    public function test_guest_bisa_lihat_hasil_sidak_selesai_tanpa_login(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tenant = $this->seedTenant($branch);
        $staff = User::create(['name' => 'Inspector', 'email' => 'insp@t.id', 'employee_number' => 'INSP-1', 'branch_id' => $branch->id, 'password' => bcrypt('x')]);
        $session = InspectionSession::create(['branch_id' => $branch->id, 'user_id' => $staff->id, 'started_at' => now(), 'status' => 'completed']);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $tenant->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => ['template_name' => 'F&B Std', 'sections' => [
                ['id' => 's1', 'title' => 'Kebersihan', 'items' => [['id' => 'i1', 'label' => 'Lantai bersih']]],
            ]],
            'status' => 'completed',
            'notes' => 'catatan internal inspektur',
        ]);
        $token = ScannableCode::create(['token' => (string) Str::uuid(), 'scannable_type' => Inspection::class, 'scannable_id' => $inspection->id])->token;

        $res = $this->get("/scan/{$token}");

        $res->assertOk();
        $res->assertSee('F&B Std', false);
        $res->assertSee('Lantai bersih');
        $res->assertDontSee('catatan internal inspektur');
    }

    public function test_guest_tidak_bisa_lihat_sidak_belum_selesai(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tenant = $this->seedTenant($branch);
        $staff = User::create(['name' => 'Inspector', 'email' => 'insp@t.id', 'employee_number' => 'INSP-1', 'branch_id' => $branch->id, 'password' => bcrypt('x')]);
        $session = InspectionSession::create(['branch_id' => $branch->id, 'user_id' => $staff->id, 'started_at' => now(), 'status' => 'in_progress']);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $inspection = Inspection::create([
            'inspection_session_id' => $session->id,
            'tenant_id' => $tenant->id,
            'checklist_template_id' => $template->id,
            'checklist_snapshot' => ['template_name' => 'F&B Std', 'sections' => []],
            'status' => 'pending',
        ]);
        $token = ScannableCode::create(['token' => (string) Str::uuid(), 'scannable_type' => Inspection::class, 'scannable_id' => $inspection->id])->token;

        $this->get("/scan/{$token}")->assertNotFound();
    }

    public function test_guest_scan_unit_diarahkan_ke_login_staff(): void
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $this->seedTenant($branch);
        $unit = Unit::where('branch_id', $branch->id)->first();

        $this->get("/scan/{$unit->scannableCode->token}")->assertRedirect(route('login'));
    }
}
