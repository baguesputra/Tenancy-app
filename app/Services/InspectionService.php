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
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

class InspectionService
{
    public function addInspection(InspectionSession $session, Tenant $tenant, ?string $uuid = null): Inspection
    {
        $this->ensureSessionIsEditable($session);

        if ($tenant->branch_id !== $session->branch_id) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Tenant tidak berada di cabang yang sama dengan sesi ini.',
            ]);
        }

        if (! $uuid) {
            $existing = Inspection::where('inspection_session_id', $session->id)
                ->where('tenant_id', $tenant->id)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        $template = ChecklistTemplate::whereHas('productCategories', fn ($q) =>
            $q->where('product_categories.id', $tenant->product_category_id)
        )->where('is_active', true)->first();

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

    public function saveAnswer(
        Inspection $inspection,
        ChecklistItem $item,
        ?string $value,
        ?string $note = null,
        ?UploadedFile $photo = null,
        ?string $answerUuid = null
    ): InspectionAnswer {
        $this->ensureSessionIsEditable($inspection->session);

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

        // Kalau jawaban sekarang positif (atau bukan lagi option_negative),
        // foto lama yang menempel jadi tidak relevan — hapus otomatis
        if ($item->type === 'binary_choice' && $value !== $item->option_negative) {
            $this->clearPhotos($answer);
        }

        if ($photo) {
            $this->attachPhoto($answer, $photo);
        }

        return $answer;
    }

    public function clearPhotos(InspectionAnswer $answer): void
    {
        foreach ($answer->photos as $photo) {
            Storage::disk('public')->delete($photo->path);
            $photo->delete();
        }
    }

    public function attachPhoto(InspectionAnswer $answer, UploadedFile $photo): InspectionPhoto
    {
        $this->ensureSessionIsEditable($answer->inspection->session);

        $path = $photo->store('inspection-photos', 'public');

        return InspectionPhoto::create([
            'inspection_answer_id' => $answer->id,
            'path' => $path,
            'uploaded_at' => now(),
        ]);
    }

    public function markCompleted(Inspection $inspection): Inspection
    {
        $this->ensureSessionIsEditable($inspection->session);

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

    /**
     * Guard utama: begitu sesi ditandai selesai, semua inspeksi di dalamnya
     * (apa pun statusnya) tidak boleh diubah lagi.
     */
    private function ensureSessionIsEditable(InspectionSession $session): void
    {
        if ($session->status !== 'in_progress') {
            throw ValidationException::withMessages([
                'session' => 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.',
            ]);
        }
    }

    public function getOrCreateActiveSession(User $user): InspectionSession
    {
        $active = InspectionSession::where('user_id', $user->id)
            ->where('status', 'in_progress')
            ->first();

        if ($active) {
            return $active;
        }

        return $this->startOrSync($user, null);
    }
}