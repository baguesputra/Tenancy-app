<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Riwayat pemakaian internal: siapa (divisi/PIC) memakai unit kapan.
        // Assignment aktif = ended_at masih null.
        Schema::create('unit_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('pic_name')->nullable();
            $table->string('pic_phone')->nullable();
            $table->text('note')->nullable();
            $table->date('started_at');
            $table->date('ended_at')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_assignments');
    }
};
