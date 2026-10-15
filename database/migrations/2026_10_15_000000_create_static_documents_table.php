<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('static_documents', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50);
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['key', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('static_documents');
    }
};
