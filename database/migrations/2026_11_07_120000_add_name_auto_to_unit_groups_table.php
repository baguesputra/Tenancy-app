<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_groups', function (Blueprint $table) {
            // true = nama dihitung ulang dari unit anggota selama belum diedit manual.
            $table->boolean('name_auto')->default(false)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('unit_groups', function (Blueprint $table) {
            $table->dropColumn('name_auto');
        });
    }
};
