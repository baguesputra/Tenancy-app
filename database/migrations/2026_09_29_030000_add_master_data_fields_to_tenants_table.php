<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Deskripsi & Lokasi Fisik
            $table->text('description')->nullable()->after('name');
            $table->string('floor_map', 50)->nullable()->after('product_category_id');
            $table->string('location_map', 100)->nullable()->after('floor_map');

            // Status Kepemilikan
            $table->string('ownership_status', 30)->nullable()->after('location_map');
            $table->string('owner_name')->nullable()->after('ownership_status');
            $table->text('owner_address')->nullable()->after('owner_name');
            $table->string('owner_phone', 30)->nullable()->after('owner_address');
            $table->string('owner_fax', 30)->nullable()->after('owner_phone');
            $table->string('owner_email')->nullable()->after('owner_fax');

            // PIC FitOut
            $table->string('fitout_pic_name')->nullable()->after('owner_email');
            $table->string('fitout_pic_phone', 30)->nullable()->after('fitout_pic_name');
            $table->string('fitout_pic_email')->nullable()->after('fitout_pic_phone');

            // PIC Legal
            $table->string('legal_pic_name')->nullable()->after('fitout_pic_email');
            $table->string('legal_pic_phone', 30)->nullable()->after('legal_pic_name');
            $table->string('legal_pic_email')->nullable()->after('legal_pic_phone');

            // PIC Accounting
            $table->string('accounting_pic_name')->nullable()->after('legal_pic_email');
            $table->string('accounting_pic_phone', 30)->nullable()->after('accounting_pic_name');
            $table->string('accounting_pic_email')->nullable()->after('accounting_pic_phone');

            // SIUP (lanjutan)
            $table->date('siup_expired_date')->nullable()->after('siup_number');
            $table->string('siup_file_path')->nullable()->after('siup_expired_date');

            // TDP
            $table->string('tdp_number')->nullable()->after('siup_file_path');
            $table->date('tdp_expired_date')->nullable()->after('tdp_number');
            $table->string('tdp_file_path')->nullable()->after('tdp_expired_date');

            // NPWP & KTP
            $table->string('npwp_file_path')->nullable()->after('npwp_number');
            $table->string('ktp_number', 50)->nullable()->after('npwp_file_path');
            $table->string('ktp_file_path')->nullable()->after('ktp_number');

            // Akte Pendirian
            $table->string('akta_number')->nullable()->after('ktp_file_path');
            $table->date('akta_date')->nullable()->after('akta_number');
            $table->string('akta_kemenkeh_number', 100)->nullable()->after('akta_date');
            $table->string('notaris_name')->nullable()->after('akta_kemenkeh_number');
            $table->string('akta_file_path')->nullable()->after('notaris_name');
            $table->string('power_of_attorney_file_path')->nullable()->after('akta_file_path');

            // Domisili
            $table->string('domisili_number')->nullable()->after('power_of_attorney_file_path');
            $table->date('domisili_expired_date')->nullable()->after('domisili_number');
            $table->string('domisili_file_path')->nullable()->after('domisili_expired_date');

            // Dokumen Tambahan
            $table->string('fitout_drawing_file_path')->nullable()->after('domisili_file_path');
            $table->string('bapur_file_path')->nullable()->after('fitout_drawing_file_path');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'floor_map', 'location_map',
                'ownership_status', 'owner_name', 'owner_address', 'owner_phone', 'owner_fax', 'owner_email',
                'fitout_pic_name', 'fitout_pic_phone', 'fitout_pic_email',
                'legal_pic_name', 'legal_pic_phone', 'legal_pic_email',
                'accounting_pic_name', 'accounting_pic_phone', 'accounting_pic_email',
                'siup_expired_date', 'siup_file_path',
                'tdp_number', 'tdp_expired_date', 'tdp_file_path',
                'npwp_file_path', 'ktp_number', 'ktp_file_path',
                'akta_number', 'akta_date', 'akta_kemenkeh_number', 'notaris_name',
                'akta_file_path', 'power_of_attorney_file_path',
                'domisili_number', 'domisili_expired_date', 'domisili_file_path',
                'fitout_drawing_file_path', 'bapur_file_path',
            ]);
        });
    }
};
