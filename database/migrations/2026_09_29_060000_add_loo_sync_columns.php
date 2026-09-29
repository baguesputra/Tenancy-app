<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loos', function (Blueprint $table) {
            if (! Schema::hasColumn('loos', 'unit_id')) {
                $table->foreignId('unit_id')->nullable()->after('tenant_category_id')
                    ->constrained('units')->nullOnDelete();
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            // Link ke LOO asal — null = tenant legacy (tanpa LOO, full edit)
            if (! Schema::hasColumn('tenants', 'loo_id')) {
                $table->foreignId('loo_id')->nullable()->after('created_by')
                    ->constrained('loos')->nullOnDelete();
            }

            // Kolom yang dipetakan dari LOO sections tapi belum ada di tenants
            foreach (['trade_name', 'entity_type', 'nib'] as $col) {
                if (! Schema::hasColumn('tenants', $col)) {
                    $table->string($col)->nullable()->after('created_by');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $cols = array_values(array_filter(
                ['loo_id', 'trade_name', 'entity_type', 'nib'],
                fn ($c) => Schema::hasColumn('tenants', $c)
            ));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('loos', function (Blueprint $table) {
            if (Schema::hasColumn('loos', 'unit_id')) {
                $table->dropConstrainedForeignId('unit_id');
            }
        });
    }
};
