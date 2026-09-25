<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20);
            $table->boolean('is_dry_run')->default(false);
            $table->unsignedInteger('count_baru')->default(0);
            $table->unsignedInteger('count_diperbarui')->default(0);
            $table->unsignedInteger('count_gagal')->default(0);
            $table->unsignedInteger('count_dilewati')->default(0);
            $table->unsignedInteger('count_departemen')->default(0);
            $table->unsignedInteger('count_divisi')->default(0);
            $table->unsignedInteger('count_jabatan')->default(0);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_sync_logs');
    }
};
