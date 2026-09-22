<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_revisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('permit_request_id')->constrained('permit_requests')->cascadeOnDelete();
            $table->string('revised_by_type');
            $table->string('revised_by_id');
            $table->json('changes');
            $table->text('reason');
            $table->unsignedInteger('revision_no');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_revisions');
    }
};
