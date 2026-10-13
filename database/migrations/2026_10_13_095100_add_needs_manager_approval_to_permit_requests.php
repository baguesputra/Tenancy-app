<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->boolean('needs_manager_approval')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropColumn('needs_manager_approval');
        });
    }
};
