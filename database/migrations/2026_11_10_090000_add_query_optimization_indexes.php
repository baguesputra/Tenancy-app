<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Giliran saya": cari step pending lalu cek step sebelumnya pada permit yang sama.
        Schema::table('approvals', function (Blueprint $table) {
            $table->index(
                ['approvable_type', 'approvable_id', 'status', 'order'],
                'approvals_approvable_status_order_idx'
            );
        });

        // Kalender LOO per cabang, satu index per kolom tanggal.
        Schema::table('loos', function (Blueprint $table) {
            $table->index(['branch_id', 'loo_received_date'], 'loos_branch_received_idx');
            $table->index(['branch_id', 'submitted_at'], 'loos_branch_submitted_idx');
            $table->index(['branch_id', 'completed_at'], 'loos_branch_completed_idx');
            $table->index(['branch_id', 'cancelled_at'], 'loos_branch_cancelled_idx');
        });

        // Milestone section: saring section_key dulu, baru rentang tanggal.
        Schema::table('loo_sections', function (Blueprint $table) {
            $table->index(['section_key', 'filled_at'], 'loo_sections_key_filled_idx');
            $table->index(['section_key', 'submitted_at'], 'loo_sections_key_submitted_idx');
        });

        Schema::table('inspection_sessions', function (Blueprint $table) {
            $table->index(['branch_id', 'status', 'started_at'], 'sessions_branch_status_started_idx');
            $table->index(['user_id', 'status'], 'sessions_user_status_idx');
        });

        // Daftar tenant: filter cabang + aktif, urut terbaru.
        Schema::table('tenants', function (Blueprint $table) {
            $table->index(['branch_id', 'is_active', 'created_at'], 'tenants_branch_active_created_idx');
        });

        // Filter kategori permit lewat generated column, bukan LIKE di JSON.
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            Schema::table('permit_requests', function (Blueprint $table) {
                $table->string('activity_category', 20)
                    ->storedAs($this->activityCategoryExpression())
                    ->nullable()
                    ->index('permit_requests_activity_category_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::table('approvals', fn (Blueprint $t) => $t->dropIndex('approvals_approvable_status_order_idx'));
        Schema::table('loos', function (Blueprint $t) {
            $t->dropIndex('loos_branch_received_idx');
            $t->dropIndex('loos_branch_submitted_idx');
            $t->dropIndex('loos_branch_completed_idx');
            $t->dropIndex('loos_branch_cancelled_idx');
        });
        Schema::table('loo_sections', function (Blueprint $t) {
            $t->dropIndex('loo_sections_key_filled_idx');
            $t->dropIndex('loo_sections_key_submitted_idx');
        });
        Schema::table('inspection_sessions', function (Blueprint $t) {
            $t->dropIndex('sessions_branch_status_started_idx');
            $t->dropIndex('sessions_user_status_idx');
        });
        Schema::table('tenants', fn (Blueprint $t) => $t->dropIndex('tenants_branch_active_created_idx'));

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            Schema::table('permit_requests', function (Blueprint $t) {
                $t->dropIndex('permit_requests_activity_category_idx');
                $t->dropColumn('activity_category');
            });
        }
    }

    /**
     * Kategori diturunkan dengan urutan yang sama seperti PermitRequestController::categoryOf.
     */
    private function activityCategoryExpression(): string
    {
        return <<<'SQL'
            (case
                when json_contains(activity_types, '"pameran"') then 'pameran'
                when json_contains(activity_types, '"langganan_parkir"') then 'parkir'
                when json_contains(activity_types, '"customer_form"') then 'customer'
                when json_contains(activity_types, '"event"')
                    or json_contains(activity_types, '"meeting_internal"')
                    or json_contains(activity_types, '"stock_opname"') then 'kegiatan'
                when tenant_id is not null then 'tenant'
                else 'vendor'
            end)
            SQL;
    }
};
