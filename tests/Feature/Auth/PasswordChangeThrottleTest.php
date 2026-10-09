<?php

namespace Tests\Feature\Auth;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordChangeThrottleTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'name' => 'Pengguna Ganti Sandi',
            'employee_number' => 'PCS-1',
            'branch_id' => Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test'])->id,
            'password' => bcrypt('password-lama'),
        ]);
    }

    private function payload(array $over = []): array
    {
        return [
            'current_password' => 'password-lama',
            'password' => 'password-baru-123',
            'password_confirmation' => 'password-baru-123',
            ...$over,
        ];
    }

    public function test_ganti_password_valid_berhasil(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->put('/password/change', $this->payload())
            ->assertRedirect(route('dashboard'));

        $this->assertTrue(Hash::check('password-baru-123', $user->fresh()->password));
    }

    public function test_password_change_dibatasi_percobaan(): void
    {
        $user = $this->user();

        foreach (range(1, 5) as $i) {
            $this->actingAs($user)
                ->put('/password/change', $this->payload(['current_password' => 'salah-'.$i]));
        }

        $this->actingAs($user)
            ->put('/password/change', $this->payload(['current_password' => 'salah-6']))
            ->assertSessionHasErrors([
                'current_password' => 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
            ]);

        $this->assertTrue(Hash::check('password-lama', $user->fresh()->password));
    }
}
