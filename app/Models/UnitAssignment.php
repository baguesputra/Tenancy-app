<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnitAssignment extends Model
{
    protected $fillable = [
        'unit_id', 'department_id', 'pic_name', 'pic_phone',
        'note', 'started_at', 'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'date',
            'ended_at' => 'date',
        ];
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function isActive(): bool
    {
        return $this->ended_at === null;
    }
}
