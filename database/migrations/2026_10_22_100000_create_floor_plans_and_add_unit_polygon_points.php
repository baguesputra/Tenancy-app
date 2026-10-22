<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('floor_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('floor', 20); // 'GF', '1', '2', '3', '5'
            $table->string('name', 100);  // 'Ground Floor', 'Lantai 1', dst.
            $table->unsignedInteger('floor_order')->default(1);
            $table->decimal('elevation_y', 6, 2)->default(4.0); // Ketinggian Y (meter)
            $table->string('image_path')->nullable(); // Denah dasar (SVG / WebP / PNG)
            $table->unsignedInteger('image_width')->default(1000);
            $table->unsignedInteger('image_height')->default(600);
            $table->string('viewbox')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'floor']);
        });

        Schema::table('units', function (Blueprint $table) {
            $table->json('polygon_points')->nullable()->after('size');
            $table->string('custom_color', 7)->nullable()->after('polygon_points');
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropColumn(['polygon_points', 'custom_color']);
        });

        Schema::dropIfExists('floor_plans');
    }
};

