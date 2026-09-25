<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GateDepartmentMap extends Model
{
    protected $table = 'gate_department_map';

    protected $fillable = ['gate_department_id', 'department_id'];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
