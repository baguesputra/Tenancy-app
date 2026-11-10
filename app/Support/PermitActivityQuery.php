<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

/**
 * Saringan kategori permit yang bisa memakai index.
 *
 * MySQL: kolom generated `activity_category`.
 * SQLite (tes): json_each, setara JSON_CONTAINS dan tetap benar untuk nilai
 * yang merupakan substring nilai lain (mis. "event" di dalam "prevent").
 */
class PermitActivityQuery
{
    public const KEGIATAN = ['event', 'meeting_internal', 'stock_opname'];

    public const SPECIAL = ['pameran', 'event', 'meeting_internal', 'stock_opname', 'langganan_parkir', 'customer_form'];

    public static function usesGeneratedColumn(): bool
    {
        return DB::connection()->getDriverName() === 'mysql';
    }

    public static function contains(Builder|Relation $query, string $type): Builder|Relation
    {
        if (self::usesGeneratedColumn()) {
            return $query->whereRaw('json_contains(activity_types, ?)', [json_encode($type)]);
        }

        return $query->whereExists(fn ($sub) => $sub
            ->selectRaw('1')
            ->fromRaw('json_each(permit_requests.activity_types)')
            ->where('json_each.value', $type));
    }

    public static function missing(Builder|Relation $query, string $type): Builder|Relation
    {
        if (self::usesGeneratedColumn()) {
            return $query->whereRaw('not json_contains(coalesce(activity_types, ?), ?)', ['[]', json_encode($type)]);
        }

        return $query->whereNotExists(fn ($sub) => $sub
            ->selectRaw('1')
            ->fromRaw('json_each(permit_requests.activity_types)')
            ->where('json_each.value', $type));
    }

    public static function containsAny(Builder|Relation $query, array $types): Builder|Relation
    {
        return $query->where(function ($q) use ($types) {
            foreach ($types as $type) {
                $q->orWhere(fn ($inner) => self::contains($inner, $type));
            }
        });
    }

    public static function missingAll(Builder|Relation $query, array $types): Builder|Relation
    {
        foreach ($types as $type) {
            self::missing($query, $type);
        }

        return $query;
    }

    /**
     * Kategori daftar permit. Urutan harus sama dengan generated column.
     */
    public static function category(Builder|Relation $query, ?string $category): Builder|Relation
    {
        if ($category === null || $category === '') {
            return $query;
        }

        if (self::usesGeneratedColumn()) {
            return $query->where('activity_category', $category);
        }

        return match ($category) {
            'pameran' => self::contains($query, 'pameran'),
            'parkir' => self::contains($query, 'langganan_parkir'),
            'customer' => self::contains($query, 'customer_form'),
            'kegiatan' => self::missing($query, 'pameran')->where(fn ($q) => self::containsAny($q, self::KEGIATAN)),
            'tenant' => self::missingAll($query, self::SPECIAL)->whereNotNull('tenant_id'),
            'vendor' => self::missingAll($query, self::SPECIAL)->whereNull('tenant_id'),
            default => $query,
        };
    }
}
