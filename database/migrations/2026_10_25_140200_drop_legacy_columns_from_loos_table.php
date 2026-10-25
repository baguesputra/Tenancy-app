<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `loo_distributor` digantikan user penginput (`marketing_id`), dan dua
     * kolom file pendukung sudah dipindah ke `loo_attachments`.
     */
    public function up(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            $table->dropColumn(['loo_distributor', 'loo_letter_file_path', 'loo_proposal_file_path']);
        });
    }

    public function down(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            $table->string('loo_distributor')->nullable()->after('loo_received_date');
            $table->string('loo_letter_file_path')->nullable()->after('loo_distributor');
            $table->string('loo_proposal_file_path')->nullable()->after('loo_letter_file_path');
        });
    }
};