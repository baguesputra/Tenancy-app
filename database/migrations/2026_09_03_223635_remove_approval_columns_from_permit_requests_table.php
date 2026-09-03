<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropForeign(['tenancy_approved_by']);
            $table->dropForeign(['bs_approved_by']);
            $table->dropForeign(['security_checked_by']);
            $table->dropForeign(['rejected_by']);

            $table->dropColumn([
                'tenancy_approved_by', 'tenancy_approved_at', 'tenancy_notes',
                'bs_approved_by', 'bs_approved_at',
                'security_checked_by', 'security_checked_at', 'security_notes',
                'rejected_by', 'rejected_at', 'rejection_reason',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->foreignId('tenancy_approved_by')->nullable()->constrained('users');
            $table->timestamp('tenancy_approved_at')->nullable();
            $table->text('tenancy_notes')->nullable();
            $table->foreignId('bs_approved_by')->nullable()->constrained('users');
            $table->timestamp('bs_approved_at')->nullable();
            $table->foreignId('security_checked_by')->nullable()->constrained('users');
            $table->timestamp('security_checked_at')->nullable();
            $table->text('security_notes')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users');
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
        });
    }
};
