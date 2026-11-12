<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistItem;
use App\Models\Inspection;
use App\Models\InspectionExtraPhoto;
use App\Models\InspectionPhoto;
use App\Services\InspectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class InspectionApiController extends Controller
{
    public function __construct(private InspectionService $inspectionService) {}

    public function show(Inspection $inspection, Request $request): JsonResponse
    {
        $this->authorizeAccess($inspection, $request);

        $inspection->load(['tenant:id,name', 'answers.photos', 'extraPhotos', 'session:id,status']);
        $answers = $inspection->answers->keyBy('checklist_item_id');

        $snapshot = $inspection->checklist_snapshot;
        foreach ($snapshot['sections'] as &$section) {
            foreach ($section['items'] as &$item) {
                $answer = $answers->get($item['id']);
                $item['answer'] = $answer ? [
                    'id' => $answer->id,
                    'value' => $answer->value,
                    'note' => $answer->note,
                    'photos' => $answer->photos->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()])->values(),
                ] : null;
            }
        }

        return response()->json([
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'is_flagged' => (bool) $inspection->is_flagged,
                'completed_at' => $inspection->completed_at,
                'notes' => $inspection->notes,
                'other_notes' => $inspection->other_notes,
                'session_id' => $inspection->inspection_session_id,
                'session_status' => $inspection->session->status,
                'tenant' => ['id' => $inspection->tenant_id, 'name' => $inspection->tenant?->name],
            ],
            'checklist' => $snapshot,
            'extra_photos' => $inspection->extraPhotos->map(fn ($p) => [
                'id' => $p->id,
                'url' => $p->url(),
                'description' => $p->description,
            ])->values(),
        ]);
    }

    public function saveAnswer(Inspection $inspection, Request $request): JsonResponse
    {
        $this->authorizeAccess($inspection, $request);

        $validated = $request->validate([
            'checklist_item_id' => 'required|exists:checklist_items,id',
            'value' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|max:5120',
        ]);

        $item = ChecklistItem::findOrFail($validated['checklist_item_id']);
        $snapshotIds = collect($inspection->checklist_snapshot['sections'] ?? [])
            ->flatMap(fn ($s) => $s['items'] ?? [])->pluck('id')->map(fn ($v) => (string) $v)->all();
        abort_unless(in_array((string) $item->id, $snapshotIds, true), 422, 'Item bukan bagian dari checklist inspeksi ini.');

        $current = $inspection->answers()->where('checklist_item_id', $item->id)->first();
        $answer = $this->inspectionService->saveAnswer(
            $inspection,
            $item,
            array_key_exists('value', $validated) ? $validated['value'] : $current?->value,
            array_key_exists('note', $validated) ? $validated['note'] : $current?->note,
            $request->file('photo'),
        );
        $answer->load('photos');

        return response()->json([
            'answer' => [
                'id' => $answer->id,
                'checklist_item_id' => $item->id,
                'value' => $answer->value,
                'note' => $answer->note,
                'photos' => $answer->photos->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()])->values(),
            ],
        ]);
    }

    public function destroyAnswerPhoto(InspectionPhoto $photo, Request $request): JsonResponse
    {
        $inspection = $photo->answer->inspection;
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return response()->json(['deleted' => true]);
    }

    public function storeExtraPhoto(Inspection $inspection, Request $request): JsonResponse
    {
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        $validated = $request->validate([
            'photo' => 'required|image|max:5120',
            'description' => 'nullable|string|max:255',
        ]);

        $photo = $inspection->extraPhotos()->create([
            'path' => $request->file('photo')->store('inspection-photos', 'public'),
            'description' => $validated['description'] ?? null,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'photo' => ['id' => $photo->id, 'url' => $photo->url(), 'description' => $photo->description],
        ], 201);
    }

    public function destroyExtraPhoto(InspectionExtraPhoto $photo, Request $request): JsonResponse
    {
        $inspection = $photo->inspection;
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return response()->json(['deleted' => true]);
    }

    public function updateNotes(Inspection $inspection, Request $request): JsonResponse
    {
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        $validated = $request->validate([
            'notes' => 'nullable|string|max:5000',
            'other_notes' => 'nullable|string|max:5000',
        ]);

        $inspection->update($validated);

        return response()->json(['notes' => $inspection->notes, 'other_notes' => $inspection->other_notes]);
    }

    public function complete(Inspection $inspection, Request $request): JsonResponse
    {
        $this->authorizeAccess($inspection, $request);

        $this->inspectionService->markCompleted($inspection);

        return response()->json([
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'is_flagged' => (bool) $inspection->is_flagged,
                'completed_at' => $inspection->completed_at,
            ],
        ]);
    }

    private function authorizeAccess(Inspection $inspection, Request $request): void
    {
        $user = $request->user();
        $inspection->loadMissing('session');
        abort_unless($inspection->session->user_id === $user->id || $user->canViewAllBranches(), 403);
    }
}
