<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = ['name', 'description', 'gate_id', 'company_gate_id'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function divisions()
    {
        return $this->hasMany(Division::class);
    }

    public function positions()
    {
        return $this->hasMany(Position::class);
    }

    public function approvals()
    {
        return $this->hasMany(Approval::class);
    }
}
