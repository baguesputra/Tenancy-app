<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Inspection extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'inspection_session_id',
        'tenant_id',
        'checklist_template_id',
        'checklist_snapshot',
        'notes',
        'status',
        'is_flagged',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'checklist_snapshot' => 'array',
            'is_flagged' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }

    public function session()
    {
        return $this->belongsTo(InspectionSession::class, 'inspection_session_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function template()
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }

    public function answers()
    {
        return $this->hasMany(InspectionAnswer::class);
    }
}