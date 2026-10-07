<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GateSyncSetting extends Model
{
    protected $fillable = [
        'schedule_enabled', 'karyawan_interval_minutes', 'master_daily_at',
        'jit_enabled', 'grace_miss_count',
    ];

    protected function casts(): array
    {
        return [
            'schedule_enabled' => 'boolean',
            'jit_enabled' => 'boolean',
        ];
    }

    public static function current(): self
    {
        if (static::$memo && static::$memo->exists) {
            return static::$memo;
        }
        try {
            return static::$memo ??= static::first() ?? new static([
                'schedule_enabled' => true,
                'karyawan_interval_minutes' => 15,
                'master_daily_at' => '02:00',
                'jit_enabled' => true,
                'grace_miss_count' => 2,
            ]);
        } catch (\Throwable) {
            return new static([
                'schedule_enabled' => true,
                'karyawan_interval_minutes' => 15,
                'master_daily_at' => '02:00',
                'jit_enabled' => true,
                'grace_miss_count' => 2,
            ]);
        }
    }

    public static function simpan(array $attrs): self
    {
        $model = static::first();
        if ($model) {
            $model->update($attrs);
        } else {
            $model = static::create($attrs);
        }
        static::$memo = $model->fresh();

        return static::$memo;
    }

    protected static ?self $memo = null;
}
