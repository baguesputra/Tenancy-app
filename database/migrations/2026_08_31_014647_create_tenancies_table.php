<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
    {
        Schema::create('tenancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained();
            $table->foreignId('tenant_id')->constrained();

            $table->string('contract_number')->nullable();
            $table->string('contract_document_path')->nullable();

            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('signed_date')->nullable();
            $table->string('status')->default('draft'); // draft, active, ended, terminated

            $table->decimal('rent_value', 15, 2)->nullable();
            $table->string('rent_period')->nullable(); // bulanan, tahunan
            $table->decimal('service_charge', 15, 2)->nullable();
            $table->decimal('deposit_value', 15, 2)->nullable();
            $table->string('payment_term')->nullable();

            $table->decimal('percentage_rent_rate', 5, 2)->nullable();
            $table->decimal('percentage_rent_breakpoint', 15, 2)->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenancies');
    }
};
