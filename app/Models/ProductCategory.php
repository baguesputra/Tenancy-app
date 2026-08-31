<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductCategory extends Model
{
    protected $fillable = ['name', 'description'];

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }

    public function checklistTemplates()
    {
        return $this->belongsToMany(
            ChecklistTemplate::class,
            'checklist_template_product_categories'
        );
    }
}