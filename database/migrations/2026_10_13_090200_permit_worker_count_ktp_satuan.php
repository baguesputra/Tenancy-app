<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permit_requests', function (Blueprint $table) {
            $table->unsignedInteger('worker_count')->nullable();
        });

        Schema::table('permit_goods', function (Blueprint $table) {
            $table->string('unit', 30)->nullable();
        });

        Schema::create('permit_ktp_photos', function (Blueprint $table) {
            $table->id();
            $table->uuid('permit_request_id');
            $table->foreign('permit_request_id', 'pkp_permit_fk')
                ->references('id')->on('permit_requests')->cascadeOnDelete();

            $table->string('photo_path');
            $table->text('mismatch_note')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permit_ktp_photos');

        Schema::table('permit_goods', function (Blueprint $table) {
            $table->dropColumn('unit');
        });

        Schema::table('permit_requests', function (Blueprint $table) {
            $table->dropColumn('worker_count');
        });
    }
};
