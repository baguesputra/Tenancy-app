<?php

namespace Tests\Feature\Settings;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\GateSyncLog;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GateSyncTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        Permission::firstOrCreate(['name' => 'settings.access']);
        Permission::firstOrCreate(['name' => 'gate.sync']);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->syncPermissions(['settings.access', 'gate.sync']);
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

    private function tree(array $over = []): array
    {
        return array_merge([
            'id' => 'comp-1', 'code' => 'DMB', 'name' => 'Duta Mall Banjarmasin',
            'departments' => [[
                'id' => 'dept-1', 'name' => 'Tenancy',
                'divisions' => [[
                    'id' => 'div-1', 'name' => 'Ops',
                    'positions' => [['id' => 'pos-1', 'name' => 'Staff', 'level' => 7]],
                ]],
                'positions' => [],
            ]],
            'direct_divisions' => [],
        ], $over);
    }

    private function fakeGate(array $users = [], array $companies = [], ?array $tree = null): void
    {
        Http::fake([
            '*/api/companies/*/tree' => Http::response(['success' => true, 'data' => $tree ?? $this->tree()], 200),
            '*/api/users*' => Http::response(['success' => true, 'data' => $users], 200),
            '*/api/companies*' => Http::response(['success' => true, 'data' => $companies], 200),
        ]);
    }

    private function karyawan(array $over = []): array
    {
        return array_merge([
            'id' => 'gate-1', 'name' => 'Budi', 'email' => 'budi@dutamall.com',
            'nik' => 'NIK-1', 'is_active' => true,
            'company_id' => 'comp-1', 'position_id' => 'pos-1',
        ], $over);
    }

    public function test_index_tampil_ringkas_dan_riwayat(): void
    {
        $this->fakeGate([], [['id' => 'comp-1', 'name' => 'PT A', 'code' => 'PTA']]);

        $this->actingAs($this->admin())
            ->get(route('settings.gate.index'))
            ->assertOk();
    }

    public function test_sync_master_dari_tree_tanpa_mapping(): void
    {
        $this->fakeGate([], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-master'), ['company_id' => 'comp-1'])
            ->assertRedirect();

        $this->assertSame('Tenancy', Department::where('gate_id', 'dept-1')->value('name'));
        $this->assertSame('Ops', Division::where('gate_id', 'div-1')->value('name'));
        $this->assertSame('Staff', Position::where('gate_id', 'pos-1')->value('name'));
    }

    public function test_sync_karyawan_resolve_branch_tanpa_map(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync'))
            ->assertRedirect();

        $user = User::where('employee_number', 'NIK-1')->firstOrFail();
        $this->assertSame('BJM', $user->branch->code);
        $this->assertSame('dept-1', $user->department->gate_id);
        $this->assertSame('div-1', $user->division->gate_id);
        $this->assertSame('pos-1', $user->position->gate_id);
        $this->assertTrue($user->hasRole('staff'));
    }

    public function test_sync_idempoten(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));
        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $this->assertSame(1, User::where('employee_number', 'NIK-1')->count());
    }

    public function test_sync_simpan_foto_dan_tolak_url_tidak_aman(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $foto = 'https://gate.appdutamall.com/storage/photos/budi.jpg';
        $this->fakeGate([$this->karyawan(['photo_url' => $foto])]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $this->assertSame($foto, User::where('employee_number', 'NIK-1')->value('photo_url'));

        $this->fakeGate([$this->karyawan(['nik' => 'NIK-2', 'email' => 'budi2@dutamall.com', 'photo_url' => 'javascript:alert(1)'])]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $this->assertNull(User::where('employee_number', 'NIK-2')->value('photo_url'));
    }

    public function test_sync_semua_dan_catat_riwayat(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync'))
            ->assertRedirect();

        $this->assertTrue(User::where('employee_number', 'NIK-1')->exists());
        $log = GateSyncLog::where('kind', 'semua')->firstOrFail();
        $this->assertSame(1, $log->count_baru);
        $this->assertSame(1, $log->count_departemen);
    }

    public function test_tanpa_permission_ditolak(): void
    {
        $user = User::create([
            'name' => 'Staff', 'employee_number' => 'STF-1',
            'branch_id' => Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin'])->id,
            'password' => bcrypt('x'),
        ]);

        $this->actingAs($user)
            ->post(route('settings.gate.sync-karyawan'))
            ->assertForbidden();
    }
}
