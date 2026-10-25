<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Key checklist departemen yang dihapus dari checklist sebelum fitout. */
    private const DROPPED_DEPARTMENTS = ['engineering', 'kontraktor'];

    /** Field tanda tangan yang dihapus dari checklist sebelum fitout. */
    private const DROPPED_KEYS = [
        'signature_engineering',
        'signature_kontraktor',
        'signature_tenant',
        'signature_gm',
    ];

    public function up(): void
    {
        DB::table('loo_sections')
            ->where('section_key', 'fitout_checklist_pre')
            ->orderBy('id')
            ->each(function ($row) {
                $data = json_decode((string) $row->data, true);

                if (! is_array($data)) {
                    return;
                }

                foreach (self::DROPPED_KEYS as $key) {
                    unset($data[$key]);
                }

                if (isset($data['checklist']) && is_array($data['checklist'])) {
                    foreach (self::DROPPED_DEPARTMENTS as $dept) {
                        unset($data['checklist'][$dept]);
                    }

                    // Blok "Mengetahui" tidak dipakai lagi di checklist ini.
                    unset($data['checklist']['footer']);
                }

                DB::table('loo_sections')->where('id', $row->id)->update([
                    'data' => json_encode($data),
                ]);
            });
    }

    public function down(): void
    {
        // Data yang dihapus tidak bisa dipulihkan.
    }
};