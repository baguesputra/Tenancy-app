<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\ScannableCode;
use Illuminate\Support\Str;

class Unit extends Model
{
    protected $fillable = [
        'branch_id', 'floor', 'block', 'unit_number',
        'unit_code', 'size', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function tenancies()
    {
        return $this->hasMany(Tenancy::class);
    }

    public function activeTenancy()
    {
        return $this->hasOne(Tenancy::class)->where('status', 'active');
    }

    /**
     * Status dihitung otomatis dari ada/tidaknya tenancy aktif —
     * bukan kolom manual, sesuai keputusan sebelumnya.
     */
    public function isOccupied(): bool
    {
        return $this->activeTenancy()->exists();
    }

    protected static function booted(): void
    {
        static::creating(function (Unit $unit) {
            if (empty($unit->unit_code)) {
                $unit->unit_code = collect([$unit->floor, $unit->block, $unit->unit_number])
                    ->filter()->implode('-');
            }
        });

        static::created(function (Unit $unit) {
            ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => static::class,
                'scannable_id' => $unit->id,
            ]);
        });
    }

    public function scannableCode()
    {
        return $this->morphOne(ScannableCode::class, 'scannable');
    }

    public function getScanUrlAttribute(): string
    {
        $token = $this->scannableCode?->token;

        return $token ? route('scan.resolve', $token) : '';
    }
}