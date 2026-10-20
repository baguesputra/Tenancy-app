<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HcisWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'rahasia-hcis';

    private const URL = '/api/v1/ingest/employee-sync';

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        config(['services.hcis.webhook_secret' => self::SECRET]);
    }

    private function payload(array $over = [], string $event = 'employee.created'): array
    {
        return [
            'event' => $event,
            'timestamp' => '2026-10-19T08:30:00Z',
            'data' => array_merge([
                'id' => '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                'name' => 'Budi Santoso',
                'email' => 'budi@dutamall.com',
                'nik' => 'EMP-00123',
                'is_active' => true,
            ], $over),
        ];
    }

    private function kirim(array $payload): TestResponse
    {
        $body = json_encode($payload);

        return $this->call('POST', self::URL, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_HCIS_SIGNATURE' => hash_hmac('sha256', $body, self::SECRET),
        ], $body);
    }

    public function test_signature_tidak_valid_ditolak(): void
    {
        $this->postJson(self::URL, $this->payload(), ['X-HCIS-Signature' => 'salah'])
            ->assertStatus(401)
            ->assertJson(['status' => 'error', 'message' => 'Invalid webhook signature.']);
    }

    public function test_secret_belum_dikonfigurasi_menolak_semua_request(): void
    {
        config(['services.hcis.webhook_secret' => null]);

        $this->postJson(self::URL, $this->payload())->assertStatus(503);
    }

    public function test_created_membuat_user_baru_role_staff(): void
    {
        $this->kirim($this->payload())
            ->assertOk()
            ->assertJsonPath('data.action', 'created')
            ->assertJsonPath('data.is_active', true);

        $user = User::where('gate_id', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')->firstOrFail();
        $this->assertSame('Budi Santoso', $user->name);
        $this->assertSame('EMP-00123', $user->employee_number);
        $this->assertTrue($user->hasRole('staff'));
        $this->assertTrue($user->is_active);
    }

    public function test_updated_memutakhirkan_dan_mengaktifkan_kembali(): void
    {
        $user = User::create([
            'name' => 'Lama', 'email' => 'budi@dutamall.com', 'employee_number' => 'EMP-00123',
            'gate_id' => '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            'password' => bcrypt('x'), 'is_active' => false,
        ]);

        $this->kirim($this->payload(['name' => 'Budi Baru']))
            ->assertOk()
            ->assertJsonPath('data.action', 'updated');

        $user->refresh();
        $this->assertSame('Budi Baru', $user->name);
        $this->assertTrue($user->is_active);
    }

    public function test_matching_berlapis_email_lalu_nik(): void
    {
        $viaEmail = User::create([
            'name' => 'Via Email', 'email' => 'budi@dutamall.com', 'password' => bcrypt('x'),
        ]);
        $viaNik = User::create([
            'name' => 'Via Nik', 'employee_number' => 'EMP-999',
            'email' => 'nik@dutamall.com', 'password' => bcrypt('x'),
        ]);

        $this->kirim($this->payload())->assertOk()->assertJsonPath('data.action', 'updated');
        $this->assertSame('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', $viaEmail->fresh()->gate_id);

        $this->kirim($this->payload([
            'id' => '11111111-1111-4111-8111-111111111111',
            'email' => 'baru@dutamall.com',
            'nik' => 'EMP-999',
        ]))->assertOk()->assertJsonPath('data.action', 'updated');

        $viaNik->refresh();
        $this->assertSame('11111111-1111-4111-8111-111111111111', $viaNik->gate_id);
        $this->assertSame('baru@dutamall.com', $viaNik->email);
    }

    public function test_deactivated_menonaktifkan_dan_cabut_sesi_token(): void
    {
        $user = User::create([
            'name' => 'Budi', 'email' => 'budi@dutamall.com', 'employee_number' => 'EMP-00123',
            'gate_id' => '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            'password' => bcrypt('x'), 'is_active' => true,
        ]);
        $user->createToken('uji');
        DB::table('sessions')->insert([
            'id' => 'sesi-uji', 'user_id' => $user->id, 'payload' => 'x', 'last_activity' => time(),
        ]);

        $this->kirim($this->payload(['is_active' => false], 'employee.deactivated'))
            ->assertOk()
            ->assertJsonPath('data.action', 'deactivated');

        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $user->id)->count());
    }

    public function test_deaktivasi_user_tidak_ada_tetap_sukses_dilewati(): void
    {
        $this->kirim($this->payload(['is_active' => false], 'employee.deactivated'))
            ->assertOk()
            ->assertJsonPath('data.action', 'skipped');

        $this->assertFalse(User::where('gate_id', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')->exists());
    }

    public function test_validasi_gagal_mengembalikan_422(): void
    {
        $payload = $this->payload();
        unset($payload['data']['email']);

        $this->kirim($payload)->assertStatus(422)->assertJsonValidationErrors(['data.email']);
    }
}
