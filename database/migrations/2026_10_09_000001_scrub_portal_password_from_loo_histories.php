<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('loo_histories')
            ->whereNotNull('metadata')
            ->chunkById(100, function ($rows) {
                foreach ($rows as $row) {
                    $meta = json_decode($row->metadata, true);
                    if (! is_array($meta) || ! array_key_exists('portal_password', $meta)) {
                        continue;
                    }
                    unset($meta['portal_password']);
                    $meta['portal_account_created'] = true;
                    DB::table('loo_histories')->where('id', $row->id)->update(['metadata' => json_encode($meta)]);
                }
            });
    }

    public function down(): void
    {
        // Password plaintext tidak bisa dipulihkan — data lama tidak dikembalikan.
    }
};
