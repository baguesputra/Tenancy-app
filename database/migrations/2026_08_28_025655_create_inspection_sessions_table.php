<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary(); // dibuat di client (mobile), bukan auto-increment
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('user_id')->constrained();

            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->string('status')->default('in_progress'); // in_progress, completed, synced

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_sessions');
    }
};