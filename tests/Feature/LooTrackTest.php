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

class LooTrackTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $roleName, array $permissions): User
    {
        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $role->syncPermissions($permissions);

        $user = User::create([
            'name' => 'Test '.$roleName,
            'email' => $roleName.'@'.uniqid().'.t.id',
            'employee_number' => 'T-'.uniqid(),
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('x'),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function makeLoo(array $overrides = []): Loo
    {
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $cat = TenantCategory::firstOrCreate(['name' => 'Tenant']);

        return Loo::create(array_merge([
            'loo_number' => Loo::generateLooNumber($branch->code, 2026),
            'branch_id' => $branch->id,
            'marketing_id' => $this->userWithRole('marketing_loo_input', ['loos.view', 'loos.create', 'loos.transition'])->id,
            'tenant_category_id' => $cat->id,
            'prospective_tenant_name' => 'Toko Baru',
            'status' => 'draft',
            'current_stage' => 'marketing',
            'track_token' => \Illuminate\Support\Str::random(40),
        ], $overrides));
    }

    public function test_store_generates_track_token(): void
    {
        $marketing = $this->userWithRole('marketing_loo_input', ['loos.view', 'loos.create', 'loos.transition']);
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);

        $this->actingAs($marketing)
            ->post('/loos/store', [
                'branch_id' => $branch->id,
                'prospective_tenant_name' => 'Toko Baru',
            ])
            ->assertRedirect();

        $loo = Loo::latest('id')->first();
        $this->assertNotNull($loo->track_token);
        $this->assertSame(40, strlen($loo->track_token));
    }

    public function test_public_track_shows_general_progress_only(): void
    {
        $loo = $this->makeLoo();

        $this->get("/lacak-loo/{$loo->track_token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Track/Show')
                ->where('track.loo_number', $loo->loo_number)
                ->where('track.phase', 'Pengisian Divisi')
                ->where('track.progress_percent', 0)
                ->where('track.tenant_signed', false)
                ->has('track.submitted_at')
                ->missing('track.divisions')
                ->missing('track.checklists')
                ->missing('track.timeline'))
            ->assertDontSee('monthly_rent')
            ->assertDontSee('cover_file_path')
            ->assertDontSee('signature_tenant')
            ->assertDontSee('section_filled')
            ->assertDontSee('Legal Review');

        // submitted_at tersimpan sebagai integer (cast timestamp) — halaman tetap OK.
        $loo->update(['status' => 'legal_review', 'submitted_at' => now()->timestamp]);
        $this->get("/lacak-loo/{$loo->track_token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Track/Show')
                ->has('track.submitted_at'));
    }

    public function test_public_track_unknown_token_404(): void
    {
        $this->get('/lacak-loo/'.str_repeat('x', 40))->assertNotFound();
    }

    public function test_public_track_expired_after_terminal_plus_month(): void
    {
        $loo = $this->makeLoo([
            'status' => 'completed',
            'track_expires_at' => now()->subDay(),
        ]);

        $this->get("/lacak-loo/{$loo->track_token}")
            ->assertStatus(410)
            ->assertInertia(fn ($page) => $page->component('Track/Expired'));
    }

    public function test_public_track_terminal_not_yet_expired_ok(): void
    {
        $loo = $this->makeLoo([
            'status' => 'completed',
            'track_expires_at' => now()->addMonth(),
        ]);

        $this->get("/lacak-loo/{$loo->track_token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Track/Show')
                ->where('track.phase', 'Selesai'));
    }

    public function test_terminal_transition_sets_expiry(): void
    {
        $loo = $this->makeLoo();

        // Langsung terminal via cancel oleh pembuat.
        $this->actingAs(User::find($loo->marketing_id))
            ->post("/loos/{$loo->id}/transition", ['status' => 'cancelled', 'cancel_reason' => 'Batal'])
            ->assertRedirect();

        $this->assertNotNull($loo->fresh()->track_expires_at);
        $this->assertTrue($loo->fresh()->track_expires_at->isFuture());
    }

    public function test_extend_and_regenerate_guarded(): void
    {
        $loo = $this->makeLoo(['status' => 'completed', 'track_expires_at' => now()->addMonth()]);
        $viewer = $this->userWithRole('viewer_only', ['loos.view']);
        $oldToken = $loo->track_token;

        // Viewer tanpa hak kelola → 403.
        $this->actingAs($viewer)->post("/loos/{$loo->id}/track-extend")->assertForbidden();
        $this->actingAs($viewer)->post("/loos/{$loo->id}/track-regenerate")->assertForbidden();

        // Pembuat LOO boleh perpanjang.
        $this->actingAs(User::find($loo->marketing_id))
            ->post("/loos/{$loo->id}/track-extend")
            ->assertRedirect();
        $this->assertTrue($loo->fresh()->track_expires_at->gt(now()->addMonth()->subDay()));

        // Regenerate memutar token; lama mati.
        $this->actingAs(User::find($loo->marketing_id))
            ->post("/loos/{$loo->id}/track-regenerate")
            ->assertRedirect();

        $newToken = $loo->fresh()->track_token;
        $this->assertNotSame($oldToken, $newToken);
        $this->get("/lacak-loo/{$oldToken}")->assertNotFound();
        $this->get("/lacak-loo/{$newToken}")->assertOk();
    }

    public function test_qr_download_requires_manage_right(): void
    {
        $loo = $this->makeLoo();
        $viewer = $this->userWithRole('viewer_only', ['loos.view']);

        $this->actingAs($viewer)->get("/loos/{$loo->id}/track-qr")->assertForbidden();

        $response = $this->actingAs(User::find($loo->marketing_id))->get("/loos/{$loo->id}/track-qr");
        $response->assertOk();
        $this->assertStringStartsWith('image/svg', $response->headers->get('Content-Type'));
    }

    public function test_show_page_exposes_track_share(): void
    {
        $loo = $this->makeLoo();
        $tm = $this->userWithRole('tenant_mgmt_staff', ['loos.view', 'loos.tenant_mgmt_edit']);

        $this->actingAs($tm)->get("/loos/{$loo->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('track.url')
                ->has('track.qr'));
    }
}
