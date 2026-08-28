<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistSection extends Model
{
    protected $fillable = ['checklist_template_id', 'name', 'order'];

    public function template()
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }

    public function items()
    {
        return $this->hasMany(ChecklistItem::class)->orderBy('order');
    }
}