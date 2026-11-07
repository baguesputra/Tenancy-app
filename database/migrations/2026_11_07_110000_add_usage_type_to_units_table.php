<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            // tenant = disewakan, internal = dipakai divisi (gudang/workshop), common = fasilitas
            $table->string('usage_type', 20)->default('tenant')->after('unit_code');
            $table->index('usage_type');
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropIndex(['usage_type']);
            $table->dropColumn('usage_type');
        });
    }
};
