<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Opsi jenis badan hukum yang masih dipakai form. */
    private const ENTITY_TYPES = ['PT', 'CV', 'Perorangan'];

    /** Field yang dihapus dari form per section. */
    private const DROPPED_KEYS = [
        'biaya_termin' => ['escalation_pct'],
        'manajemen_tenant' => ['floor_preference', 'zone_preference', 'unit_preference'],
    ];

    public function up(): void
    {
        DB::table('loo_sections')
            ->where('section_key', 'legalitas')
            ->orderBy('id')
            ->each(function ($row) {
                $data = json_decode((string) $row->data, true);

                if (! is_array($data)) {
                    return;
                }

                $entityType = $data['entity_type'] ?? null;
                if ($entityType !== null && ! in_array($entityType, self::ENTITY_TYPES, true)) {
                    $data['entity_type'] = null;
                }

                DB::table('loo_sections')->where('id', $row->id)->update([
                    'data' => json_encode($data),
                ]);
            });

        foreach (self::DROPPED_KEYS as $sectionKey => $keys) {
            DB::table('loo_sections')
                ->where('section_key', $sectionKey)
                ->orderBy('id')
                ->each(function ($row) use ($keys) {
                    $data = json_decode((string) $row->data, true);

                    if (! is_array($data)) {
                        return;
                    }

                    foreach ($keys as $key) {
                        unset($data[$key]);
                    }

                    DB::table('loo_sections')->where('id', $row->id)->update([
                        'data' => json_encode($data),
                    ]);
                });
        }
    }

    public function down(): void
    {
        // Data yang dihapus tidak bisa dipulihkan.
    }
};
