<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GateSyncLog extends Model
{
    protected $fillable = [
        'kind', 'is_dry_run', 'count_baru', 'count_diperbarui', 'count_gagal',
        'count_dilewati', 'count_departemen', 'count_divisi', 'count_jabatan', 'user_id',
    ];

    protected function casts(): array
    {
        return ['is_dry_run' => 'boolean'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
