<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('tenant_users');
    }

    public function down(): void
    {
        Schema::create('tenant_users', function ($table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained();
            $table->string('username')->unique();
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
};
