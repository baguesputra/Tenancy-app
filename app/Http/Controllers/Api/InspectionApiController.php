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

        $inspection->load([
            'tenant:id,name,logo_path,product_category_id,pic_name,pic_position,pic_phone',
            'tenant.productCategory:id,name',
            'tenant.activeTenancy:id,tenant_id,unit_id',
            'tenant.activeTenancy.unit:id,unit_code,floor,block,unit_number',
            'answers.photos',
            'extraPhotos',
            'session',
            'session.user:id,name,photo_url',
            'session.participants.user:id,photo_url',
        ]);
        $answers = $inspection->answers->keyBy('checklist_item_id');

        $snapshot = $inspection->checklist_snapshot ?? ['template_name' => '', 'sections' => []];
        foreach ($snapshot['sections'] as &$section) {
            $sectionName = $section['name'] ?? $section['title'] ?? '';
            $section['name'] = $sectionName;
            $section['title'] = $sectionName;
            foreach ($section['items'] as &$item) {
                $answer = $answers->get($item['id']);
                $item['answer'] = $answer ? [
                    'id' => $answer->id,
                    'checklist_item_id' => $item['id'],
                    'value' => $answer->value,
                    'note' => $answer->note,
                    'photos' => $answer->photos->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()])->values(),
                ] : null;
            }
        }
        unset($section, $item);

        $unit = $inspection->tenant?->activeTenancy?->unit;
        $location = $unit ? trim(collect([
            $unit->floor ? "Lantai {$unit->floor}" : null,
            $unit->block ? "Blok {$unit->block}" : null,
            $unit->unit_number ? "No. {$unit->unit_number}" : null,
        ])->filter()->implode(' · ')) ?: null : null;

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
                'tenant' => [
                    'id' => $inspection->tenant_id,
                    'name' => $inspection->tenant?->name,
                    'logo_url' => $inspection->tenant?->logo_url,
                    'unit_code' => $unit?->unit_code,
                    'product_category' => $inspection->tenant?->productCategory ? [
                        'id' => $inspection->tenant->productCategory->id,
                        'name' => $inspection->tenant->productCategory->name,
                    ] : null,
                    'pic_name' => $inspection->tenant?->pic_name,
                    'pic_position' => $inspection->tenant?->pic_position,
                    'pic_phone' => $inspection->tenant?->pic_phone,
                ],
            ],
            'checklist' => $snapshot,
            'formHeader' => [
                'inspected_at' => $inspection->session->started_at?->toISOString(),
                'location' => $location,
                'tenant_pic' => [
                    'name' => $inspection->tenant?->pic_name,
                    'position' => $inspection->tenant?->pic_position,
                    'phone' => $inspection->tenant?->pic_phone,
                ],
                'officers' => $inspection->session->participants->map(fn ($p) => [
                    'name' => $p->name_snapshot,
                    'department' => $p->department_name_snapshot,
                    'photo_url' => $p->user?->photo_url,
                ])->values(),
                'pic' => $inspection->session->pic_name,
                'pic_photo_url' => $inspection->session->user?->photo_url,
            ],
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
