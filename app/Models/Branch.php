<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'code', 'company_name', 'is_active', 'gate_id'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function inspectionSessions()
    {
        return $this->hasMany(InspectionSession::class);
    }

    public function units()
    {
        return $this->hasMany(Unit::class);
    }

    public function floorPlans()
    {
        return $this->hasMany(FloorPlan::class)->orderBy('floor_order');
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }

    public function permitRequests()
    {
        return $this->hasMany(PermitRequest::class);
    }
}
