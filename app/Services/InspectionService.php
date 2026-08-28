<?php

namespace App\Services;

use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\Inspection;
use App\Models\InspectionAnswer;
use App\Models\InspectionPhoto;
use App\Models\InspectionSession;
use App\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InspectionService
{
    /**
     * Tambah inspeksi baru untuk 1 tenant dalam sebuah sesi.
     */
    public function addInspection(InspectionSession $session, Tenant $tenant, ?string $uuid = null): Inspection
    {
        // Validasi: tenant harus di cabang yang sama dengan sesi
        if ($tenant->branch_id !== $session->branch_id) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Tenant tidak berada di cabang yang sama dengan sesi ini.',
            ]);
        }

        $template = ChecklistTemplate::whereHas('businessTypes', function ($q) use ($tenant) {
            $q->where('business_type', $tenant->business_type);
        })->where('is_active', true)->first();

        if (! $template) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Tidak ada checklist template aktif untuk jenis bisnis tenant ini.',
            ]);
        }

        $id = $uuid ?? (string) Str::uuid();

        return Inspection::updateOrCreate(
            ['id' => $id],
            [
                'inspection_session_id' => $session->id,
                'tenant_id' => $tenant->id,
                'checklist_template_id' => $template->id,
                'checklist_snapshot' => $template->toSnapshotArray(),
                'status' => 'draft',
            ]
        );
    }

    /**
     * Simpan/update satu jawaban checklist item (idempotent by inspection+item).
     */
    public function saveAnswer(
        Inspection $inspection,
        ChecklistItem $item,
        ?string $value,
        ?string $note = null,
        ?UploadedFile $photo = null,
        ?string $answerUuid = null
    ): InspectionAnswer {
        $answer = InspectionAnswer::updateOrCreate(
            [
                'inspection_id' => $inspection->id,
                'checklist_item_id' => $item->id,
            ],
            [
                'id' => $answerUuid ?? (string) Str::uuid(),
                'value' => $value,
                'note' => $note,
            ]
        );

        if ($photo) {
            $this->attachPhoto($answer, $photo);
        }

        return $answer;
    }

    public function attachPhoto(InspectionAnswer $answer, UploadedFile $photo): InspectionPhoto
    {
        $path = $photo->store('inspection-photos', 'public');

        return InspectionPhoto::create([
            'inspection_answer_id' => $answer->id,
            'path' => $path,
            'uploaded_at' => now(),
        ]);
    }

    /**
     * Tandai inspeksi selesai, hitung ulang status is_flagged
     * berdasarkan jawaban negatif yang belum ada fotonya.
     */
    public function markCompleted(Inspection $inspection): Inspection
    {
        $inspection->load('answers.checklistItem', 'answers.photos');

        $isFlagged = $inspection->answers->contains(function (InspectionAnswer $answer) {
            $item = $answer->checklistItem;

            return $item->type === 'binary_choice'
                && $item->photo_required_on_negative
                && $answer->value === $item->option_negative
                && $answer->photos->isEmpty();
        });

        $inspection->update([
            'status' => 'completed',
            'is_flagged' => $isFlagged,
        ]);

        return $inspection;
    }
}