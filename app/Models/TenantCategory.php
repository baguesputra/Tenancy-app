<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantCategory extends Model
{
    protected $fillable = ['name', 'description'];

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }
}