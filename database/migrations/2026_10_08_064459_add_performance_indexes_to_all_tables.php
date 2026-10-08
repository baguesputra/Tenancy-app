<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->index(['branch_id', 'is_active']);
            $table->index(['tenant_category_id', 'is_active']);
            $table->index(['product_category_id', 'is_active']);
        });

        Schema::table('units', function (Blueprint $table) {
            $table->index(['branch_id', 'is_active']);
            $table->index(['branch_id', 'floor', 'block', 'unit_number'], 'idx_units_branch_location');
        });

        Schema::table('tenancies', function (Blueprint $table) {
            $table->index(['unit_id', 'status']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::table('permit_requests', function (Blueprint $table) {
            $table->index(['branch_id', 'status']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::table('inspections', function (Blueprint $table) {
            $table->index(['tenant_id', 'inspection_session_id']);
            $table->index(['inspection_session_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['branch_id', 'is_active']);
            $table->dropIndex(['tenant_category_id', 'is_active']);
            $table->dropIndex(['product_category_id', 'is_active']);
        });

        Schema::table('units', function (Blueprint $table) {
            $table->dropIndex(['branch_id', 'is_active']);
            $table->dropIndex('idx_units_branch_location');
        });

        Schema::table('tenancies', function (Blueprint $table) {
            $table->dropIndex(['unit_id', 'status']);
            $table->dropIndex(['tenant_id', 'status']);
        });

        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropIndex(['branch_id', 'status']);
            $table->dropIndex(['tenant_id', 'status']);
        });

        Schema::table('inspections', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'inspection_session_id']);
            $table->dropIndex(['inspection_session_id', 'tenant_id']);
        });
    }
};
