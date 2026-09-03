<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermitGood extends Model
{
    protected $fillable = [
        'permit_request_id', 'description', 'quantity_note',
        'is_verified', 'checked_at', 'photo_path',
    ];

    protected function casts(): array
    {
        return ['is_verified' => 'boolean', 'checked_at' => 'datetime'];
    }

    public function permitRequest()
    {
        return $this->belongsTo(PermitRequest::class);
    }
}