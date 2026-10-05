<?php

use App\Models\Loo;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            $table->string('track_token', 64)->nullable()->unique()->after('cancel_reason');
            $table->timestamp('track_expires_at')->nullable()->after('track_token');
        });

        // Backfill token untuk LOO yang sudah ada.
        Loo::whereNull('track_token')->cursor()->each(function (Loo $loo) {
            do {
                $token = Str::random(40);
            } while (Loo::where('track_token', $token)->exists());

            $loo->forceFill(['track_token' => $token])->saveQuietly();
        });
    }

    public function down(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            $table->dropColumn(['track_token', 'track_expires_at']);
        });
    }
};
