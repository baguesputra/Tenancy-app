<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_section_id')->constrained()->cascadeOnDelete();

            $table->string('label'); // "Dinding", "Suhu Ruangan", dst
            $table->string('type')->default('binary_choice'); // 'binary_choice' atau 'free_text'

            $table->string('option_positive')->nullable(); // "baik", "ada", "Ok", dst
            $table->string('option_negative')->nullable(); // "tidak baik", "tidak ada", "Tidak", dst

            $table->boolean('photo_required_on_negative')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklist_items');
    }
};
