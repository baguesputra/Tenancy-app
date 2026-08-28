<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspection_answers', function (Blueprint $table) {
            $table->unique(['inspection_id', 'checklist_item_id']);
        });
    }

    public function down(): void
    {
        Schema::table('inspection_answers', function (Blueprint $table) {
            $table->dropUnique(['inspection_id', 'checklist_item_id']);
        });
    }
};