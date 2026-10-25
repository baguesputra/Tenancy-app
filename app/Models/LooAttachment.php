<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LooAttachment extends Model
{
    protected $fillable = [
        'loo_id',
        'path',
        'original_name',
        'mime',
        'size',
        'description',
        'uploaded_by',
    ];

    public function loo()
    {
        return $this->belongsTo(Loo::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}