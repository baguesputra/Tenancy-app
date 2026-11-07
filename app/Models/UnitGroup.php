<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UnitGroup extends Model
{
    protected $fillable = [
        'branch_id', 'name', 'name_auto', 'code', 'size', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'name_auto' => 'boolean',
            'size' => 'decimal:2',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function units()
    {
        return $this->belongsToMany(Unit::class, 'unit_group_unit')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function primaryUnit()
    {
        return $this->belongsToMany(Unit::class, 'unit_group_unit')
            ->withPivot('is_primary')
            ->wherePivot('is_primary', true);
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
     * Unit fisik pertama grup; dipakai sebagai `tenancies.unit_id`.
     */
    public function primaryUnitModel(): ?Unit
    {
        return $this->units()
            ->orderByDesc('unit_group_unit.is_primary')
            ->orderBy('units.unit_number')
            ->first();
    }

    protected static function booted(): void
    {
        static::created(function (UnitGroup $group) {
            ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => static::class,
                'scannable_id' => $group->id,
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
