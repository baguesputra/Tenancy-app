<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_goods', function (Blueprint $table) {
            $table->id();
            $table->uuid('permit_request_id');
            $table->foreign('permit_request_id', 'pg_permit_fk')
                ->references('id')->on('permit_requests')->cascadeOnDelete();

            $table->string('description');
            $table->string('quantity_note')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('checked_at')->nullable();
            $table->string('photo_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_goods');
    }
};
