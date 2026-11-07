<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Area gabungan: beberapa unit fisik disewakan sebagai satu identitas.
        Schema::create('unit_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->decimal('size', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'name']);
        });

        Schema::create('unit_group_unit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // Satu unit fisik hanya boleh jadi anggota satu group.
            $table->unique('unit_id');
        });

        Schema::table('tenancies', function (Blueprint $table) {
            // unit_id tetap wajib (unit primary) untuk kompatibilitas pembacaan lama.
            $table->foreignId('unit_group_id')->nullable()->after('unit_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tenancies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('unit_group_id');
        });

        Schema::dropIfExists('unit_group_unit');
        Schema::dropIfExists('unit_groups');
    }
};
