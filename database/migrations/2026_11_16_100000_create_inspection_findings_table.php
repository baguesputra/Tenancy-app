<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_findings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inspection_id');
            $table->foreign('inspection_id')->references('id')->on('inspections')->cascadeOnDelete();

            $table->uuid('inspection_answer_id')->nullable();
            $table->foreign('inspection_answer_id')->references('id')->on('inspection_answers')->nullOnDelete();

            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('checklist_item_id')->nullable()->constrained()->nullOnDelete();

            $table->string('section_name')->nullable();
            $table->string('item_label');
            $table->text('finding_note')->nullable();

            $table->string('severity', 20)->default('minor'); // minor | major | critical
            $table->string('status', 20)->default('open'); // open | submitted | verified | rejected
            $table->date('due_date')->nullable();
            $table->text('action_required')->nullable();

            $table->text('resolution_note')->nullable();
            $table->string('resolution_photo_path')->nullable();
            $table->string('resolved_by_name')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_note')->nullable();

            $table->timestamps();

            $table->unique(['inspection_id', 'checklist_item_id'], 'findings_inspection_item_unique');
            $table->index(['branch_id', 'status', 'due_date'], 'findings_branch_status_due_idx');
            $table->index(['tenant_id', 'status'], 'findings_tenant_status_idx');
            $table->index(['tenant_id', 'checklist_item_id'], 'findings_tenant_item_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_findings');
    }
};
