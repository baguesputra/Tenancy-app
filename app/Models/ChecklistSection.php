<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistSection extends Model
{
    protected $fillable = ['checklist_template_id', 'name', 'order', 'scope_product_categories', 'floor_scope'];

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
     * Scope produk NULL = selalu tampil; array nama product category = hanya
     * untuk tenant berkategori tersebut. Tenant tanpa kategori melihat semua.
     * Scope lantai NULL = semua lantai; 'ground_only' = hanya lantai dasar
     * (GF) — butuh bukti positif, unit tanpa info lantai tidak lolos;
     * 'non_ground' = semua kecuali lantai dasar (termasuk tanpa info lantai).
     */
    public function isVisibleFor(?string $productCategoryName, ?string $floor = null): bool
    {
        if ($productCategoryName === null) {
            return true;
        }

        if ($this->scope_product_categories !== null
            && ! in_array($productCategoryName, $this->scope_product_categories, true)
        ) {
            return false;
        }

        if ($this->floor_scope === null) {
            return true;
        }

        if ($this->floor_scope === 'ground_only') {
            return self::isGroundFloor($floor);
        }

        return $floor === null || ! self::isGroundFloor($floor);
    }

    /**
     * Kode lantai dasar di master unit: 'GF' (varian 'dasar'/'ground' diterima).
     */
    public static function isGroundFloor(?string $floor): bool
    {
        return in_array(strtolower(trim((string) $floor)), ['gf', 'dasar', 'ground', 'ground floor'], true);
    }
}
