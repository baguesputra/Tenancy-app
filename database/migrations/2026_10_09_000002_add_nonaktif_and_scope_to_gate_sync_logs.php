<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gate_sync_logs', function (Blueprint $table) {
            $table->unsignedInteger('count_nonaktif')->default(0)->after('count_dilewati');
            $table->string('scope', 255)->nullable()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('gate_sync_logs', function (Blueprint $table) {
            $table->dropColumn(['count_nonaktif', 'scope']);
        });
    }
};
