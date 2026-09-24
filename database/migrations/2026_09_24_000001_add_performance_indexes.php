<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('inspection_sessions', 'status');
        $this->addIndex('inspections', 'status');
        $this->addIndex('permit_requests', 'status');
        $this->addIndex('permit_requests', 'branch_id');
        $this->addIndex('approvals', 'step_key');
        $this->addIndex('approvals', 'status');
        $this->addIndex('permit_revisions', ['revised_by_type', 'revised_by_id']);
        $this->addUnique('permit_revisions', ['permit_request_id', 'revision_no']);
    }

    public function down(): void
    {
        $this->dropIndex('inspection_sessions', ['status']);
        $this->dropIndex('inspections', ['status']);
        $this->dropIndex('permit_requests', ['status']);
        $this->dropIndex('permit_requests', ['branch_id']);
        $this->dropIndex('approvals', ['step_key']);
        $this->dropIndex('approvals', ['status']);
        $this->dropIndex('permit_revisions', ['revised_by_type', 'revised_by_id']);
        Schema::table('permit_revisions', function (Blueprint $table) {
            $table->dropUnique(['permit_request_id', 'revision_no']);
        });
    }

    private function addIndex(string $table, array|string $columns): void
    {
        try {
            Schema::table($table, fn (Blueprint $t) => $t->index($columns));
        } catch (\Throwable $e) {
            $this->ignoreDuplicate($e);
        }
    }

    private function addUnique(string $table, array $columns): void
    {
        try {
            Schema::table($table, fn (Blueprint $t) => $t->unique($columns));
        } catch (\Throwable $e) {
            $this->ignoreDuplicate($e);
        }
    }

    private function dropIndex(string $table, array $columns): void
    {
        try {
            Schema::table($table, fn (Blueprint $t) => $t->dropIndex($columns));
        } catch (\Throwable $e) {
            $this->ignoreMissing($e);
        }
    }

    private function ignoreDuplicate(\Throwable $e): void
    {
        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate key name') || str_contains($msg, 'already exists') || str_contains($msg, '1061')) {
            return;
        }
        throw $e;
    }

    private function ignoreMissing(\Throwable $e): void
    {
        $msg = $e->getMessage();
        if (str_contains($msg, "Can't DROP") || str_contains($msg, 'does not exist') || str_contains($msg, '1091')) {
            return;
        }
        throw $e;
    }
};
