<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Status LOO berpindah dari nama divisi ke nama fase pipeline. ENUM MySQL
     * harus diperluas DULU (memuat nilai lama + baru) supaya
     * `2026_10_25_090000_recompute_loo_status_from_pipeline` bisa menulis nilai
     * baru tanpa terpotong. Penyempitan ke daftar final dilakukan setelahnya.
     *
     * SQLite memetakan ENUM ke varchar tanpa CHECK, jadi hanya MySQL yang perlu.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('loos', function (Blueprint $table) {
            $table->enum('status', [
                'draft',
                'legal_review',
                'accounting_review',
                'tenant_mgmt_review',
                'measurement',
                'ba_handover',
                'fitout',
                'pre_handover',
                'pengisian_divisi',
                'pengukuran_ulang',
                'sebelum_fitout',
                'setelah_fitout',
                'completed',
                'cancelled',
            ])->default('draft')->change();
        });
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('loos', function (Blueprint $table) {
            $table->enum('status', [
                'draft',
                'legal_review',
                'accounting_review',
                'tenant_mgmt_review',
                'measurement',
                'ba_handover',
                'fitout',
                'pre_handover',
                'completed',
                'cancelled',
            ])->default('draft')->change();
        });
    }
};