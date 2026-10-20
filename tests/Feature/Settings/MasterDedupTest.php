<?php

namespace Tests\Feature\Settings;

use App\Models\Approval;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\InspectionSession;
use App\Models\InspectionSessionParticipant;
use App\Models\PermitRequest;
use App\Models\Position;
use App\Models\User;
use App\Services\MasterDedupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class MasterDedupTest extends TestCase
{
    use RefreshDatabase;

    private function user(Branch $branch, Department $department): User
    {
        return User::create([
            'name' => 'Staff Tenancy',
            'employee_number' => 'TOP-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $department->id,
            'password' => bcrypt('x'),
        ]);
    }

    private function referensi(Department $legacy, Branch $branch, User $user): void
    {
        Approval::create([
            'approvable_type' => User::class,
            'approvable_id' => $user->id,
            'step_key' => 'tenancy',
            'label' => 'Approval Tenancy',
            'department_id' => $legacy->id,
            'order' => 1,
        ]);

        Position::create(['name' => 'Staff Legacy', 'department_id' => $legacy->id]);
        Division::create(['name' => 'Divisi Legacy', 'department_id' => $legacy->id]);

        $permit = PermitRequest::create([
            'id' => (string) Str::uuid(),
            'permit_number' => 'IZN-'.uniqid(),
            'activity_types' => ['kerja'],
            'request_date' => today()->toDateString(),
            'store_name_snapshot' => 'Toko',
            'requested_by_type' => User::class,
            'requested_by_id' => $user->id,
            'barcode_token' => (string) Str::uuid(),
        ]);

        DB::table('permit_request_departments')->insert([
            'permit_request_id' => $permit->id,
            'department_id' => $legacy->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $session = InspectionSession::create([
            'id' => (string) Str::uuid(),
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'started_at' => now(),
        ]);

        InspectionSessionParticipant::create([
            'inspection_session_id' => $session->id,
            'user_id' => $user->id,
            'department_id' => $legacy->id,
            'name_snapshot' => $user->name,
        ]);
    }

    public function test_audit_menemukan_kandidat_merge(): void
    {
        $branch = Branch::create(['code' => 'BJM', 'name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $legacy = Department::create(['name' => 'Tenancy']);
        Department::create(['name' => 'Tenancy', 'gate_id' => 'g-20', 'company_gate_id' => 'comp-1']);
        Department::create(['name' => 'Security']);

        $audit = app(MasterDedupService::class)->audit();

        $tenancy = collect($audit)->firstWhere('id', $legacy->id);
        $security = collect($audit)->firstWhere('name', 'Security');

        $this->assertNotNull($tenancy['kandidat']);
        $this->assertSame('g-20', Department::find($tenancy['kandidat']['id'])->gate_id);
        $this->assertNull($security['kandidat']);
    }

    public function test_merge_memindahkan_referensi_dan_menghapus_legacy(): void
    {
        $branch = Branch::create(['code' => 'BJM', 'name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $legacy = Department::create(['name' => 'Tenancy']);
        $gate = Department::create(['name' => 'Tenancy', 'gate_id' => 'g-20', 'company_gate_id' => 'comp-1']);
        $security = Department::create(['name' => 'Security']);
        $user = $this->user($branch, $legacy);

        $this->referensi($legacy, $branch, $user);
        Cache::put('dept.id.Tenancy', $legacy->id, 3600);

        app(MasterDedupService::class)->merge();

        $this->assertSame($gate->id, $user->fresh()->department_id);
        $this->assertSame(1, Approval::where('department_id', $gate->id)->count());
        $this->assertSame(1, DB::table('permit_request_departments')->where('department_id', $gate->id)->count());
        $this->assertSame(1, InspectionSessionParticipant::where('department_id', $gate->id)->count());
        $this->assertSame(1, Position::where('department_id', $gate->id)->count());
        $this->assertSame(1, Division::where('department_id', $gate->id)->count());
        $this->assertFalse(Department::whereKey($legacy->id)->exists());
        $this->assertTrue(Department::whereKey($security->id)->exists());
        $this->assertNull(Cache::get('dept.id.Tenancy'));
    }

    public function test_command_tanpa_force_hanya_pratinjau(): void
    {
        Branch::create(['code' => 'BJM', 'name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $legacy = Department::create(['name' => 'Tenancy']);
        Department::create(['name' => 'Tenancy', 'gate_id' => 'g-20', 'company_gate_id' => 'comp-1']);

        $this->artisan('master:merge-duplicate-departments')->assertSuccessful();

        $this->assertTrue(Department::whereKey($legacy->id)->exists());
    }

    public function test_command_force_menjalankan_merge(): void
    {
        Branch::create(['code' => 'BJM', 'name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $legacy = Department::create(['name' => 'Tenancy']);
        Department::create(['name' => 'Tenancy', 'gate_id' => 'g-20', 'company_gate_id' => 'comp-1']);

        $this->artisan('master:merge-duplicate-departments', ['--force' => true])->assertSuccessful();

        $this->assertFalse(Department::whereKey($legacy->id)->exists());
    }

    public function test_kandidat_ambigu_dilewati(): void
    {
        $legacy = Department::create(['name' => 'Marketing']);
        Department::create(['name' => 'Marketing', 'gate_id' => 'g-1', 'company_gate_id' => 'comp-1']);
        Department::create(['name' => 'Marketing', 'gate_id' => 'g-2', 'company_gate_id' => 'comp-2']);

        $audit = app(MasterDedupService::class)->audit();
        $baris = collect($audit)->firstWhere('id', $legacy->id);

        $this->assertNull($baris['kandidat']);
        $this->assertCount(2, $baris['ambigu']);

        app(MasterDedupService::class)->merge();

        $this->assertTrue(Department::whereKey($legacy->id)->exists());
    }
}
