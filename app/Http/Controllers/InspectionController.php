<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use App\Models\Inspection;
use App\Models\ScannableCode;
use App\Services\InspectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

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
            'share' => $this->publicShare($inspection),
        ]);
    }

    /**
     * QR + link publik hasil sidak untuk dibagikan ke tenant.
     * Hanya aktif setelah sidak/sesi selesai (halaman publik 404 sebelumnya).
     */
    private function publicShare(Inspection $inspection): ?array
    {
        $done = $inspection->status === 'completed'
            || ($inspection->session && $inspection->session->status === 'completed');

        if (! $done) {
            return null;
        }

        if (! $inspection->scannableCode) {
            $inspection->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => Inspection::class,
                'scannable_id' => $inspection->id,
            ]));
        }

        $url = $inspection->scanUrl;

        return [
            'url' => $url,
            'qr' => Cache::remember(
                'inspection-qr.'.md5($url),
                3600,
                fn () => 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(200)->generate($url))
            ),
        ];
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
        $snapshotIds = collect($inspection->checklist_snapshot['sections'] ?? [])
            ->flatMap(fn ($s) => $s['items'] ?? [])->pluck('id')->map(fn ($v) => (string) $v)->all();
        abort_unless(in_array((string) $item->id, $snapshotIds, true), 422, 'Item bukan bagian dari checklist inspeksi ini.');

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
        $inspection->loadMissing('session');
        $isOwner = $inspection->session->user_id === $user->id;
        abort_unless($isOwner || $user->canViewAllBranches(), 403);
    }
}