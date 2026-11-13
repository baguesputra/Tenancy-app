<?php

namespace Tests\Feature\Auth;

use App\Http\Controllers\Auth\MobileSsoController;
use App\Models\Branch;
use App\Models\Department;
use App\Models\MobileSsoCode;
use App\Models\MobileSsoTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MobileSsoExchangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function verifier(): string
    {
        return str_repeat('v', 64);
    }

    private function challenge(string $verifier): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
    }

    private function makeUser(array $overrides = []): User
    {
        Permission::firstOrCreate(['name' => 'sidak.view', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'inspector', 'guard_name' => 'web']);
        $role->syncPermissions(['sidak.view']);

        $branch = Branch::firstOrCreate(['code' => 'BJM'], ['name' => 'Duta Mall Banjarmasin']);
        $dept = Department::firstOrCreate(['name' => 'Engineering']);

        $user = User::create(array_merge([
            'name' => 'Budi Santoso',
            'email' => 'budi@dutamall.com',
            'employee_number' => 'EMP-001',
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('secret'),
            'is_active' => true,
            'auth_provider' => 'sso',
        ], $overrides));

        $user->assignRole('inspector');

        return $user;
    }

    private function createCode(?string $state = null, ?string $verifier = null, array $userOverrides = []): array
    {
        $state ??= str_repeat('s', 64);
        $verifier ??= $this->verifier();
        $code = bin2hex(random_bytes(32));
        $user = $this->makeUser($userOverrides);

        MobileSsoCode::create([
            'user_id' => $user->id,
            'code_hash' => hash('sha256', $code),
            'code_challenge' => $this->challenge($verifier),
            'state' => $state,
            'expires_at' => now()->addMinute(),
        ]);

        return [$code, $state, $verifier, $user];
    }

    public function test_exchange_menerbitkan_token_dan_kode_hanya_bisa_dipakai_sekali(): void
    {
        [$code, $state, $verifier, $user] = $this->createCode();
        $payload = ['code' => $code, 'state' => $state, 'code_verifier' => $verifier];

        $response = $this->postJson('/api/v1/sso/mobile/exchange', $payload);
        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'employee_number', 'branch_id', 'branch_name', 'department', 'permissions'],
            ])
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.branch_name', 'Duta Mall Banjarmasin')
            ->assertJsonPath('user.department', 'Engineering');

        $this->postJson('/api/v1/sso/mobile/exchange', $payload)->assertUnprocessable();
    }

    public function test_exchange_menolak_state_verifier_kedaluwarsa_dan_user_nonaktif(): void
    {
        [$code, $state, $verifier] = $this->createCode();

        $this->postJson('/api/v1/sso/mobile/exchange', [
            'code' => $code,
            'state' => str_repeat('x', 64),
            'code_verifier' => $verifier,
        ])->assertUnprocessable();

        $this->postJson('/api/v1/sso/mobile/exchange', [
            'code' => $code,
            'state' => $state,
            'code_verifier' => str_repeat('x', 64),
        ])->assertUnprocessable();

        $expired = $this->createCode(str_repeat('e', 64), null, ['email' => 'exp@dutamall.com', 'employee_number' => 'EMP-EXP']);
        MobileSsoCode::where('code_hash', hash('sha256', $expired[0]))->update(['expires_at' => now()->subSecond()]);
        $this->postJson('/api/v1/sso/mobile/exchange', [
            'code' => $expired[0],
            'state' => $expired[1],
            'code_verifier' => $expired[2],
        ])->assertUnprocessable();

        $inactive = $this->createCode(str_repeat('i', 64), null, [
            'email' => 'off@dutamall.com',
            'employee_number' => 'EMP-OFF',
            'is_active' => false,
        ]);
        $this->postJson('/api/v1/sso/mobile/exchange', [
            'code' => $inactive[0],
            'state' => $inactive[1],
            'code_verifier' => $inactive[2],
        ])->assertUnprocessable();
    }

    public function test_assertion_callback_membuat_deep_link_dari_relay_state_tanpa_session(): void
    {
        $state = str_repeat('s', 64);
        $verifier = $this->verifier();
        $relayState = str_repeat('r', 64);
        $user = $this->makeUser();

        MobileSsoTransaction::create([
            'relay_state' => $relayState,
            'state' => $state,
            'code_challenge' => $this->challenge($verifier),
            'expires_at' => now()->addMinutes(5),
        ]);

        $url = MobileSsoController::issue(Request::create('/auth/sso/callback', 'POST', [
            'RelayState' => $relayState,
        ]), $user);

        $this->assertNotNull($url);
        $this->assertStringStartsWith('tenancy://auth/sso/callback?', $url);
        $this->assertNotNull(MobileSsoTransaction::where('relay_state', $relayState)->first()?->used_at);
        $this->assertDatabaseHas('mobile_sso_codes', [
            'user_id' => $user->id,
            'code_challenge' => $this->challenge($verifier),
            'state' => $state,
        ]);
    }

    public function test_sso_callback_mengarahkan_ke_deep_link_mobile_bila_relay_state_valid(): void
    {
        $user = $this->makeUser(['sso_id' => 'sso-mobile-1']);
        $state = str_repeat('m', 64);
        $relayState = str_repeat('n', 64);
        $challenge = $this->challenge($this->verifier());

        MobileSsoTransaction::create([
            'relay_state' => $relayState,
            'state' => $state,
            'code_challenge' => $challenge,
            'expires_at' => now()->addMinutes(5),
        ]);

        $ssoUser = new class
        {
            public string $id = 'sso-mobile-1';

            public string $email = 'budi@dutamall.com';

            public string $name = 'Budi Santoso';
        };
        Socialite::shouldReceive('driver->stateless->user')->once()->andReturn($ssoUser);

        $response = $this->post('/auth/sso/callback', ['RelayState' => $relayState]);
        $location = $response->headers->get('Location');

        $response->assertRedirect();
        $this->assertIsString($location);
        $this->assertStringStartsWith('tenancy://auth/sso/callback?', $location);
    }

    public function test_endpoint_api_user_mengembalikan_profil_mobile_flat(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('branch_name', 'Duta Mall Banjarmasin')
            ->assertJsonPath('department', 'Engineering')
            ->assertJsonPath('permissions.0', 'sidak.view');
    }
}
