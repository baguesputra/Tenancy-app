<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Dua file pendukung lama (Surat LOO & Penawaran LOO) dipindah ke tabel
     * `loo_attachments` agar bisa tampil bersama dokumen pendukung lain yang
     * diunggah user, lengkap dengan keterangannya.
     */
    public function up(): void
    {
        $legacy = [
            'loo_letter_file_path' => 'Surat LOO',
            'loo_proposal_file_path' => 'Penawaran LOO',
        ];

        foreach ($legacy as $column => $description) {
            DB::table('loos')
                ->whereNotNull($column)
                ->where($column, '!=', '')
                ->orderBy('id')
                ->each(function ($loo) use ($column, $description) {
                    $path = $loo->{$column};

                    DB::table('loo_attachments')->insert([
                        'loo_id' => $loo->id,
                        'path' => $path,
                        'original_name' => basename($path),
                        'mime' => null,
                        'size' => null,
                        'description' => $description,
                        'uploaded_by' => $loo->marketing_id,
                        'created_at' => $loo->created_at,
                        'updated_at' => $loo->created_at,
                    ]);
                });
        }
    }

    public function down(): void
    {
        DB::table('loo_attachments')
            ->whereIn('description', ['Surat LOO', 'Penawaran LOO'])
            ->delete();
    }
};