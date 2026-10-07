<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_sync_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('schedule_enabled')->default(true);
            $table->unsignedInteger('karyawan_interval_minutes')->default(15);
            $table->string('master_daily_at', 5)->default('02:00');
            $table->boolean('jit_enabled')->default(true);
            $table->unsignedTinyInteger('grace_miss_count')->default(2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_sync_settings');
    }
};
