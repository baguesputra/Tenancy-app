<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('checklist_template_business_types');

        Schema::create('checklist_template_product_categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('checklist_template_id');
            $table->foreign('checklist_template_id', 'ctpc_template_fk')
                ->references('id')->on('checklist_templates')
                ->cascadeOnDelete();

            $table->foreignId('product_category_id');
            $table->foreign('product_category_id', 'ctpc_product_category_fk')
                ->references('id')->on('product_categories');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_template_product_categories');

        Schema::create('checklist_template_business_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_template_id')->constrained()->cascadeOnDelete();
            $table->string('business_type');
            $table->timestamps();
        });
    }
};