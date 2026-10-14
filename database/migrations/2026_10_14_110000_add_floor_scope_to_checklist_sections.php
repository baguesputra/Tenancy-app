<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Scope lantai section (unifikasi form sidak — Lantai Dasar/GF).
     * NULL = semua lantai; 'ground_only' = hanya lantai dasar (GF);
     * 'non_ground' = semua kecuali lantai dasar.
     */
    public function up(): void
    {
        Schema::table('checklist_sections', function (Blueprint $table) {
            $table->string('floor_scope', 20)->nullable()->after('scope_product_categories');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checklist_sections', function (Blueprint $table) {
            $table->dropColumn('floor_scope');
        });
    }
};
