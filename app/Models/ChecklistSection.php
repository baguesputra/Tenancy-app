<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistSection extends Model
{
    protected $fillable = ['checklist_template_id', 'name', 'order', 'scope_product_categories'];

    protected function casts(): array
    {
        return ['scope_product_categories' => 'array'];
    }

    public function template()
    {
        return $this->belongsTo(ChecklistTemplate::class, 'checklist_template_id');
    }

    public function items()
    {
        return $this->hasMany(ChecklistItem::class)->orderBy('order');
    }

    /**
     * Scope tampil section (unifikasi form sidak).
     * NULL = selalu tampil; array nama product category = hanya untuk
     * tenant berkategori tersebut. Tenant tanpa kategori melihat semua.
     */
    public function isVisibleFor(?string $productCategoryName): bool
    {
        if ($productCategoryName === null) {
            return true;
        }

        if ($this->scope_product_categories === null) {
            return true;
        }

        return in_array($productCategoryName, $this->scope_product_categories, true);
    }
}
