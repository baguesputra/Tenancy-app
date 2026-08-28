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
        Schema::create('checklist_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_template_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // "Civil", "Kondisi Unit", "Security", dst
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklist_sections');
    }
};
