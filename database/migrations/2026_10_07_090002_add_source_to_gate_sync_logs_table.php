<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gate_sync_logs', function (Blueprint $table) {
            $table->string('source', 10)->default('manual')->after('kind');
        });
    }

    public function down(): void
    {
        Schema::table('gate_sync_logs', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
