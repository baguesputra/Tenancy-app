<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\UnitGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UnitPackageTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
    }

    private function userWith(array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role = Role::firstOrCreate(['name' => 'unit-package-tester', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Package Tester',
            'email' => 'package-'.uniqid().'@t.id',
            'employee_number' => 'P-'.uniqid(),
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
            'block' => 'A',
            'unit_number' => $number,
            'unit_code' => 'GF-A-'.$number,
            'is_active' => true,
            ...$attributes,
        ]);
    }

    private function tenant(string $name): Tenant
    {
        return Tenant::create([
            'name' => $name,
            'branch_id' => $this->branch->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'product_category_id' => ProductCategory::firstOrCreate(['name' => 'F&B'])->id,
            'is_active' => true,
        ]);
    }

    private function occupy(Unit $unit, Tenant $tenant): void
    {
        $tenant->tenancies()->create([
            'unit_id' => $unit->id,
            'status' => 'active',
            'start_date' => '2026-01-01',
        ]);
    }

    private function makeLoo(?Tenant $tenant = null): Loo
    {
        $user = $this->userWith(['loos.view', 'loos.transition', 'loos.tenant_mgmt_edit']);

        return Loo::create([
            'loo_number' => Loo::generateLooNumber($this->branch->code, now()->year),
            'branch_id' => $this->branch->id,
            'marketing_id' => $user->id,
            'tenant_id' => $tenant?->id,
            'tenant_category_id' => TenantCategory::firstOrCreate(['name' => 'Tenant'])->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);
    }

    private function createGroup(User $user, array $unitIds, array $payload = []): void
    {
        $this->actingAs($user)->post('/unit-groups', [
            'branch_id' => $this->branch->id,
            'name_auto' => true,
            'unit_ids' => $unitIds,
            ...$payload,
        ])->assertRedirect();
    }

    public function test_selecting_one_unit_pulls_every_unit_of_the_same_tenant(): void
    {
        $user = $this->userWith(['units.create']);
        $tenant = $this->tenant('Kopi Senja');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);

        $this->createGroup($user, [$first->id]);

        $group = UnitGroup::firstOrFail();
        $members = $group->units()->pluck('units.id')->sort()->values()->all();
        $this->assertSame([$first->id, $second->id], $members);
    }

    public function test_tenant_with_a_single_unit_is_not_a_package(): void
    {
        $user = $this->userWith(['units.create']);
        $tenant = $this->tenant('Kopi Senja');
        $only = $this->unit('01');
        $this->occupy($only, $tenant);
        $this->unit('02');

        $this->createGroup($user, [$only->id]);

        $this->assertSame([$only->id], UnitGroup::firstOrFail()->units()->pluck('units.id')->all());
    }

    public function test_package_only_takes_units_not_already_in_another_area(): void
    {
        $user = $this->userWith(['units.create']);
        $tenant = $this->tenant('Kopi Senja');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $third = $this->unit('03');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);
        $this->occupy($third, $tenant);

        $existing = UnitGroup::create(['branch_id' => $this->branch->id, 'name' => 'Area Lama']);
        $existing->units()->sync([$third->id => ['is_primary' => true]]);

        $this->createGroup($user, [$first->id]);

        $group = UnitGroup::where('name', '!=', 'Area Lama')->firstOrFail();
        $members = $group->units()->pluck('units.id')->sort()->values()->all();
        $this->assertSame([$first->id, $second->id], $members);
    }

    public function test_leftover_units_below_two_are_not_a_package(): void
    {
        $user = $this->userWith(['units.create']);
        $tenant = $this->tenant('Kopi Senja');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);

        $existing = UnitGroup::create(['branch_id' => $this->branch->id, 'name' => 'Area Lama']);
        $existing->units()->sync([$second->id => ['is_primary' => true]]);

        $this->createGroup($user, [$first->id]);

        $group = UnitGroup::where('name', '!=', 'Area Lama')->firstOrFail();
        $this->assertSame([$first->id], $group->units()->pluck('units.id')->all());
    }

    public function test_loo_expands_package_when_tenant_id_matches(): void
    {
        $tenant = $this->tenant('Kopi Senja');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);

        $loo = $this->makeLoo($tenant);
        $loo->update(['status' => 'pengisian_divisi', 'current_stage' => 'marketing']);
        $user = $this->userWith(['loos.view', 'loos.transition', 'loos.tenant_mgmt_edit']);

        $this->actingAs($user)->post("/loos/{$loo->id}/sections/manajemen_tenant", [
            'brand_name' => 'Kopi Senja',
            'unit_ids' => [$first->id],
        ])->assertRedirect();

        $data = $loo->sections()->where('section_key', 'manajemen_tenant')->first()->data;
        $stored = array_map('intval', $data['unit_ids']);
        sort($stored);
        $this->assertSame([$first->id, $second->id], $stored);
    }

    public function test_loo_does_not_expand_units_of_the_previous_tenant(): void
    {
        $tenant = $this->tenant('Kopi Senja');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);

        // LOO untuk tenant baru: tenant_id masih kosong.
        $loo = $this->makeLoo(null);
        $loo->update(['status' => 'pengisian_divisi', 'current_stage' => 'marketing']);
        $user = $this->userWith(['loos.view', 'loos.transition', 'loos.tenant_mgmt_edit']);

        $this->actingAs($user)->post("/loos/{$loo->id}/sections/manajemen_tenant", [
            'brand_name' => 'Toko Baru',
            'unit_ids' => [$first->id],
        ])->assertRedirect();

        $data = $loo->sections()->where('section_key', 'manajemen_tenant')->first()->data;
        $this->assertSame([$first->id], array_map('intval', $data['unit_ids']));
    }

    public function test_unit_picker_sends_package_only_for_matching_tenant(): void
    {
        $tenant = $this->tenant('Kopi Senja');
        $other = $this->tenant('Toko Lain');
        $first = $this->unit('01');
        $second = $this->unit('02');
        $third = $this->unit('03');
        $this->occupy($first, $tenant);
        $this->occupy($second, $tenant);
        $this->occupy($third, $other);

        $loo = $this->makeLoo($tenant);
        $user = $this->userWith(['loos.view']);

        $rows = collect($this->actingAs($user)
            ->getJson("/loos/{$loo->id}/units")
            ->assertOk()
            ->json())->keyBy('id');

        $package = collect($rows[$first->id]['package'])->pluck('id')->sort()->values()->all();
        $this->assertSame([$first->id, $second->id], $package);
        $this->assertSame([], $rows[$third->id]['package']);
        $this->assertSame('Kopi Senja', $rows[$first->id]['tenant_name']);
    }

    public function test_group_index_exposes_tenant_of_each_unit(): void
    {
        $user = $this->userWith(['units.view']);
        $tenant = $this->tenant('Kopi Senja');
        $unit = $this->unit('01');
        $this->occupy($unit, $tenant);

        $this->actingAs($user)
            ->get('/unit-groups')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Master/Units/Groups')
                ->where('units.0.tenant_id', $tenant->id)
                ->where('units.0.tenant_name', 'Kopi Senja'));
    }
}
