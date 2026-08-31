<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantContact extends Model
{
    protected $fillable = ['tenant_id', 'name', 'position', 'phone', 'email', 'type'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}