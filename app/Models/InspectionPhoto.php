<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InspectionPhoto extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'inspection_answer_id',
        'path',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return ['uploaded_at' => 'datetime'];
    }

    public function answer()
    {
        return $this->belongsTo(InspectionAnswer::class, 'inspection_answer_id');
    }

    public function url()
    {
        return asset('storage/' . $this->path);
    }
}