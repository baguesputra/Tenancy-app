<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_company_branch_map', function (Blueprint $table) {
            $table->id();
            $table->string('gate_company_id')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('gate_department_map', function (Blueprint $table) {
            $table->id();
            $table->string('gate_department_id')->unique();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_department_map');
        Schema::dropIfExists('gate_company_branch_map');
    }
};
