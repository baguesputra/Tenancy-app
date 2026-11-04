<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionService;
use Database\Seeders\ChecklistSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class InspectionCompletedAtTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @return array{0: User, 1: InspectionSession, 2: Inspection} */
    private function makeInspection(): array
    {
        $branch = Branch::create(['name' => 'Cabang Test', 'code' => 'TST']);
        $tc = TenantCategory::create(['name' => 'Tenant']);
        $pc = ProductCategory::create(['name' => 'Retail']);
        $this->seed(ChecklistSeeder::class);

        $tenant = Tenant::create([
            'name' => 'Toko Uji', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        $unit = Unit::create(['branch_id' => $branch->id, 'floor' => '1', 'unit_number' => '12']);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id, 'status' => 'active',
            'start_date' => now()->toDateString(),
        ]);

        $user = User::create([
            'name' => 'Inspector', 'email' => 'insp@t.id',
            'employee_number' => 'INSP-1', 'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]);
        foreach (['sidak.view', 'sidak.manage', 'sidak.answer'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'inspector']);
        $role->syncPermissions(['sidak.view', 'sidak.manage', 'sidak.answer']);
        $user->assignRole('inspector');

        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $user->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        return [$user, $session, app(InspectionService::class)->addInspection($session, $tenant)];
    }

    public function test_complete_mencatat_jam_selesai_dan_muncul_di_payload(): void
    {
        [$user, $session, $inspection] = $this->makeInspection();

        $this->actingAs($user)->post("/inspections/{$inspection->id}/complete")->assertRedirect();

        $completedAt = $inspection->fresh()->completed_at;
        $this->assertNotNull($completedAt);

        $this->actingAs($user)->get("/inspection-sessions/{$session->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('InspectionSessions/Show')
                ->where('session.ended_at', null)
                ->where('session.inspections.0.completed_at', $completedAt->toISOString())
            );

        $this->actingAs($user)->get("/inspections/{$inspection->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inspections/Show')
                ->where('inspection.completed_at', $completedAt->toISOString())
            );
    }

    public function test_complete_berulang_tidak_menggeser_jam_selesai(): void
    {
        [$user, , $inspection] = $this->makeInspection();

        $this->actingAs($user)->post("/inspections/{$inspection->id}/complete");
        $first = $inspection->fresh()->completed_at;

        $this->travel(2)->hours();
        $this->actingAs($user)->post("/inspections/{$inspection->id}/complete");

        $this->assertTrue($first->equalTo($inspection->fresh()->completed_at));
    }

    public function test_data_lama_tanpa_completed_at_terkirim_null(): void
    {
        [$user, $session, $inspection] = $this->makeInspection();
        $inspection->update(['status' => 'completed']); // riwayat lama: selesai sebelum kolom ada

        $this->actingAs($user)->get("/inspection-sessions/{$session->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('session.inspections.0.completed_at', null));
    }
}
