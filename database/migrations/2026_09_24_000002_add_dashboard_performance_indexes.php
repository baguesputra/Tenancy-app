<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $t) {
            $t->index(['branch_id', 'work_start_date', 'work_end_date'], 'pr_branch_workdate_idx');
        });
        Schema::table('tenancies', function (Blueprint $t) {
            $t->index(['end_date'], 'tenancies_enddate_idx');
            $t->index(['start_date', 'end_date'], 'tenancies_start_end_idx');
        });
        Schema::table('approvals', function (Blueprint $t) {
            $t->index(['department_id', 'status'], 'approvals_dept_status_idx');
        });
        Schema::table('units', function (Blueprint $t) {
            $t->index(['branch_id', 'is_active'], 'units_branch_active_idx');
        });
        Schema::table('tenants', function (Blueprint $t) {
            $t->index(['branch_id', 'is_active'], 'tenants_branch_active_idx');
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', fn (Blueprint $t) => $t->dropIndex('pr_branch_workdate_idx'));
        Schema::table('tenancies', fn (Blueprint $t) => $t->dropIndex('tenancies_enddate_idx'));
        Schema::table('tenancies', fn (Blueprint $t) => $t->dropIndex('tenancies_start_end_idx'));
        Schema::table('approvals', fn (Blueprint $t) => $t->dropIndex('approvals_dept_status_idx'));
        Schema::table('units', fn (Blueprint $t) => $t->dropIndex('units_branch_active_idx'));
        Schema::table('tenants', fn (Blueprint $t) => $t->dropIndex('tenants_branch_active_idx'));
    }
};
