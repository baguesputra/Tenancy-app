<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inspection_id');
            $table->foreign('inspection_id')->references('id')->on('inspections')->cascadeOnDelete();

            // Referensi saja — sumber kebenaran label/opsi tetap di checklist_snapshot induknya
            $table->foreignId('checklist_item_id')->constrained();

            $table->string('value')->nullable(); // isi option_positive/option_negative, atau teks bebas
            $table->text('note')->nullable(); // kolom "Keterangan" per item

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_answers');
    }
};