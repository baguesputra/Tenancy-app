<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PermitGood extends Model
{
    protected $fillable = [
        'permit_request_id', 'description', 'quantity_note', 'weight_class',
        'is_verified', 'checked_at', 'photo_path', 'mismatch_note',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return ['is_verified' => 'boolean', 'checked_at' => 'datetime'];
    }

    public function permitRequest()
    {
        return $this->belongsTo(PermitRequest::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }
}