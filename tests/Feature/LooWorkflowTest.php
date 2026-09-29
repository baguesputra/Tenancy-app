<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\TenantCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LooWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName): User
    {
        foreach (['loos.view', 'loos.create', 'loos.edit', 'loos.transition'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions(['loos.view', 'loos.create', 'loos.edit', 'loos.transition']);

        $user = User::create([
            'name' => 'Test '.$roleName,
            'email' => $roleName.'@t.id',
            'employee_number' => 'T-'.uniqid(),
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function makeLoo(): Loo
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);

        return Loo::create([
            'loo_number' => Loo::generateLooNumber($branch->code, 2026),
            'branch_id' => $branch->id,
            'marketing_id' => $this->userWithRole('marketing_loo_input')->id,
            'tenant_category_id' => $cat->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    public function test_loo_number_is_generated_and_sequential(): void
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $first = Loo::generateLooNumber($branch->code, 2026);
        $this->assertSame('LOO/2026/TST/0001', $first);

        $this->makeLoo();
        $second = Loo::generateLooNumber($branch->code, 2026);
        $this->assertSame('LOO/2026/TST/0002', $second);
    }

    public function test_stage_follows_status_transition(): void
    {
        $loo = $this->makeLoo();
        $this->assertSame('marketing', $loo->current_stage);

        $loo->updateStatus('legal_review');
        $this->assertSame('legal_review', $loo->fresh()->status);
        $this->assertSame('legal', $loo->fresh()->current_stage);

        $loo->updateStatus('accounting_review');
        $this->assertSame('accounting', $loo->fresh()->current_stage);

        $loo->updateStatus('fitout');
        $this->assertSame('fitout', $loo->fresh()->current_stage);

        $loo->updateStatus('completed');
        $fresh = $loo->fresh();
        $this->assertSame('completed', $fresh->status);
        $this->assertNotNull($fresh->completed_at);
    }

    public function test_cancel_stamps_cancelled_at(): void
    {
        $loo = $this->makeLoo();
        $loo->updateStatus('cancelled');
        $this->assertNotNull($loo->fresh()->cancelled_at);
    }

    public function test_index_requires_auth(): void
    {
        $this->get('/loos')->assertRedirect('/login');
    }

    public function test_marketing_sees_index_and_can_create(): void
    {
        $marketing = $this->userWithRole('marketing_loo_input');

        $this->actingAs($marketing)->get('/loos')->assertOk();
        $this->actingAs($marketing)->get('/loos/create')->assertOk();

        $this->makeLoo();
        $this->actingAs($marketing)->get('/loos')->assertOk();
    }

    public function test_user_cannot_edit_loo_from_other_branch(): void
    {
        $loo = $this->makeLoo();
        $other = User::create([
            'name' => 'Other Branch',
            'email' => 'other@t.id',
            'employee_number' => 'O-1',
            'branch_id' => Branch::create(['code' => 'OTH', 'name' => 'Cabang Lain'])->id,
            'password' => bcrypt('x'),
        ]);
        $other->assignRole('marketing_loo_input');

        $this->actingAs($other)->get("/loos/{$loo->id}")->assertForbidden();
    }
}
