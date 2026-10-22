<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class FloorPlan extends Model
{
    protected $fillable = [
        'branch_id',
        'floor',
        'name',
        'floor_order',
        'elevation_y',
        'image_path',
        'image_width',
        'image_height',
        'viewbox',
        'is_active',
    ];

    protected $casts = [
        'floor_order' => 'integer',
        'elevation_y' => 'decimal:2',
        'image_width' => 'integer',
        'image_height' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? Storage::url($this->image_path) : null;
    }
}

