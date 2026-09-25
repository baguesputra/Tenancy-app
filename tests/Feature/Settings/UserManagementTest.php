<?php

namespace Tests\Feature\Settings;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        Permission::firstOrCreate(['name' => 'settings.access']);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->syncPermissions(['settings.access']);
        $user = User::firstOrCreate(
            ['employee_number' => 'ADM-1'],
            [
                'name' => 'Admin',
                'branch_id' => Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin'])->id,
                'password' => bcrypt('x'),
            ]
        );
        if (! $user->hasRole('admin')) {
            $user->assignRole('admin');
        }

        return $user->fresh();
    }

    public function test_update_simpan_divisi_dan_jabatan(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin']);
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $div = Division::create(['name' => 'Ops', 'department_id' => $dept->id]);
        $pos = Position::create(['name' => 'Staff', 'department_id' => $dept->id, 'division_id' => $div->id]);
        $user = User::create([
            'name' => 'Budi', 'employee_number' => 'NIK-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
        ]);
        $user->assignRole('staff');

        $this->actingAs($this->admin())->put("/settings/users/{$user->id}", [
            'name' => 'Budi', 'employee_number' => 'NIK-1',
            'branch_id' => $branch->id, 'department_id' => $dept->id,
            'division_id' => $div->id, 'position_id' => $pos->id,
            'role' => 'staff',
        ])->assertRedirect();

        $user->refresh();
        $this->assertSame($dept->id, $user->department_id);
        $this->assertSame($div->id, $user->division_id);
        $this->assertSame($pos->id, $user->position_id);
    }

    public function test_index_tampil_dengan_filter_org(): void
    {
        $this->actingAs($this->admin())
            ->get(route('settings.users.index'))
            ->assertOk();
    }

    public function test_gate_update_hanya_role(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin']);
        $user = User::create([
            'name' => 'Gate User', 'employee_number' => 'NIK-G',
            'branch_id' => $branch->id, 'password' => bcrypt('x'),
            'gate_id' => 'gate-9',
        ]);
        $user->assignRole('staff');

        $this->actingAs($this->admin())->put("/settings/users/{$user->id}", [
            'role' => 'manager',
        ])->assertRedirect();

        $user->refresh();
        $this->assertTrue($user->hasRole('manager'));
        $this->assertSame('Gate User', $user->name);
        $this->assertSame($branch->id, $user->branch_id);
    }
}
