<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Kategori "Area Duta Mall" dihapus total (digabung ke Vendor):
 * baris lama non-pameran tanpa tenant, bukan eksternal, dan tanpa
 * perusahaan kontraktor ditandai is_external agar berkategori vendor.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('permit_requests')
            ->whereNull('tenant_id')
            ->where('activity_types', 'not like', '%pameran%')
            ->where(function ($q) {
                $q->where('is_external', false)->orWhereNull('is_external');
            })
            ->whereNull('contractor_company')
            ->update(['is_external' => true]);
    }

    public function down(): void
    {
        // Baris yang dikonversi tidak bisa dibedakan lagi dari vendor asli.
    }
};
