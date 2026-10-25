<?php

use App\Models\Loo;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Status LOO sekarang diturunkan dari kelengkapan section (pipeline),
     * bukan diubah manual. Hitung ulang seluruh LOO non-terminal dari data
     * `loo_sections` supaya nilai lama (legal_review/measurement/ba_handover/
     * fitout/pre_handover/...) tidak tersisa.
     */
    public function up(): void
    {
        $pipeline = config('loo.pipeline');

        $loos = Loo::all();

        foreach ($loos as $loo) {
            DB::transaction(function () use ($loo, $pipeline) {
                $current = $loo->status;

                if (in_array($current, ['completed', 'cancelled'], true)) {
                    return;
                }

                $sections = $loo->sections()->get()->keyBy('section_key');
                $approved = ! empty($sections->get('fitout_checklist_post')?->data['checklist']['footer']['gm_approved']);

                $active = null;
                foreach ($pipeline as $phase => $config) {
                    $done = true;
                    foreach ($config['sections'] as $key) {
                        if (! ($sections->get($key)?->is_submitted ?? false)) {
                            $done = false;
                            break;
                        }
                    }

                    if ($done && ($config['requires_approval'] ?? false)) {
                        $done = $approved;
                    }

                    if (! $done) {
                        $active = $phase;
                        break;
                    }
                }

                $status = $active ?? 'completed';

                if ($status === 'pengisian_divisi'
                    && array_intersect($pipeline['pengisian_divisi']['sections'], $sections->keys()->all()) === []) {
                    $status = 'draft';
                }

                $attributes = ['status' => $status];

                // Terminal tidak memindahkan stage (samakan dengan runtime
                // `Loo::updateStatus`, yang membiarkan stage saat dibatalkan/selesai).
                if (! in_array($status, ['completed', 'cancelled'], true)) {
                    $attributes['current_stage'] = Loo::getStageFromStatus($status);
                }

                if ($status === 'completed' && $loo->completed_at === null) {
                    $attributes['completed_at'] = now();
                }

                DB::table('loos')->where('id', $loo->id)->update($attributes);
            });
        }
    }

    public function down(): void
    {
        // Pemetaan balik ke status lama tidak bisa dipulihkan secara akurat.
    }
};