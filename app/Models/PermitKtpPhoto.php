<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PermitKtpPhoto extends Model
{
    protected $fillable = ['permit_request_id', 'photo_path', 'mismatch_note', 'checked_at'];

    protected function casts(): array
    {
        return ['checked_at' => 'datetime'];
    }

    protected $appends = ['photo_url'];

    public function permitRequest()
    {
        return $this->belongsTo(PermitRequest::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::url($this->photo_path) : null;
    }
}
