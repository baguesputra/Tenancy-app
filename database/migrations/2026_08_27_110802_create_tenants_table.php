<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained();

            $table->string('name');
            $table->string('business_type'); // 'f&b', 'fashion' — cocok dengan business_type di checklist_templates
            $table->boolean('is_anchor')->default(false);

            // Lokasi unit (dari form Fashion: Lantai/Blok/No)
            $table->string('floor')->nullable();
            $table->string('block')->nullable();
            $table->string('unit_number')->nullable();

            // Info PIC tenant (dari form F&B: Nama PIC, Jabatan, Telepon)
            $table->string('pic_name')->nullable();
            $table->string('pic_position')->nullable();
            $table->string('pic_phone')->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};