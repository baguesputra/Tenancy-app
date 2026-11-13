<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_sso_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('relay_state', 64)->unique();
            $table->string('state', 128);
            $table->char('code_challenge', 43);
            $table->timestamp('expires_at')->index();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_sso_transactions');
    }
};
