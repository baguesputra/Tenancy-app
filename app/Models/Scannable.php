<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Scannable extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Get the owning scannable model.
     */
    public function scannable(): MorphTo
    {
        return $this->morphTo();
    }
}
