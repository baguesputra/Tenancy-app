<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('gate_id', 50)->nullable()->unique()->after('id');
        });

        Schema::create('divisions', function (Blueprint $table) {
            $table->id();
            $table->string('gate_id', 50)->nullable()->unique();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('gate_id', 50)->nullable()->unique();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('division_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('level')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('division_id')->nullable()->after('department_id')->constrained()->nullOnDelete();
            $table->foreignId('position_id')->nullable()->after('division_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('position_id');
            $table->dropConstrainedForeignId('division_id');
        });
        Schema::dropIfExists('positions');
        Schema::dropIfExists('divisions');
        Schema::table('departments', function (Blueprint $table) {
            $table->dropUnique(['gate_id']);
            $table->dropColumn('gate_id');
        });
    }
};
