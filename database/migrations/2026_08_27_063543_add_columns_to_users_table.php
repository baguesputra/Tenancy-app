<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_number')->unique()->after('id');
            $table->foreignId('branch_id')->nullable()->constrained()->after('employee_number');
            $table->string('auth_provider')->default('local')->after('branch_id');
            $table->string('sso_id')->nullable()->unique()->after('auth_provider');
            $table->boolean('must_change_password')->default(true)->after('password');
            $table->string('password')->nullable()->change();
            $table->string('email')->nullable()->change();          // tambahkan ini
            $table->string('email')->unique(false)->change();        // pastikan unique constraint email tidak maksa NOT NULL kalau null diperbolehkan duplikat
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
