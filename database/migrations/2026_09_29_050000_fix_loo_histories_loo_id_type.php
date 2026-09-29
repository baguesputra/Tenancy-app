<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (in_array(Schema::getColumnType('loo_histories', 'loo_id'), ['integer', 'bigint'], true)) {
            return;
        }

        Schema::table('loo_histories', function (Blueprint $table) {
            $table->unsignedBigInteger('loo_id')->nullable()->change();
        });

        Schema::table('loo_histories', function (Blueprint $table) {
            $table->foreign('loo_id')->references('id')->on('loos')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('loo_histories', function (Blueprint $table) {
            $table->dropForeign(['loo_id']);
            $table->uuid('loo_id')->nullable()->change();
        });
    }
};
