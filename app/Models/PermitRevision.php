<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PermitRevision extends Model
{
    use HasUuids;

    protected $fillable = [
        'permit_request_id', 'revised_by_type', 'revised_by_id',
        'changes', 'reason', 'revision_no',
    ];

    protected function casts(): array
    {
        return ['changes' => 'array'];
    }

    public function permit()
    {
        return $this->belongsTo(PermitRequest::class, 'permit_request_id');
    }

    public function revisedBy()
    {
        return $this->morphTo(__FUNCTION__, 'revised_by_type', 'revised_by_id');
    }
}
