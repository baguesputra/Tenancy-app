<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_session_participants', function (Blueprint $table) {
            $table->id();
            $table->uuid('inspection_session_id');
            $table->foreign('inspection_session_id', 'issp_session_fk')
                ->references('id')->on('inspection_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name_snapshot');
            $table->string('department_name_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['inspection_session_id', 'user_id'], 'issp_session_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_session_participants');
    }
};
