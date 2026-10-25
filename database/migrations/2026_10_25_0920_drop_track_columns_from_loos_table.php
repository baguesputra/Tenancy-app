<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fitur tracking publik LOO dihapus — kolom token & masa berlaku sudah
     * tidak dipakai (tombol Bagikan + halaman /lacak-loo ikut dihapus).
     */
    public function up(): void
    {
        // Index unique harus dilepas dulu — SQLite menolak drop kolom selama
        // index-nya masih ada.
        Schema::table('loos', function (Blueprint $table) {
            $table->dropUnique(['track_token']);
        });

        Schema::table('loos', function (Blueprint $table) {
            $table->dropColumn(['track_token', 'track_expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            $table->string('track_token', 64)->nullable()->unique()->after('cancel_reason');
            $table->timestamp('track_expires_at')->nullable()->after('track_token');
        });
    }
};