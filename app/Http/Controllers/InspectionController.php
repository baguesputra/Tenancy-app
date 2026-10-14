<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use App\Models\Inspection;
use App\Models\InspectionExtraPhoto;
use App\Models\ScannableCode;
use App\Services\InspectionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InspectionController extends Controller
{
    public function __construct(private InspectionService $inspectionService) {}

    public function show(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);

        $inspection->load([
            'tenant.productCategory',
            'tenant.activeTenancy.unit:id,unit_code,floor,block,unit_number',
            'session', 'session.user:id,name', 'session.participants',
            'answers.photos', 'extraPhotos',
        ]);

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

        $unit = $inspection->tenant->activeTenancy?->unit;

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
            // Kop formulir ala form sidak Excel (read-only).
            'formHeader' => [
                'inspected_at' => $inspection->session->started_at?->toDateTimeString(),
                'location' => $unit ? trim(collect([
                    $unit->floor ? "Lantai {$unit->floor}" : null,
                    $unit->block ? "Blok {$unit->block}" : null,
                    $unit->unit_number ? "No. {$unit->unit_number}" : null,
                ])->filter()->implode(' · ')) ?: null : null,
                'tenant_pic' => [
                    'name' => $inspection->tenant->pic_name,
                    'position' => $inspection->tenant->pic_position,
                    'phone' => $inspection->tenant->pic_phone,
                ],
                'officers' => $inspection->session->participants->map(fn ($p) => [
                    'name' => $p->name_snapshot,
                    'department' => $p->department_name_snapshot,
                ])->values(),
                'pic' => $inspection->session->user?->name,
            ],
            'checklistSnapshot' => $snapshot,
            'share' => $this->publicShare($inspection),
            'extraPhotos' => $inspection->extraPhotos->map(fn ($p) => [
                'id' => $p->id,
                'url' => $p->url(),
                'description' => $p->description,
            ]),
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

    /**
     * Foto tambahan di luar checklist (section Lain-lain): tanpa batas, tiap foto ada keterangan.
     */
    public function storeExtraPhoto(Inspection $inspection, Request $request)
    {
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        $validated = $request->validate([
            'photo' => 'required|image|max:5120', // maksimal 5MB
            'description' => 'nullable|string|max:255',
        ]);

        $photo = $inspection->extraPhotos()->create([
            'path' => $request->file('photo')->store('inspection-photos', 'public'),
            'description' => $validated['description'] ?? null,
            'uploaded_at' => now(),
        ]);

        $payload = ['id' => $photo->id, 'url' => $photo->url(), 'description' => $photo->description];

        if ($request->wantsJson()) {
            return response()->json(['photo' => $payload]);
        }

        return back()->with('success', 'Foto lain-lain tersimpan.');
    }

    public function destroyExtraPhoto(InspectionExtraPhoto $photo, Request $request)
    {
        $inspection = $photo->inspection;
        $this->authorizeAccess($inspection, $request);
        abort_unless($inspection->session->status === 'in_progress', 422, 'Sesi ini sudah ditandai selesai dan tidak bisa diubah lagi.');

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        if ($request->wantsJson()) {
            return response()->json(['deleted' => true]);
        }

        return back()->with('success', 'Foto dihapus.');
    }

    private function authorizeAccess(Inspection $inspection, Request $request): void
    {
        $user = $request->user();
        $inspection->loadMissing('session');
        $isOwner = $inspection->session->user_id === $user->id;
        abort_unless($isOwner || $user->canViewAllBranches(), 403);
    }
}