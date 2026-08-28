<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'business_type',
        'is_anchor',
        'floor',
        'block',
        'unit_number',
        'pic_name',
        'pic_position',
        'pic_phone',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_anchor' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Template checklist yang relevan untuk tenant ini,
     * berdasarkan business_type (belum termasuk logic anchor,
     * sesuai keputusan: is_anchor cuma metadata, tidak pengaruhi checklist).
     */
    public function checklistTemplates()
    {
        return ChecklistTemplate::whereHas('businessTypes', function ($query) {
            $query->where('business_type', $this->business_type);
        })->where('is_active', true)->get();
    }

    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }
}