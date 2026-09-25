<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['departments', 'divisions', 'positions'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('company_gate_id', 50)->nullable()->after('gate_id');
            });
        }
    }

    public function down(): void
    {
        foreach (['departments', 'divisions', 'positions'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('company_gate_id');
            });
        }
    }
};
