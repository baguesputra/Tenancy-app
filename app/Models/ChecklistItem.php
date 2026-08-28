<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistItem extends Model
{
    protected $fillable = [
        'checklist_section_id',
        'label',
        'type',
        'option_positive',
        'option_negative',
        'photo_required_on_negative',
        'order',
    ];

    protected function casts(): array
    {
        return ['photo_required_on_negative' => 'boolean'];
    }

    public function section()
    {
        return $this->belongsTo(ChecklistSection::class, 'checklist_section_id');
    }
}