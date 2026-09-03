<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_request_departments', function (Blueprint $table) {
            $table->id();
            $table->uuid('permit_request_id');
            $table->foreign('permit_request_id', 'prd_permit_fk')
                ->references('id')->on('permit_requests')->cascadeOnDelete();

            $table->foreignId('department_id')->constrained();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_request_departments');
    }
};
