<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistTemplateBusinessType extends Model
{
    protected $table = 'checklist_template_business_types';

    protected $fillable = ['checklist_template_id', 'business_type'];

    public function template()
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }
}