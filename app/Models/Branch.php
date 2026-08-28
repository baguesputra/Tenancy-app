<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'code', 'is_active'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function inspectionSessions()
    {
        return $this->hasMany(InspectionSession::class);
    }
}