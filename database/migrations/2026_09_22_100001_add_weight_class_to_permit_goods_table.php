<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_goods', function (Blueprint $table) {
            $table->string('weight_class', 10)->nullable()->after('quantity_note');
        });
    }

    public function down(): void
    {
        Schema::table('permit_goods', function (Blueprint $table) {
            $table->dropColumn('weight_class');
        });
    }
};
