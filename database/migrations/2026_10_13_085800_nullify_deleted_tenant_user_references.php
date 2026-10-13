<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Portal login tenant dihapus total: referensi ke akun tenant yang sudah
 * tidak ada (model TenantUser dihapus) dinullkan agar relasi morph
 * requestedBy/revisedBy tidak error saat dimuat.
 */
return new class extends Migration
{
    private const DELETED_TYPE = 'App\\Models\\TenantUser';

    public function up(): void
    {
        DB::table('permit_requests')
            ->where('requested_by_type', self::DELETED_TYPE)
            ->update(['requested_by_type' => null, 'requested_by_id' => null]);

        DB::table('permit_revisions')
            ->where('revised_by_type', self::DELETED_TYPE)
            ->update(['revised_by_type' => null, 'revised_by_id' => null]);
    }

    public function down(): void
    {
        // Atribusi pembuat yang terhapus tidak bisa dipulihkan.
    }
};
