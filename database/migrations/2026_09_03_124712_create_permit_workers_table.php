<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_workers', function (Blueprint $table) {
            $table->id();
            $table->uuid('permit_request_id');
            $table->foreign('permit_request_id', 'pw_permit_fk')
                ->references('id')->on('permit_requests')->cascadeOnDelete();

            $table->string('name');
            $table->integer('order')->default(0);
            $table->boolean('is_present')->default(false);
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_workers');
    }
};
