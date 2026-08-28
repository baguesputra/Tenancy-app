<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inspection_session_id');
            $table->foreign('inspection_session_id')->references('id')->on('inspection_sessions')->cascadeOnDelete();

            $table->foreignId('tenant_id')->constrained();
            $table->foreignId('checklist_template_id')->constrained();

            // Snapshot struktur checklist saat sidak dimulai — sumber kebenaran utama,
            // supaya perubahan template di kemudian hari tidak mengubah riwayat lama
            $table->json('checklist_snapshot');

            $table->text('notes')->nullable(); // Keluhan/Saran/Catatan bebas
            $table->string('status')->default('draft'); // draft, completed
            $table->timestamp('synced_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};