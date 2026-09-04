<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('approvals', function (Blueprint $table) {
            $table->dropMorphs('approvable');
        });

        Schema::table('approvals', function (Blueprint $table) {
            $table->uuidMorphs('approvable');
        });
    }

    public function down(): void
    {
        Schema::table('approvals', function (Blueprint $table) {
            $table->dropMorphs('approvable');
        });

        Schema::table('approvals', function (Blueprint $table) {
            $table->morphs('approvable');
        });
    }
};