<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['is_anchor', 'business_type', 'floor', 'block', 'unit_number']);

            $table->string('legal_entity_name')->nullable()->after('name');
            $table->string('npwp_number')->nullable();
            $table->string('siup_number')->nullable();
            $table->string('company_phone')->nullable();
            $table->string('company_email')->nullable();
            $table->text('company_address')->nullable();

            $table->foreignId('tenant_category_id')->constrained();
            $table->foreignId('product_category_id')->constrained();
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['tenant_category_id']);
            $table->dropForeign(['product_category_id']);
            $table->dropColumn([
                'legal_entity_name', 'npwp_number', 'siup_number',
                'company_phone', 'company_email', 'company_address',
                'tenant_category_id', 'product_category_id',
            ]);

            $table->boolean('is_anchor')->default(false);
            $table->string('business_type');
            $table->string('floor')->nullable();
            $table->string('block')->nullable();
            $table->string('unit_number')->nullable();
        });
    }
};
