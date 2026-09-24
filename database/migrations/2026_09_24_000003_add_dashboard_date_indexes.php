<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $t) {
            $t->index(['work_start_date', 'work_end_date'], 'pr_workdate_idx');
        });
        Schema::table('units', function (Blueprint $t) {
            $t->index(['is_active'], 'units_active_idx');
        });
        Schema::table('tenants', function (Blueprint $t) {
            $t->index(['is_active'], 'tenants_active_idx');
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', fn (Blueprint $t) => $t->dropIndex('pr_workdate_idx'));
        Schema::table('units', fn (Blueprint $t) => $t->dropIndex('units_active_idx'));
        Schema::table('tenants', fn (Blueprint $t) => $t->dropIndex('tenants_active_idx'));
    }
};
