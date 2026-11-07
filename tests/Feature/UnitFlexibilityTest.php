<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\UnitGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UnitFlexibilityTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
    }

    private function userWithPermissions(array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role = Role::firstOrCreate(['name' => 'unit-tester', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Unit Tester',
            'email' => 'unit-'.uniqid().'@t.id',
            'employee_number' => 'U-'.uniqid(),
            'branch_id' => $this->branch->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function unit(string $number, array $attributes = []): Unit
    {
        return Unit::create([
            'branch_id' => $this->branch->id,
            'floor' => 'GF',
            'unit_number' => $number,
            'unit_code' => 'GF-'.$number,
            'is_active' => true,
            ...$attributes,
        ]);
    }

    private function makeLoo(): Loo
    {
        $user = $this->userWithPermissions(['loos.view', 'loos.transition']);

        return Loo::create([
            'loo_number' => Loo::generateLooNumber($this->branch->code, now()->year),
            'branch_id' => $this->branch->id,
            'marketing_id' => $user->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    public function test_internal_and_grouped_units_are_hidden_from_loo_unit_picker(): void
    {
        $unitUser = $this->userWithPermissions(['loos.view']);
        $loo = $this->makeLoo();

        $leasable = $this->unit('01');
        $internal = $this->unit('02', ['usage_type' => 'internal']);
        $grouped = $this->unit('03');

        $group = UnitGroup::create(['branch_id' => $this->branch->id, 'name' => 'Area Gabungan']);
        $group->units()->sync([$grouped->id => ['is_primary' => true]]);

        $response = $this->actingAs($unitUser)
            ->getJson("/loos/{$loo->id}/units")
            ->assertOk();

        $names = collect($response->json())->pluck('name')->all();

        $this->assertContains($leasable->unit_code, $names);
        $this->assertNotContains($internal->unit_code, $names);
        $this->assertNotContains($grouped->unit_code, $names);
    }

    public function test_unit_index_counts_internal_units_separately_from_vacant(): void
    {
        $user = $this->userWithPermissions(['units.view']);

        $this->unit('01');
        $this->unit('02', ['usage_type' => 'internal']);

        $this->actingAs($user)
            ->get('/units')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Master/Units/Index')
                ->where('summary.total', 2)
                ->where('summary.internal', 1)
                ->where('summary.vacant', 1));
    }

    public function test_internal_unit_can_only_have_one_active_assignment(): void
    {
        $user = $this->userWithPermissions(['units.edit']);
        $unit = $this->unit('01', ['usage_type' => 'internal']);

        $this->actingAs($user)->post("/units/{$unit->id}/assignments", [
            'pic_name' => 'Petugas A',
            'started_at' => '2026-11-01',
        ])->assertRedirect();

        $this->actingAs($user)->post("/units/{$unit->id}/assignments", [
            'pic_name' => 'Petugas B',
            'started_at' => '2026-11-02',
        ])->assertSessionHasErrors('assignment');

        $active = $unit->assignments()->whereNull('ended_at')->first();
        $this->assertNotNull($active);
        $this->assertSame('Petugas A', $active->pic_name);

        $this->actingAs($user)
            ->put("/units/{$unit->id}/assignments/{$active->id}/end", ['ended_at' => '2026-11-05'])
            ->assertRedirect();

        $this->assertSame('2026-11-05', $active->fresh()->ended_at->toDateString());

        $this->actingAs($user)->post("/units/{$unit->id}/assignments", [
            'pic_name' => 'Petugas B',
            'started_at' => '2026-11-06',
        ])->assertRedirect();

        $this->assertSame(2, $unit->assignments()->count());
        $this->assertSame(1, $unit->assignments()->whereNull('ended_at')->count());
    }

    public function test_a_unit_cannot_join_two_groups(): void
    {
        $user = $this->userWithPermissions(['units.create']);
        $first = $this->unit('01');
        $second = $this->unit('02');

        $this->actingAs($user)->post('/unit-groups', [
            'branch_id' => $this->branch->id,
            'name' => 'Area Satu',
            'unit_ids' => [$first->id],
        ])->assertRedirect();

        $this->actingAs($user)->post('/unit-groups', [
            'branch_id' => $this->branch->id,
            'name' => 'Area Dua',
            'unit_ids' => [$first->id, $second->id],
        ])->assertSessionHasErrors('unit_ids');

        $this->assertSame(1, UnitGroup::count());
        $this->assertSame(1, $first->group()->count());
    }

    public function test_group_qr_scan_sends_guest_to_staff_login(): void
    {
        $group = UnitGroup::create(['branch_id' => $this->branch->id, 'name' => 'Area QR']);
        $group->units()->sync([$this->unit('01')->id => ['is_primary' => true]]);

        $this->get($group->scanUrl)
            ->assertRedirect(route('login'));
    }
}
