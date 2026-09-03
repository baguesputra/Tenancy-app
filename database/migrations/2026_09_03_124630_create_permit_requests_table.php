<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permit_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('permit_number');
            $table->json('activity_types');
            $table->date('request_date');

            $table->foreignId('tenant_id')->nullable()->constrained();
            $table->string('store_name_snapshot');
            $table->string('floor_snapshot')->nullable();
            $table->string('block_snapshot')->nullable();
            $table->string('unit_number_snapshot')->nullable();

            $table->string('pic_name')->nullable();
            $table->string('pic_phone')->nullable();

            $table->boolean('is_external')->default(false);
            $table->string('contractor_company')->nullable();
            $table->string('contractor_pic')->nullable();
            $table->text('contractor_address')->nullable();
            $table->string('contractor_phone')->nullable();

            $table->string('job_type')->nullable();
            $table->date('work_start_date')->nullable();
            $table->date('work_end_date')->nullable();
            $table->time('work_start_time')->nullable();
            $table->time('work_end_time')->nullable();
            $table->text('access_route')->nullable();
            $table->text('notes')->nullable();

            $table->morphs('requested_by'); // requested_by_type, requested_by_id

            $table->string('status')->default('draft');

            $table->foreignId('tenancy_approved_by')->nullable()->constrained('users');
            $table->timestamp('tenancy_approved_at')->nullable();
            $table->text('tenancy_notes')->nullable();

            $table->foreignId('bs_approved_by')->nullable()->constrained('users');
            $table->timestamp('bs_approved_at')->nullable();

            $table->foreignId('security_checked_by')->nullable()->constrained('users');
            $table->timestamp('security_checked_at')->nullable();
            $table->text('security_notes')->nullable();

            $table->string('barcode_token')->unique();

            $table->foreignId('rejected_by')->nullable()->constrained('users');
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_requests');
    }
};
