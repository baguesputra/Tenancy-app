<?php

namespace Tests\Feature\Settings;

use App\Jobs\SinkronKaryawanJit;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\GateSyncLog;
use App\Models\GateSyncSetting;
use App\Models\Position;
use App\Models\User;
use App\Services\Gate\GateClient;
use App\Services\Gate\SinkronisasiKaryawanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
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

    /**
     * Satu fake dengan urutan respons untuk /api/users — panggilan ke-n memakai
     * body ke-n (Http::fake berikutnya tidak menimpa stub lama).
     */
    private function fakeGateUrut(array $bodyPerPanggilan, array $companies = []): void
    {
        $urut = Http::sequence();
        foreach ($bodyPerPanggilan as $body) {
            $urut->push($body, 200);
        }

        Http::fake([
            '*/api/companies/*/tree' => Http::response(['success' => true, 'data' => $this->tree()], 200),
            '*/api/users*' => $urut,
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

    public function test_simpan_jadwal_validasi_dan_simpan(): void
    {
        $this->actingAs($this->admin())
            ->post(route('settings.gate.jadwal'), [
                'schedule_enabled' => true,
                'karyawan_interval_minutes' => 30,
                'master_daily_at' => '03:15',
                'jit_enabled' => true,
                'grace_miss_count' => 3,
            ])->assertRedirect();

        $set = GateSyncSetting::current();
        $this->assertSame(30, (int) $set->karyawan_interval_minutes);
        $this->assertSame('03:15', $set->master_daily_at);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.jadwal'), ['karyawan_interval_minutes' => 1, 'master_daily_at' => 'xx', 'grace_miss_count' => 0])
            ->assertSessionHasErrors(['karyawan_interval_minutes', 'master_daily_at', 'grace_miss_count']);
    }

    public function test_hilang_dua_kali_jadi_nonaktif(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        GateSyncSetting::simpan(['grace_miss_count' => 2]);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync'));
        $this->assertTrue(User::where('employee_number', 'NIK-1')->firstOrFail()->is_active);

        // Daftar valid berisi orang lain — NIK-1 tidak ada di dalamnya.
        $lain = $this->karyawan(['id' => 'gate-2', 'nik' => 'NIK-2', 'email' => 'budi2@dutamall.com']);
        $this->mock(GateClient::class, fn ($mock) => $mock->shouldReceive('ambilKaryawan')->andReturn([$lain]));

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));
        $this->assertSame(1, (int) User::where('employee_number', 'NIK-1')->firstOrFail()->gate_miss_count);
        $this->assertTrue(User::where('employee_number', 'NIK-1')->firstOrFail()->is_active);

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));
        $this->assertFalse(User::where('employee_number', 'NIK-1')->firstOrFail()->is_active);
    }

    public function test_daftar_kosong_tidak_memicu_nonaktif(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->mock(GateClient::class, fn ($mock) => $mock->shouldReceive('ambilKaryawan')->andReturn([]));

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $user = User::where('employee_number', 'NIK-1')->firstOrFail();
        $this->assertTrue($user->is_active);
        $this->assertSame(0, (int) $user->gate_miss_count);
    }

    public function test_sync_terfilter_tidak_menandai_user_di_luar_scope(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $lain = $this->karyawan(['id' => 'gate-9', 'nik' => 'NIK-9', 'email' => 'lain@dutamall.com']);
        $this->fakeGateUrut([
            ['success' => true, 'data' => [$this->karyawan()]],
            ['success' => true, 'data' => [$lain]],
        ], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'), ['company_id' => 'comp-9'])
            ->assertRedirect();

        $luarScope = User::where('employee_number', 'NIK-1')->firstOrFail();
        $this->assertSame(0, (int) $luarScope->gate_miss_count);
        $this->assertTrue($luarScope->is_active);
        $this->assertTrue(User::where('employee_number', 'NIK-9')->exists());
    }

    public function test_sync_limit_tidak_menandai_user_di_luar_batas(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $dua = [$this->karyawan(), $this->karyawan(['id' => 'gate-2', 'nik' => 'NIK-2', 'email' => 'budi2@dutamall.com'])];
        $tiga = [...$dua, $this->karyawan(['id' => 'gate-3', 'nik' => 'NIK-3', 'email' => 'budi3@dutamall.com'])];
        $this->fakeGateUrut([
            ['success' => true, 'data' => $dua],
            ['success' => true, 'data' => $tiga],
        ], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'), ['limit' => 1])
            ->assertRedirect();

        $diLuarBatas = User::where('employee_number', 'NIK-2')->firstOrFail();
        $this->assertSame(0, (int) $diLuarBatas->gate_miss_count);
        $this->assertTrue($diLuarBatas->is_active);
    }

    public function test_sync_baca_semua_halaman_paginasi(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $nik2 = $this->karyawan(['id' => 'gate-2', 'nik' => 'NIK-2', 'email' => 'budi2@dutamall.com']);
        $this->fakeGateUrut([
            ['success' => true, 'data' => [$this->karyawan(), $nik2]],
            ['success' => true, 'data' => ['data' => [$this->karyawan()], 'current_page' => 1, 'last_page' => 2, 'next_page_url' => 'https://gate/api/users?page=2']],
            ['success' => true, 'data' => ['data' => [$nik2], 'current_page' => 2, 'last_page' => 2, 'next_page_url' => null]],
        ], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $user = User::where('employee_number', 'NIK-2')->firstOrFail();
        $this->assertSame(0, (int) $user->gate_miss_count);
        $this->assertTrue($user->is_active);
    }

    public function test_deaktivasi_dibatasi_persen_per_run(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin']);
        foreach (range(1, 10) as $i) {
            User::create([
                'name' => "Karyawan {$i}", 'employee_number' => "NIK-{$i}",
                'email' => "k{$i}@dutamall.com", 'gate_id' => "gate-{$i}",
                'branch_id' => $branch->id, 'password' => bcrypt('x'), 'is_active' => true,
            ]);
        }
        GateSyncSetting::simpan(['grace_miss_count' => 1]);

        // Gate hanya mengembalikan 1 dari 10 karyawan → 9 di luar daftar.
        $this->fakeGate([$this->karyawan()], []);

        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        // 9 kandidat, batas aman 20% dari 10 = 2 → hanya 2 yang nonaktif.
        $this->assertSame(8, User::whereNotNull('gate_id')->where('is_active', true)->count());
        $this->assertSame(2, User::whereNotNull('gate_id')->where('is_active', false)->count());
    }

    public function test_respons_success_false_gagal_dan_tidak_nonaktifkan(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGateUrut([
            ['success' => true, 'data' => [$this->karyawan()]],
            ['success' => false, 'message' => 'maintenance'],
        ], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'))
            ->assertSessionHasErrors(['gate']);

        $user = User::where('employee_number', 'NIK-1')->firstOrFail();
        $this->assertTrue($user->is_active);
        $this->assertSame(0, (int) $user->gate_miss_count);
    }

    public function test_jit_job_update_pindah_divisi(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        Queue::fake();
        SinkronKaryawanJit::dispatch(User::where('employee_number', 'NIK-1')->firstOrFail()->id, 'budi@dutamall.com');
        Queue::assertPushed(SinkronKaryawanJit::class);

        User::where('employee_number', 'NIK-1')->update(['gate_synced_at' => now()->subMinutes(30)]);
        $baris = $this->karyawan(['position_id' => null, 'department_id' => 'dept-1']);
        $this->mock(GateClient::class, fn ($mock) => $mock->shouldReceive('cariKaryawanByEmail')->andReturn($baris));
        (new SinkronKaryawanJit(User::where('employee_number', 'NIK-1')->firstOrFail()->id, 'budi@dutamall.com'))
            ->handle(app(GateClient::class), app(SinkronisasiKaryawanService::class));
        $this->assertTrue(User::where('employee_number', 'NIK-1')->firstOrFail()->gate_synced_at->gt(now()->subMinutes(5)));
    }

    public function test_sync_tidak_reset_must_change_password(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        User::where('employee_number', 'NIK-1')->firstOrFail()->update(['must_change_password' => true]);

        $this->fakeGate([$this->karyawan(['name' => 'Budi Santoso'])]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $this->assertTrue(User::where('employee_number', 'NIK-1')->firstOrFail()->must_change_password);
    }

    public function test_respons_tanpa_field_is_active_tidak_mengaktifkan_user(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $baris = $this->karyawan();
        unset($baris['is_active']);
        $this->fakeGateUrut([
            ['success' => true, 'data' => [$baris]],
            ['success' => true, 'data' => [$baris]],
        ], [['id' => 'comp-1', 'name' => 'PT A']]);

        $this->actingAs($this->admin())->post(route('settings.gate.sync'));
        $user = User::where('employee_number', 'NIK-1')->firstOrFail();
        $this->assertTrue($user->is_active);

        $user->update(['is_active' => false]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync-karyawan'));

        $this->assertFalse(User::where('employee_number', 'NIK-1')->firstOrFail()->is_active);
    }

    public function test_email_sama_bukan_duplikat_saat_nik_di_gate_berubah(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A']]);
        $this->actingAs($this->admin())->post(route('settings.gate.sync'));

        $baris = $this->karyawan(['nik' => 'NIK-BARU']);
        $this->mock(GateClient::class, fn ($mock) => $mock->shouldReceive('ambilKaryawan')->andReturn([$baris]));

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'))
            ->assertSessionDoesntHaveErrors();

        $user = User::where('gate_id', 'gate-1')->firstOrFail();
        $this->assertSame('NIK-1', $user->employee_number);
        $this->assertSame('budi@dutamall.com', $user->email);
    }

    public function test_master_sync_membuat_branch_baru_dari_perusahaan_gate(): void
    {
        $this->fakeGate([], [['id' => 'comp-9', 'name' => 'Cabang Baru', 'code' => 'CBR']]);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-master'), ['company_id' => 'comp-9'])
            ->assertRedirect();

        $branch = Branch::where('gate_id', 'comp-9')->firstOrFail();
        $this->assertSame('CBR', $branch->code);
        $this->assertSame('Cabang Baru', $branch->name);
    }

    public function test_riwayat_mencatat_nonaktif_dan_scope(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        User::create([
            'name' => 'Hilang', 'employee_number' => 'NIK-X', 'email' => 'x@dutamall.com',
            'gate_id' => 'gate-x', 'password' => bcrypt('x'), 'is_active' => true,
        ]);
        GateSyncSetting::simpan(['grace_miss_count' => 1]);
        $this->fakeGate([$this->karyawan()], []);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'))
            ->assertRedirect();

        $log = GateSyncLog::where('kind', 'karyawan')->latest('id')->firstOrFail();
        $this->assertSame(1, (int) $log->count_nonaktif);
        $this->assertNull($log->scope);

        $this->actingAs($this->admin())
            ->post(route('settings.gate.sync-karyawan'), ['limit' => 50])
            ->assertRedirect();

        $log = GateSyncLog::where('kind', 'karyawan')->latest('id')->firstOrFail();
        $this->assertSame('limit=50', $log->scope);
        $this->assertSame(0, (int) $log->count_nonaktif);
    }

    public function test_perintah_karyawan_sinkron_master_dulu_bila_belum_pernah(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $this->fakeGate([$this->karyawan()], [['id' => 'comp-1', 'name' => 'PT A', 'code' => 'PTA']]);

        $this->artisan('gate:sinkron-karyawan')->assertSuccessful();

        $this->assertTrue(GateSyncLog::where('kind', 'master')->where('is_dry_run', false)->exists());
        $this->assertTrue(GateSyncLog::where('kind', 'karyawan')->exists());
        $this->assertTrue(User::where('employee_number', 'NIK-1')->exists());
    }
}
