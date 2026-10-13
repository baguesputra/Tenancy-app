<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspection_sessions', function (Blueprint $table) {
            $table->string('creator_name_snapshot')->nullable()->after('user_id');
            $table->text('notes')->nullable()->after('status');
        });

        // Backfill: sesi lama pakai nama pembuat saat ini sebagai snapshot PIC.
        // Subquery korelasi agar jalan di MySQL maupun SQLite.
        DB::table('inspection_sessions')
            ->whereNull('creator_name_snapshot')
            ->update(['creator_name_snapshot' => DB::raw('(SELECT name FROM users WHERE users.id = inspection_sessions.user_id)')]);
    }

    public function down(): void
    {
        Schema::table('inspection_sessions', function (Blueprint $table) {
            $table->dropColumn(['creator_name_snapshot', 'notes']);
        });
    }
};
