<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistTemplate extends Model
{
    protected $fillable = ['name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function businessTypes()
    {
        return $this->hasMany(ChecklistTemplateBusinessType::class);
    }

    public function sections()
    {
        return $this->hasMany(ChecklistSection::class)->orderBy('order');
    }

    /**
     * Ambil struktur lengkap template (untuk keperluan snapshot saat sidak dimulai).
     */
    public function toSnapshotArray(): array
    {
        return [
            'template_id' => $this->id,
            'template_name' => $this->name,
            'sections' => $this->sections->map(function ($section) {
                return [
                    'id' => $section->id,
                    'name' => $section->name,
                    'items' => $section->items->map(fn ($item) => [
                        'id' => $item->id,
                        'label' => $item->label,
                        'type' => $item->type,
                        'option_positive' => $item->option_positive,
                        'option_negative' => $item->option_negative,
                        'photo_required_on_negative' => $item->photo_required_on_negative,
                    ]),
                ];
            }),
        ];
    }

    public function productCategories()
    {
        return $this->belongsToMany(
            ProductCategory::class,
            'checklist_template_product_categories'
        );
    }
}