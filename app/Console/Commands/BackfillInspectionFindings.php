<?php

namespace App\Console\Commands;

use App\Models\Inspection;
use App\Services\InspectionFindingService;
use Illuminate\Console\Command;

class BackfillInspectionFindings extends Command
{
    protected $signature = 'sidak:backfill-findings';

    protected $description = 'Sinkronkan temuan CAPA untuk inspeksi/sesi sidak yang sudah selesai';

    public function handle(InspectionFindingService $findingService): int
    {
        $count = 0;

        Inspection::query()
            ->where(function ($q) {
                $q->where('status', 'completed')
                    ->orWhereHas('session', fn ($sq) => $sq->where('status', 'completed'));
            })
            ->chunkById(100, function ($inspections) use ($findingService, &$count) {
                foreach ($inspections as $inspection) {
                    $findingService->syncFromInspection($inspection);
                    $count++;
                }
            });

        $this->info("Selesai menyinkronkan {$count} inspeksi.");

        return self::SUCCESS;
    }
}
