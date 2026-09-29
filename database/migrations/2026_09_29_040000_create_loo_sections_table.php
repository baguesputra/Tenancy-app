<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loo_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loo_id')->constrained('loos')->cascadeOnDelete();
            $table->string('section_key', 40);
            $table->string('section_label');
            $table->json('data')->nullable();
            $table->foreignId('filled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('filled_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->boolean('is_submitted')->default(false);
            $table->timestamps();

            $table->unique(['loo_id', 'section_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loo_sections');
    }
};
