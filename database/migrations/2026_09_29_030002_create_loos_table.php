<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loos', function (Blueprint $table) {
            $table->id();
            $table->string('loo_number')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('marketing_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('prospective_tenant_name')->nullable();
            $table->foreignId('tenant_category_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', [
                'draft',
                'legal_review',
                'accounting_review',
                'tenant_mgmt_review',
                'measurement',
                'ba_handover',
                'fitout',
                'pre_handover',
                'completed',
                'cancelled',
            ])->default('draft');
            $table->enum('current_stage', [
                'marketing',
                'legal',
                'accounting',
                'tenant_mgmt',
                'measurement',
                'ba_handover',
                'fitout',
                'pre_handover',
            ])->default('marketing');
            $table->string('cover_file_path')->nullable();
            $table->string('cover_hash')->nullable();
            $table->string('isi_file_path')->nullable();
            $table->string('isi_hash')->nullable();
            $table->date('loo_received_date')->nullable();
            $table->string('loo_distributor')->nullable();
            $table->string('loo_letter_file_path')->nullable();
            $table->string('loo_proposal_file_path')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['tenant_id', 'status']);
            $table->index('current_stage');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loos');
    }
};