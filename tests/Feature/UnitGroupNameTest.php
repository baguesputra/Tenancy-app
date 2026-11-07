<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Unit;
use App\Models\UnitGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UnitGroupNameTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        foreach (['units.view', 'units.create', 'units.edit'] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role = Role::firstOrCreate(['name' => 'unit-group-tester', 'guard_name' => 'web']);
        $role->syncPermissions(['units.view', 'units.create', 'units.edit']);

        $this->user = User::create([
            'name' => 'Group Tester',
            'email' => 'group-'.uniqid().'@t.id',
            'employee_number' => 'G-'.uniqid(),
            'branch_id' => $this->branch->id,
            'password' => bcrypt('x'),
        ]);
        $this->user->assignRole($role);
    }

    private function unit(string $number, string $block = 'A', array $attributes = []): Unit
    {
        return Unit::create([
            'branch_id' => $this->branch->id,
            'floor' => 'GF',
            'block' => $block,
            'unit_number' => $number,
            'unit_code' => 'GF-'.$block.'-'.$number,
            'is_active' => true,
            ...$attributes,
        ]);
    }

    private function createGroup(array $unitIds, array $payload = []): void
    {
        $this->actingAs($this->user)->post('/unit-groups', [
            'branch_id' => $this->branch->id,
            'unit_ids' => $unitIds,
            ...$payload,
        ])->assertRedirect();
    }

    public function test_consecutive_units_become_a_range(): void
    {
        $units = [$this->unit('1'), $this->unit('2'), $this->unit('3')];

        $this->createGroup(collect($units)->pluck('id')->all(), ['name_auto' => true]);

        $group = UnitGroup::firstOrFail();
        $this->assertSame('A1-3', $group->name);
        $this->assertTrue($group->name_auto);
    }

    public function test_gapped_units_are_listed_explicitly(): void
    {
        $units = [$this->unit('2'), $this->unit('4'), $this->unit('6')];

        $this->createGroup(collect($units)->pluck('id')->all(), ['name_auto' => true]);

        $this->assertSame('A2+A4+A6', UnitGroup::firstOrFail()->name);
    }

    public function test_ranges_and_singles_can_mix(): void
    {
        $units = [$this->unit('1'), $this->unit('2'), $this->unit('3'), $this->unit('5')];

        $this->createGroup(collect($units)->pluck('id')->all(), ['name_auto' => true]);

        $this->assertSame('A1-3+A5', UnitGroup::firstOrFail()->name);
    }

    public function test_generated_name_gets_suffix_when_group_name_already_used(): void
    {
        $existing = UnitGroup::create([
            'branch_id' => $this->branch->id,
            'name' => 'A1-2',
        ]);

        $units = [$this->unit('1'), $this->unit('2')];
        $this->createGroup(collect($units)->pluck('id')->all(), ['name_auto' => true]);

        $group = UnitGroup::whereKeyNot($existing->id)->firstOrFail();
        $this->assertSame('A1-2 (2)', $group->name);
    }

    public function test_manual_name_cannot_collide_with_unit_number(): void
    {
        $this->unit('12');
        $units = [$this->unit('1'), $this->unit('2')];

        $this->actingAs($this->user)->post('/unit-groups', [
            'branch_id' => $this->branch->id,
            'name' => 'A12',
            'name_auto' => false,
            'unit_ids' => collect($units)->pluck('id')->all(),
        ])->assertSessionHasErrors('name');

        $this->assertSame(0, UnitGroup::count());
    }

    public function test_auto_name_recalculates_when_members_change(): void
    {
        $first = $this->unit('1');
        $second = $this->unit('2');
        $third = $this->unit('3');

        $this->createGroup([$first->id, $second->id], ['name_auto' => true]);

        $group = UnitGroup::firstOrFail();
        $this->assertSame('A1-2', $group->name);

        $this->actingAs($this->user)->put("/unit-groups/{$group->id}", [
            'branch_id' => $this->branch->id,
            'name_auto' => true,
            'unit_ids' => [$first->id, $second->id, $third->id],
        ])->assertRedirect();

        $this->assertSame('A1-3', $group->fresh()->name);
    }

    public function test_manual_name_is_preserved_when_members_change(): void
    {
        $first = $this->unit('1');
        $second = $this->unit('2');
        $third = $this->unit('3');

        $this->createGroup([$first->id, $second->id], ['name' => 'Area Kopi', 'name_auto' => false]);

        $group = UnitGroup::firstOrFail();
        $this->assertSame('Area Kopi', $group->name);
        $this->assertFalse($group->name_auto);

        $this->actingAs($this->user)->put("/unit-groups/{$group->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'Area Kopi',
            'name_auto' => false,
            'unit_ids' => [$first->id, $second->id, $third->id],
        ])->assertRedirect();

        $this->assertSame('Area Kopi', $group->fresh()->name);
    }

    public function test_very_long_name_falls_back_to_area_code(): void
    {
        $units = [];
        for ($number = 1; $number <= 33; $number += 2) {
            $units[] = $this->unit((string) $number);
        }

        $this->createGroup(collect($units)->pluck('id')->all(), ['name_auto' => true]);

        $this->assertStringStartsWith('AREA-A-', UnitGroup::firstOrFail()->name);
    }
}
