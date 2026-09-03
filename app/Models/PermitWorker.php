<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermitWorker extends Model
{
    protected $fillable = ['permit_request_id', 'name', 'order', 'is_present', 'checked_at'];

    protected function casts(): array
    {
        return ['is_present' => 'boolean', 'checked_at' => 'datetime'];
    }

    public function permitRequest()
    {
        return $this->belongsTo(PermitRequest::class);
    }
}