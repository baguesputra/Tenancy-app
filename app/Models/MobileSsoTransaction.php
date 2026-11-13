<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MobileSsoTransaction extends Model
{
    protected $fillable = ['relay_state', 'state', 'code_challenge', 'expires_at', 'used_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }
}
