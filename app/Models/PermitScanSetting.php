<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermitScanSetting extends Model
{
    /** Hari ISO: 1 = Senin ... 7 = Minggu. */
    public const DAY_LABELS = [
        1 => 'Senin',
        2 => 'Selasa',
        3 => 'Rabu',
        4 => 'Kamis',
        5 => 'Jumat',
        6 => 'Sabtu',
        7 => 'Minggu',
    ];

    protected $fillable = ['enabled', 'windows'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'windows' => 'array',
        ];
    }

    public static function defaults(): array
    {
        $defaults = [];

        foreach (self::DAY_LABELS as $day => $label) {
            $defaults[(string) $day] = [
                'open' => '22:10',
                'close' => $day === 7 ? '09:50' : '08:50',
                'enabled' => true,
            ];
        }

        return $defaults;
    }

    public static function current(): self
    {
        return static::first() ?? new static([
            'enabled' => true,
            'windows' => self::defaults(),
        ]);
    }

    public static function simpan(array $attrs): self
    {
        $model = static::first();

        return $model ? tap($model)->update($attrs) : static::create($attrs);
    }
}
