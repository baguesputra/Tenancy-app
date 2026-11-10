<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Unit extends Model
{
    protected $fillable = [
        'branch_id', 'floor', 'block', 'unit_number',
        'unit_code', 'usage_type', 'size', 'polygon_points', 'custom_color', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'polygon_points' => 'array',
        ];
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

    public function assignments()
    {
        return $this->hasMany(UnitAssignment::class);
    }

    public function activeAssignment()
    {
        return $this->hasOne(UnitAssignment::class)->whereNull('ended_at');
    }

    public function group()
    {
        return $this->belongsToMany(UnitGroup::class, 'unit_group_unit')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * Status dihitung otomatis dari ada/tidaknya tenancy aktif —
     * bukan kolom manual, sesuai keputusan sebelumnya.
     *
     * Unit anggota grup dianggap terisi bila grupnya punya tenancy aktif
     * (kontrak grup hanya menempel di unit primary).
     */
    public function isOccupied(): bool
    {
        return $this->hasActiveTenancy();
    }

    private function hasActiveTenancy(): bool
    {
        $own = $this->relationLoaded('activeTenancy')
            ? $this->activeTenancy !== null
            : $this->activeTenancy()->exists();

        if ($own) {
            return true;
        }

        if (! $this->relationLoaded('group')) {
            $this->load('group.activeTenancy');
        } elseif ($this->group->contains(fn (UnitGroup $group) => ! $group->relationLoaded('activeTenancy'))) {
            $this->group->load('activeTenancy');
        }

        return $this->group->contains(fn (UnitGroup $group) => $group->activeTenancy !== null);
    }

    public function isInternal(): bool
    {
        return $this->usage_type === 'internal';
    }

    public function isLeasable(): bool
    {
        return $this->usage_type === 'tenant';
    }

    /**
     * Urutan prioritas status: Nonaktif → Tenisi → Internal → Fasilitas → Kosong.
     */
    public function occupancyState(): string
    {
        if (! $this->is_active) {
            return 'inactive';
        }

        if ($this->hasActiveTenancy()) {
            return 'occupied';
        }

        if ($this->activeAssignment || $this->usage_type === 'internal') {
            return 'internal';
        }

        if ($this->usage_type === 'common') {
            return 'common';
        }

        return 'vacant';
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
