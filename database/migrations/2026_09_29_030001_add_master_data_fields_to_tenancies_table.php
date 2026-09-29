<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenancies', function (Blueprint $table) {
            // Luas & Harga
            $table->decimal('total_area_sqm', 10, 2)->nullable()->after('percentage_rent_breakpoint');
            $table->decimal('rent_per_sqm_indoor', 15, 2)->nullable()->after('total_area_sqm');
            $table->decimal('area_sqm_indoor', 10, 2)->nullable()->after('rent_per_sqm_indoor');
            $table->decimal('rent_per_sqm_outdoor', 15, 2)->nullable()->after('area_sqm_indoor');
            $table->decimal('area_sqm_outdoor', 10, 2)->nullable()->after('rent_per_sqm_outdoor');

            // Revenue Sharing
            $table->boolean('revenue_sharing')->default(false)->after('area_sqm_outdoor');
            $table->boolean('non_revenue_sharing')->default(false)->after('revenue_sharing');

            // Down Payment & Cicilan
            $table->decimal('down_payment_percent', 5, 2)->nullable()->after('non_revenue_sharing');
            $table->unsignedInteger('down_payment_installment_count')->nullable()->after('down_payment_percent');
            $table->unsignedInteger('installment_count')->nullable()->after('down_payment_installment_count');
            $table->decimal('remaining_payment', 15, 2)->nullable()->after('installment_count');

            // Arsip
            $table->string('archive_location')->nullable()->after('remaining_payment');

            // Surat Peringatan (SP)
            $table->date('sp_date')->nullable()->after('archive_location');
            $table->string('sp_number')->nullable()->after('sp_date');
            $table->unsignedInteger('sp_count')->default(0)->after('sp_number');
            $table->string('sp_department')->nullable()->after('sp_count');
            $table->text('sp_action')->nullable()->after('sp_department');
            $table->string('sp_file_path')->nullable()->after('sp_action');
        });
    }

    public function down(): void
    {
        Schema::table('tenancies', function (Blueprint $table) {
            $table->dropColumn([
                'total_area_sqm', 'rent_per_sqm_indoor', 'area_sqm_indoor',
                'rent_per_sqm_outdoor', 'area_sqm_outdoor',
                'revenue_sharing', 'non_revenue_sharing',
                'down_payment_percent', 'down_payment_installment_count',
                'installment_count', 'remaining_payment',
                'archive_location',
                'sp_date', 'sp_number', 'sp_count', 'sp_department', 'sp_action', 'sp_file_path',
            ]);
        });
    }
};