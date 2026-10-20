<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->string('vehicle_plate', 20)->nullable();
            $table->string('vehicle_type', 10)->nullable();
            $table->string('applicant_name')->nullable();
            $table->string('applicant_position')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropColumn(['vehicle_plate', 'vehicle_type', 'applicant_name', 'applicant_position']);
        });
    }
};
