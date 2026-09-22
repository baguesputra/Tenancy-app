<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('master_scopes', 'mode')) {
            Schema::table('master_scopes', function (Blueprint $table) {
                $table->string('mode')->default('include')->after('tenant_category_id');
            });
        }

        foreach (['role_id', 'tenant_category_id'] as $col) {
            try {
                Schema::table('master_scopes', function (Blueprint $table) use ($col) {
                    $table->dropForeign([$col]);
                });
            } catch (Throwable $e) {
            }
        }
        foreach ([['role_id', 'tenant_category_id'], ['role_id', 'tenant_category_id', 'mode']] as $cols) {
            try {
                Schema::table('master_scopes', function (Blueprint $table) use ($cols) {
                    $table->dropUnique($cols);
                });
            } catch (Throwable $e) {
            }
        }

        Schema::table('master_scopes', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('tenant_category_id')->references('id')->on('tenant_categories')->cascadeOnDelete();
            $table->unique(['role_id', 'tenant_category_id', 'mode']);
        });
    }

    public function down(): void
    {
        Schema::table('master_scopes', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['tenant_category_id']);
            $table->dropUnique(['role_id', 'tenant_category_id', 'mode']);
            $table->dropColumn('mode');
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('tenant_category_id')->references('id')->on('tenant_categories')->cascadeOnDelete();
            $table->unique(['role_id', 'tenant_category_id']);
        });
    }
};
