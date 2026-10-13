<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InspectionSessionParticipant extends Model
{
    protected $fillable = [
        'inspection_session_id',
        'user_id',
        'department_id',
        'name_snapshot',
        'department_name_snapshot',
    ];

    public function session()
    {
        return $this->belongsTo(InspectionSession::class, 'inspection_session_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
