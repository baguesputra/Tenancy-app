<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Field legal LOO berubah dari input nomor menjadi upload dokumen.
     * Kolom Tenant yang belum ada ditambahkan, dan data lama yang masih
     * berupa teks di key yang kini bertipe file dibersihkan.
     */
    private const NEW_COLUMNS = [
        'nib_file_path',
        'akta_perubahan_file_path',
        'ktp_badan_hukum_file_path',
    ];

    /** Field yang dihapus dari form legal. */
    private const DROPPED_KEYS = [
        'siup',
        'tdp',
        'notaris_pendirian',
        'notaris_terakhir',
        'authorized_signatory_name',
        'authorized_signatory_jabatan',
        'authorized_signatory_ktp',
    ];

    /** Field yang berubah dari teks menjadi upload file. */
    private const FILE_KEYS = [
        'npwp',
        'nib',
        'sk_pendirian',
        'akta_perubahan_terakhir',
    ];

    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'nib_file_path')) {
                $table->string('nib_file_path')->nullable()->after('nib');
            }
            if (! Schema::hasColumn('tenants', 'akta_perubahan_file_path')) {
                $table->string('akta_perubahan_file_path')->nullable()->after('akta_file_path');
            }
            if (! Schema::hasColumn('tenants', 'ktp_badan_hukum_file_path')) {
                $table->string('ktp_badan_hukum_file_path')->nullable()->after('ktp_file_path');
            }
        });

        DB::table('loo_sections')
            ->where('section_key', 'legalitas')
            ->orderBy('id')
            ->each(function ($row) {
                $data = json_decode((string) $row->data, true);

                if (! is_array($data)) {
                    return;
                }

                foreach (self::DROPPED_KEYS as $key) {
                    unset($data[$key]);
                }

                // Nilai teks lama bukan path file — kosongkan supaya tidak
                // dirender sebagai link "Lihat file saat ini".
                foreach (self::FILE_KEYS as $key) {
                    $value = $data[$key] ?? null;
                    if (! is_string($value) || ! str_starts_with($value, 'loos/')) {
                        $data[$key] = null;
                    }
                }

                DB::table('loo_sections')->where('id', $row->id)->update([
                    'data' => json_encode($data),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $cols = array_values(array_filter(
                self::NEW_COLUMNS,
                fn ($c) => Schema::hasColumn('tenants', $c)
            ));

            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
