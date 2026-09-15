<?php

namespace App\Console\Commands;

use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\Unit;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillScannableCodes extends Command
{
    protected $signature = 'scannables:backfill';
    protected $description = 'Buat ScannableCode yang hilang untuk Unit & PermitRequest';

    public function handle(): int
    {
        $created = 0;

        foreach ([Unit::class, PermitRequest::class] as $type) {
            $type::with('scannableCode')->chunkById(200, function ($models) use ($type, &$created) {
                foreach ($models as $model) {
                    if ($model->scannableCode) continue;

                    ScannableCode::create([
                        'token' => (string) Str::uuid(),
                        'scannable_type' => $type,
                        'scannable_id' => $model->getKey(),
                    ]);
                    $created++;
                }
            });
        }

        $this->info("Selesai. {$created} code dibuat.");

        return self::SUCCESS;
    }
}
