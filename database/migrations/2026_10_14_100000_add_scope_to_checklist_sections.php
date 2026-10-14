<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Scope tampil section per nama product category (unifikasi form sidak).
     * NULL = selalu tampil untuk semua tenant; array nama = hanya untuk
     * tenant dengan product category tersebut (mis. ['F&B']).
     */
    public function up(): void
    {
        Schema::table('checklist_sections', function (Blueprint $table) {
            $table->json('scope_product_categories')->nullable()->after('order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checklist_sections', function (Blueprint $table) {
            $table->dropColumn('scope_product_categories');
        });
    }
};
