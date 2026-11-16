<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InspectionFinding extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    public const SEVERITIES = ['minor', 'major', 'critical'];

    public const STATUSES = ['open', 'submitted', 'verified', 'rejected'];

    protected $fillable = [
        'id',
        'inspection_id',
        'inspection_answer_id',
        'tenant_id',
        'branch_id',
        'checklist_item_id',
        'section_name',
        'item_label',
        'finding_note',
        'severity',
        'status',
        'due_date',
        'action_required',
        'resolution_note',
        'resolution_photo_path',
        'resolved_by_name',
        'resolved_at',
        'verified_by',
        'verified_at',
        'verification_note',
    ];

    protected $appends = ['resolution_photo_url', 'is_overdue'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'resolved_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function inspection()
    {
        return $this->belongsTo(Inspection::class);
    }

    public function answer()
    {
        return $this->belongsTo(InspectionAnswer::class, 'inspection_answer_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function checklistItem()
    {
        return $this->belongsTo(ChecklistItem::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function getResolutionPhotoUrlAttribute(): ?string
    {
        return $this->resolution_photo_path
            ? '/storage/'.ltrim($this->resolution_photo_path, '/')
            : null;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status !== 'verified'
            && $this->due_date !== null
            && $this->due_date->lt(now()->startOfDay());
    }
}
