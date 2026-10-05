<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LooSection extends Model
{
    protected $fillable = [
        'loo_id',
        'section_key',
        'section_label',
        'data',
        'filled_by',
        'filled_at',
        'submitted_at',
        'is_submitted',
    ];

    protected $casts = [
        'data' => 'array',
        'filled_at' => 'datetime',
        'submitted_at' => 'datetime',
        'is_submitted' => 'boolean',
    ];

    public function loo()
    {
        return $this->belongsTo(Loo::class);
    }

    public function filler()
    {
        return $this->belongsTo(User::class, 'filled_by');
    }
}
