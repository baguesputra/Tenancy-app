<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loo_histories', function (Blueprint $table) {
            $table->id();
            $table->uuid('loo_id');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('action', [
                'created',
                'cover_uploaded',
                'isi_uploaded',
                'section_filled',
                'status_changed',
                'termin_created',
                'termin_paid',
                'measurement_recorded',
                'ba_created',
                'fitout_started',
                'fitout_checklist_updated',
                'fitout_completed',
                'pre_handover_submitted',
                'handover_completed',
                'cancelled',
            ])->default('created');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->string('from_stage')->nullable();
            $table->string('to_stage')->nullable();
            $table->json('changes')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['loo_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loo_histories');
    }
};