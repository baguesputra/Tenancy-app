<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_number_counters', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20);
            $table->string('period', 7);
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['code', 'period']);
        });

        Schema::table('permit_requests', function (Blueprint $table) {
            $table->unique('permit_number');
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropUnique(['permit_number']);
        });

        Schema::dropIfExists('permit_number_counters');
    }
};
