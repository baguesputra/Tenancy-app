<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InspectionAnswer extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'inspection_id',
        'checklist_item_id',
        'value',
        'note',
    ];

    public function inspection()
    {
        return $this->belongsTo(Inspection::class);
    }

    public function checklistItem()
    {
        return $this->belongsTo(ChecklistItem::class);
    }

    public function photos()
    {
        return $this->hasMany(InspectionPhoto::class);
    }
}