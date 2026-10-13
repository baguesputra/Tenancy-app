<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Department;
use App\Models\InspectionSession;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InspectionSessionTeamTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DepartmentSeeder::class);
    }

    private function makeUser(string $deptName, ?Branch $branch = null, array $perms = []): User
    {
        foreach ($perms as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $branch ??= Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $dept = Department::where('name', $deptName)->firstOrFail();
        $user = User::create([
            'name' => $deptName.' '.uniqid(),
            'email' => uniqid().'@t.id',
            'employee_number' => 'U-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'is_active' => true,
            'password' => bcrypt('password'),
        ]);
        if ($perms !== []) {
            $role = Role::firstOrCreate(['name' => 'sidak_role_'.uniqid(), 'guard_name' => 'web']);
            $role->syncPermissions($perms);
            $user->assignRole($role);
        }

        return $user;
    }

    public function test_store_creates_session_with_pic_and_team(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $bs = $this->makeUser('Building Service');
        $eng = $this->makeUser('Engineering');
        $sec = $this->makeUser('Security');

        $res = $this->actingAs($creator)->post('/inspection-sessions', [
            'participant_ids' => [$bs->id, $eng->id, $sec->id],
            'notes' => 'Sidak rutin mingguan',
        ]);

        $res->assertRedirect();
        $session = InspectionSession::latest()->first();
        $this->assertSame($creator->id, $session->user_id);
        $this->assertSame($creator->name, $session->creator_name_snapshot);
        $this->assertSame($creator->name, $session->pic_name);
        $this->assertSame('Sidak rutin mingguan', $session->notes);
        $this->assertSame(
            [$bs->id, $eng->id, $sec->id],
            $session->participants()->orderBy('user_id')->pluck('user_id')->all()
        );
        $this->assertSame(
            ['Building Service', 'Engineering', 'Security'],
            $session->participants()->orderBy('user_id')->pluck('department_name_snapshot')->all()
        );
    }

    public function test_pic_snapshot_immutable_when_user_renamed(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $bs = $this->makeUser('Building Service');
        $oldName = $creator->name;

        $this->actingAs($creator)->post('/inspection-sessions', [
            'participant_ids' => [$bs->id],
        ])->assertRedirect();

        $creator->update(['name' => 'Nama Baru']);
        $session = InspectionSession::latest()->first();

        $this->assertSame($oldName, $session->fresh()->pic_name);
    }

    public function test_store_rejects_invalid_participants(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $marketing = $this->makeUser('Marketing');
        $otherBranch = Branch::create(['name' => 'Luar', 'code' => 'LUAR']);
        $outsider = $this->makeUser('Security', $otherBranch);

        // divisi luar BS/Engineering/Security
        $this->actingAs($creator)->from('/inspection-sessions/create')
            ->post('/inspection-sessions', ['participant_ids' => [$marketing->id]])
            ->assertSessionHasErrors('participant_ids');

        // beda cabang
        $this->actingAs($creator)->from('/inspection-sessions/create')
            ->post('/inspection-sessions', ['participant_ids' => [$outsider->id]])
            ->assertSessionHasErrors('participant_ids');

        // PIC tidak boleh dipilih sebagai peserta
        $this->actingAs($creator)->from('/inspection-sessions/create')
            ->post('/inspection-sessions', ['participant_ids' => [$creator->id]])
            ->assertSessionHasErrors('participant_ids');

        // minimal 1 peserta
        $this->actingAs($creator)->from('/inspection-sessions/create')
            ->post('/inspection-sessions', ['participant_ids' => []])
            ->assertSessionHasErrors('participant_ids');

        $this->assertSame(0, InspectionSession::count());
    }

    public function test_update_participants_while_in_progress(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $bs = $this->makeUser('Building Service');
        $sec = $this->makeUser('Security');

        $this->actingAs($creator)->post('/inspection-sessions', [
            'participant_ids' => [$bs->id],
        ])->assertRedirect();
        $session = InspectionSession::latest()->first();

        $this->actingAs($creator)
            ->patch("/inspection-sessions/{$session->id}/participants", ['participant_ids' => [$sec->id]])
            ->assertRedirect();

        $this->assertSame([$sec->id], $session->fresh()->participants()->pluck('user_id')->all());
    }

    public function test_update_participants_rejected_when_completed(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $bs = $this->makeUser('Building Service');
        $sec = $this->makeUser('Security');

        $this->actingAs($creator)->post('/inspection-sessions', [
            'participant_ids' => [$bs->id],
        ])->assertRedirect();
        $session = InspectionSession::latest()->first();

        $this->actingAs($creator)->post("/inspection-sessions/{$session->id}/complete")->assertRedirect();
        $this->actingAs($creator)
            ->patch("/inspection-sessions/{$session->id}/participants", ['participant_ids' => [$sec->id]])
            ->assertStatus(422);

        $this->assertSame([$bs->id], $session->fresh()->participants()->pluck('user_id')->all());
    }

    public function test_create_page_groups_staff_by_department(): void
    {
        $creator = $this->makeUser('Tenancy', null, ['sidak.view', 'sidak.create']);
        $bs = $this->makeUser('Building Service');

        $res = $this->actingAs($creator)->get('/inspection-sessions/create');
        $res->assertOk();
        $this->assertSame($creator->name, $res->viewData('page')['props']['picName']);
        $grouped = $res->viewData('page')['props']['staffByDepartment'];
        $this->assertContains($bs->id, collect($grouped['Building Service'])->pluck('id')->all());
        $this->assertNotContains($creator->id, collect($grouped)->flatten(1)->pluck('id')->all());
    }
}
