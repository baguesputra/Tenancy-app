<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class TenantUser extends Authenticatable
{
    use Notifiable;

    protected $fillable = ['tenant_id', 'username', 'password', 'is_active'];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public static function generateUsernameFrom(string $tenantName): string
    {
        $base = Str::slug($tenantName, ''); // "Turkish Carpet" -> "turkishcarpet"
        $username = $base;
        $counter = 2;

        while (self::where('username', $username)->exists()) {
            $username = $base . $counter;
            $counter++;
        }

        return $username;
    }

    public function branch()
    {
        return $this->tenant->branch ?? null;
    }
}