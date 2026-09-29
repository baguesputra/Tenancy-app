<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LooHistory extends Model
{
    protected $fillable = [
        'loo_id',
        'user_id',
        'action',
        'from_status',
        'to_status',
        'from_stage',
        'to_stage',
        'changes',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'changes' => 'array',
        'metadata' => 'array',
    ];

    public function loo()
    {
        return $this->belongsTo(Loo::class, 'loo_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}