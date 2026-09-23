<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use App\Models\Inspection;
use App\Services\InspectionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InspectionController extends Controller
{
    public function __construct(private InspectionService $inspectionService) {}

    public function show(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);

        $inspection->load(['tenant.productCategory', 'session', 'answers.photos']);

        // Gabungkan snapshot checklist dengan jawaban yang sudah ada,
        // supaya frontend tinggal render tanpa perlu query terpisah
        $answersByItemId = $inspection->answers->keyBy('checklist_item_id');

        $snapshot = $inspection->checklist_snapshot;
        foreach ($snapshot['sections'] as &$section) {
            foreach ($section['items'] as &$item) {
                $existingAnswer = $answersByItemId->get($item['id']);
                $item['answer'] = $existingAnswer ? [
                    'id' => $existingAnswer->id,
                    'value' => $existingAnswer->value,
                    'note' => $existingAnswer->note,
                    'photos' => $existingAnswer->photos->map(fn ($p) => [
                        'id' => $p->id,
                        'url' => $p->url(),
                    ]),
                ] : null;
            }
        }

        return Inertia::render('Inspections/Show', [
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'notes' => $inspection->notes,
                'other_notes' => $inspection->other_notes,
                'tenant' => $inspection->tenant,
                'session_id' => $inspection->inspection_session_id,
                'session_status' => $inspection->session->status,
            ],
            'checklistSnapshot' => $snapshot,
        ]);
    }

    public function updateNotes(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        $validated = $request->validate([
            'notes' => 'nullable|string|max:5000',
            'other_notes' => 'nullable|string|max:5000',
        ]);

        $inspection->update($validated);

        return back()->with('success', 'Catatan tersimpan.');
    }

    public function saveAnswer(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);

        $validated = $request->validate([
            'checklist_item_id' => 'required|exists:checklist_items,id',
            'value' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
            'photo' => 'nullable|image|max:5120', // maksimal 5MB
        ]);

        $item = ChecklistItem::findOrFail($validated['checklist_item_id']);

        $answer = $this->inspectionService->saveAnswer(
            $inspection,
            $item,
            $validated['value'] ?? null,
            $validated['note'] ?? null,
            $request->file('photo'),
        );

        $answer->load('photos');

        $payload = [
            'checklist_item_id' => $item->id,
            'value' => $answer->value,
            'note' => $answer->note,
            'photos' => $answer->photos->map(fn ($p) => ['id' => $p->id, 'url' => $p->url()]),
        ];

        if ($request->wantsJson()) {
            return response()->json(['answer' => $payload]);
        }

        return back()->with('answer', $payload);
    }

    public function complete(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);

        $this->inspectionService->markCompleted($inspection);

        return redirect()->route('sessions.show', $inspection->inspection_session_id)
            ->with('success', 'Checklist tenant ini selesai disimpan.');
    }

    private function authorizeAccess(Inspection $inspection, Request $request): void
    {
        $user = $request->user();
        $isOwner = $inspection->session->user_id === $user->id;
        abort_unless($isOwner || $user->canViewAllBranches(), 403);
    }
}