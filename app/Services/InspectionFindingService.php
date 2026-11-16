<?php

namespace App\Services;

use App\Models\Inspection;
use App\Models\InspectionAnswer;
use App\Models\InspectionFinding;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class InspectionFindingService
{
    public static function defaultDueDays(string $severity): int
    {
        return $severity === 'critical' ? 3 : 7;
    }

    /**
     * Sinkronkan temuan CAPA dari jawaban negatif pada inspeksi yang selesai.
     * Idempoten: pemanggilan ulang mempertahankan severity, tenggat, dan progres CAPA.
     */
    public function syncFromInspection(Inspection $inspection): void
    {
        $inspection->loadMissing(['tenant:id,branch_id', 'session:id,branch_id', 'answers.checklistItem']);

        $branchId = $inspection->tenant?->branch_id ?? $inspection->session?->branch_id;
        if (! $branchId || ! $inspection->tenant_id) {
            return;
        }

        $itemMeta = [];
        foreach ($inspection->checklist_snapshot['sections'] ?? [] as $section) {
            $sectionName = $section['name'] ?? $section['title'] ?? null;
            foreach ($section['items'] ?? [] as $item) {
                $itemMeta[(string) ($item['id'] ?? '')] = [
                    'section_name' => $sectionName,
                    'label' => $item['label'] ?? $item['question'] ?? 'Item Checklist',
                    'type' => $item['type'] ?? null,
                    'option_negative' => $item['option_negative'] ?? null,
                ];
            }
        }

        $negativeAnswers = $inspection->answers->filter(function (InspectionAnswer $answer) use ($itemMeta) {
            $meta = $itemMeta[(string) $answer->checklist_item_id] ?? null;
            $type = $meta['type'] ?? $answer->checklistItem?->type;
            $negativeOption = $meta['option_negative'] ?? $answer->checklistItem?->option_negative;

            return $type === 'binary_choice'
                && $negativeOption !== null
                && $negativeOption !== ''
                && $answer->value === $negativeOption;
        });

        DB::transaction(function () use ($inspection, $branchId, $itemMeta, $negativeAnswers) {
            $negativeItemIds = [];

            foreach ($negativeAnswers as $answer) {
                $negativeItemIds[] = $answer->checklist_item_id;
                $meta = $itemMeta[(string) $answer->checklist_item_id] ?? [];

                $finding = InspectionFinding::firstOrNew([
                    'inspection_id' => $inspection->id,
                    'checklist_item_id' => $answer->checklist_item_id,
                ]);

                if (! $finding->exists) {
                    $finding->severity = 'minor';
                    $finding->status = 'open';
                    $finding->due_date = ($inspection->completed_at ?? now())
                        ->copy()
                        ->addDays(self::defaultDueDays('minor'))
                        ->toDateString();
                }

                $finding->fill([
                    'inspection_answer_id' => $answer->id,
                    'tenant_id' => $inspection->tenant_id,
                    'branch_id' => $branchId,
                    'section_name' => $meta['section_name'] ?? null,
                    'item_label' => $meta['label'] ?? $answer->checklistItem?->label ?? 'Item Checklist',
                    'finding_note' => $answer->note,
                ]);
                $finding->save();
            }

            // Jika jawaban negatif diubah kembali ke positif sebelum sesi ditutup,
            // bersihkan temuan yang masih `open` (belum ada tindak lanjut).
            InspectionFinding::where('inspection_id', $inspection->id)
                ->where('status', 'open')
                ->when($negativeItemIds !== [], fn ($q) => $q->whereNotIn('checklist_item_id', $negativeItemIds))
                ->delete();
        });
    }

    public function updateDetails(InspectionFinding $finding, array $data): InspectionFinding
    {
        $finding->fill([
            'severity' => $data['severity'] ?? $finding->severity,
            'due_date' => array_key_exists('due_date', $data) ? $data['due_date'] : $finding->due_date,
            'action_required' => array_key_exists('action_required', $data) ? $data['action_required'] : $finding->action_required,
        ]);
        $finding->save();

        return $finding->fresh();
    }

    public function submitResolution(
        InspectionFinding $finding,
        string $note,
        string $resolvedByName,
        UploadedFile $photo,
        bool $allowOverwriteSubmitted = false,
    ): InspectionFinding {
        $allowed = $allowOverwriteSubmitted ? ['open', 'rejected', 'submitted'] : ['open', 'rejected'];

        if (! in_array($finding->status, $allowed, true)) {
            throw ValidationException::withMessages([
                'finding' => 'Temuan ini sudah diverifikasi atau menunggu verifikasi.',
            ]);
        }

        if ($finding->resolution_photo_path) {
            Storage::disk('public')->delete($finding->resolution_photo_path);
        }

        $path = $photo->store('capa-photos', 'public');

        $finding->update([
            'status' => 'submitted',
            'resolution_note' => $note,
            'resolution_photo_path' => $path,
            'resolved_by_name' => $resolvedByName,
            'resolved_at' => now(),
        ]);

        return $finding->fresh();
    }

    public function verify(InspectionFinding $finding, User $verifier, ?string $note = null): InspectionFinding
    {
        if (! in_array($finding->status, ['open', 'submitted', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'finding' => 'Temuan ini sudah terverifikasi.',
            ]);
        }

        $finding->update([
            'status' => 'verified',
            'verified_by' => $verifier->id,
            'verified_at' => now(),
            'verification_note' => $note,
        ]);

        return $finding->fresh();
    }

    public function reject(InspectionFinding $finding, User $verifier, string $note): InspectionFinding
    {
        if ($finding->status === 'verified') {
            throw ValidationException::withMessages([
                'finding' => 'Temuan yang sudah terverifikasi tidak dapat ditolak.',
            ]);
        }

        $finding->update([
            'status' => 'rejected',
            'verified_by' => $verifier->id,
            'verified_at' => now(),
            'verification_note' => $note,
        ]);

        return $finding->fresh();
    }

    /**
     * Hitung total kemunculan item checklist yang sama sebagai temuan pada tenant ini.
     *
     * @param  array<int, int|string|null>  $checklistItemIds
     * @return array<int, int>
     */
    public function repeatCountsForTenant(int $tenantId, array $checklistItemIds): array
    {
        $ids = array_values(array_unique(array_filter($checklistItemIds)));
        if ($ids === []) {
            return [];
        }

        return InspectionFinding::where('tenant_id', $tenantId)
            ->whereIn('checklist_item_id', $ids)
            ->groupBy('checklist_item_id')
            ->selectRaw('checklist_item_id, count(*) as aggregate')
            ->pluck('aggregate', 'checklist_item_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    public function serialize(InspectionFinding $finding, int $repeatCount = 1, bool $public = false): array
    {
        $base = [
            'id' => $finding->id,
            'inspection_id' => $finding->inspection_id,
            'checklist_item_id' => $finding->checklist_item_id,
            'section_name' => $finding->section_name,
            'item_label' => $finding->item_label,
            'severity' => $finding->severity,
            'status' => $finding->status,
            'is_overdue' => $finding->is_overdue,
            'due_date' => $finding->due_date?->toDateString(),
            'action_required' => $finding->action_required,
            'resolution_note' => $finding->resolution_note,
            'resolution_photo_url' => $finding->resolution_photo_url,
            'resolved_by_name' => $finding->resolved_by_name,
            'resolved_at' => $finding->resolved_at?->toISOString(),
            'verification_note' => $finding->verification_note,
            'verified_at' => $finding->verified_at?->toISOString(),
            'repeat_count' => $repeatCount,
        ];

        if (! $public) {
            $base['finding_note'] = $finding->finding_note;
            $base['verified_by_name'] = $finding->verifier?->name;
        }

        return $base;
    }
}
