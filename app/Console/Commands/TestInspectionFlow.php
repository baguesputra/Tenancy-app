<?php

namespace App\Console\Commands;

use App\Models\ChecklistItem;
use App\Models\Tenant;
use App\Models\User;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Console\Command;

class TestInspectionFlow extends Command
{
    protected $signature = 'app:test-inspection-flow';
    protected $description = 'Testing end-to-end flow: mulai sesi, isi jawaban, cek flagging & idempotency';

    public function handle(InspectionSessionService $sessionService, InspectionService $inspectionService)
    {
        $user = User::where('employee_number', 'TOP-000001')->first();
        $tenant = Tenant::where('business_type', 'f&b')->first();

        if (! $user || ! $tenant) {
            $this->error('User atau Tenant testing tidak ditemukan. Jalankan seeder dulu.');
            return 1;
        }

        // 1. Mulai sesi
        $session = $sessionService->startOrSync($user, null);
        $this->info("✓ Session dibuat: {$session->id}");
        $this->line("  Branch: {$session->branch_id} (user branch: {$user->branch_id}) — " .
            ($session->branch_id === $user->branch_id ? 'COCOK' : 'TIDAK COCOK ✗'));

        // 2. Tambah inspeksi
        $inspection = $inspectionService->addInspection($session, $tenant);
        $this->info("✓ Inspection dibuat: {$inspection->id}");
        $this->line("  Template: {$inspection->template->name}");
        $this->line("  Jumlah section di snapshot: " . count($inspection->checklist_snapshot['sections']));

        // 3. Isi jawaban
        $items = ChecklistItem::whereHas('section', function ($q) use ($inspection) {
            $q->where('checklist_template_id', $inspection->checklist_template_id);
        })->take(3)->get();

        $inspectionService->saveAnswer($inspection, $items[0], $items[0]->option_positive);
        $inspectionService->saveAnswer($inspection, $items[1], $items[1]->option_negative); // sengaja tanpa foto
        $inspectionService->saveAnswer($inspection, $items[2], $items[2]->option_positive);

        $this->info("✓ Jawaban tersimpan: " . $inspection->answers()->count() . " (harus 3)");

        // 4. Tandai selesai, cek flagging
        $inspection = $inspectionService->markCompleted($inspection);
        $flagStatus = $inspection->is_flagged ? 'TRUE ✓ (sesuai harapan)' : 'FALSE ✗ (ADA YANG SALAH)';
        $this->line("  Status: {$inspection->status}");
        $this->line("  Is Flagged: {$flagStatus}");

        // 5. Test idempotency — addInspection
        $inspectionAgain = $inspectionService->addInspection($session, $tenant, $inspection->id);
        $countCheck = $session->inspections()->count() === 1 ? 'OK ✓' : 'GAGAL ✗ (ada duplikat)';
        $this->line("  Idempotency addInspection: {$countCheck} (count: {$session->inspections()->count()})");

        // 6. Test idempotency — saveAnswer
        $inspectionService->saveAnswer($inspection, $items[0], $items[0]->option_positive, note: 'Catatan tambahan');
        $answerCountCheck = $inspection->answers()->count() === 3 ? 'OK ✓' : 'GAGAL ✗ (ada duplikat)';
        $this->line("  Idempotency saveAnswer: {$answerCountCheck} (count: {$inspection->answers()->count()})");

        $this->newLine();
        $this->info('Testing selesai.');

        return 0;
    }
}