<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scannable_codes', function (Blueprint $table) {
            $table->id();
            $table->string('token')->unique();
            $table->string('scannable_type');
            $table->string('scannable_id');
            $table->timestamps();

            $table->index(['scannable_type', 'scannable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scannable_codes');
    }
};
