<?php

namespace Tests\Feature\Auth;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SsoCallbackTest extends TestCase
{
    use RefreshDatabase;

    protected function mockSsoUser(array $attributes = []): void
    {
        $default = ['id' => 'sso-123', 'email' => 'budi@dutamall.com', 'name' => 'Budi'];

        $user = new class(array_merge($default, $attributes))
        {
            public function __construct(public array $attributes) {}

            public function __get(string $name): mixed
            {
                return $this->attributes[$name] ?? null;
            }
        };

        Socialite::shouldReceive('driver->stateless->user')
            ->once()
            ->andReturn($user);
    }

    private function gateKosong(): void
    {
        Http::fake(['*' => Http::response(['success' => true, 'data' => []], 200)]);
    }

    private function existingUser(array $over = []): User
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Banjarmasin']);
        $user = User::create(array_merge([
            'name' => 'Budi', 'email' => 'budi@dutamall.com', 'employee_number' => 'NIK-1',
            'branch_id' => $branch->id, 'password' => bcrypt('x'), 'is_active' => true,
        ], $over));
        $user->assignRole('staff');

        return $user;
    }

    public function test_callback_sukses_user_existing(): void
    {
        $user = $this->existingUser();
        $this->mockSsoUser();
        $this->gateKosong();

        $response = $this->get(route('sso.callback'));

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);
        $this->assertSame('sso-123', $user->refresh()->sso_id);
    }

    public function test_callback_auto_create_dari_gate(): void
    {
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        Http::fake(['*/api/users*' => Http::response(['success' => true, 'data' => [[
            'id' => 'gate-1', 'name' => 'Budi', 'email' => 'budi@dutamall.com',
            'nik' => 'NIK-1', 'is_active' => true,
        ]]], 200)]);
        $this->mockSsoUser();

        $response = $this->get(route('sso.callback'));

        $response->assertRedirect(route('dashboard'));
        $baru = User::where('email', 'budi@dutamall.com')->firstOrFail();
        $this->assertSame('gate-1', $baru->gate_id);
        $this->assertTrue($baru->hasRole('staff'));
        $this->assertAuthenticatedAs($baru);
    }

    public function test_callback_gagal_tanpa_email(): void
    {
        $this->mockSsoUser(['email' => null]);

        $this->get(route('sso.callback'))
            ->assertRedirect(route('sso.gagal'));
        $this->assertGuest();
    }

    public function test_callback_gagal_bukan_karyawan_gate(): void
    {
        $this->mockSsoUser(['email' => 'asing@luar.com']);
        $this->gateKosong();

        $this->get(route('sso.callback'))
            ->assertRedirect(route('sso.gagal'));
        $this->assertGuest();
    }

    public function test_callback_gagal_email_mismatch(): void
    {
        $this->existingUser(['sso_id' => 'sso-123', 'email' => 'lama@dutamall.com']);
        $this->mockSsoUser(['email' => 'baru@dutamall.com']);
        $this->gateKosong();

        $this->get(route('sso.callback'))
            ->assertRedirect(route('sso.gagal'));
        $this->assertGuest();
    }

    public function test_callback_gagal_user_nonaktif(): void
    {
        $this->existingUser(['is_active' => false]);
        $this->mockSsoUser();
        $this->gateKosong();

        $this->get(route('sso.callback'))
            ->assertRedirect(route('sso.gagal'));
        $this->assertGuest();
    }

    public function test_login_lokal_ditolak_saat_mode_sso(): void
    {
        config(['auth.mode' => 'sso']);

        $this->post('/login', ['employee_number' => 'NIK-1', 'password' => 'x'])
            ->assertRedirect(route('sso.redirect'));
        $this->assertGuest();
    }

    public function test_slo_bersihkan_sesi(): void
    {
        $this->actingAs($this->existingUser());

        $this->get(route('sso.slo'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_logout_sso_409_location_ke_idp(): void
    {
        config(['auth.mode' => 'sso']);
        config()->set('services.perusahaan.metadata', 'https://gate.appdutamall.com/saml/metadata');

        $user = $this->existingUser(['sso_id' => 'budi@dutamall.com']);
        $response = $this->actingAs($user)->post('/logout', [], ['X-Inertia' => 'true']);

        $this->assertAuthenticatedAs($user);
        $response->assertStatus(409);
        $this->assertStringStartsWith('https://gate.appdutamall.com/saml/slo', $response->headers->get('X-Inertia-Location'));
    }

    public function test_logout_tanpa_sso_bersihkan_sesi(): void
    {
        config(['auth.mode' => 'sso']);

        $user = $this->existingUser(['sso_id' => null]);
        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect();
    }
}
