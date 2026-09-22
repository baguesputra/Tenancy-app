<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_scopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_category_id')->nullable()->constrained()->cascadeOnDelete();
            $table->boolean('can_view')->default(false);
            $table->boolean('view_own_only')->default(false);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_edit')->default(false);
            $table->boolean('edit_own_only')->default(false);
            $table->timestamps();
            $table->unique(['role_id', 'tenant_category_id']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });
        Schema::dropIfExists('master_scopes');
    }
};
