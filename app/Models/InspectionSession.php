<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InspectionSession extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $appends = ['pic_name'];

    protected $fillable = [
        'id', // penting: tetap fillable supaya UUID dari mobile bisa masuk lewat updateOrCreate
        'branch_id',
        'user_id',
        'creator_name_snapshot',
        'started_at',
        'ended_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function participants()
    {
        return $this->hasMany(InspectionSessionParticipant::class);
    }

    /**
     * PIC sesi = pembuat (nama di-snapshot saat sesi dibuat, awet walau nama user berubah).
     */
    public function getPicNameAttribute(): ?string
    {
        return $this->creator_name_snapshot ?? $this->user?->name;
    }

    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }
}