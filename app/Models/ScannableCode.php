<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScannableCode extends Model
{
    protected $fillable = ['token', 'scannable_type', 'scannable_id'];

    public function scannable()
    {
        return $this->morphTo();
    }
}