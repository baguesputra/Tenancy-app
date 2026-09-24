<?php

namespace App\Http\Controllers\TenantPortal;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InspectionController extends Controller
{
    public function index(Request $request)
    {
        $tenantUser = $request->user('tenant');

        $inspections = Inspection::with(['session', 'answers'])
            ->where('tenant_id', $tenantUser->tenant_id)
            ->where(function ($q) {
                $q->where('status', 'completed')
                    ->orWhereHas('session', fn ($s) => $s->where('status', 'completed'));
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $inspections->getCollection()->transform(fn (Inspection $i) => $this->summary($i));

        $activeCount = Inspection::where('tenant_id', $tenantUser->tenant_id)
            ->whereHas('session', fn ($s) => $s->where('status', 'in_progress'))
            ->exists();

        $activeInspections = $activeCount
            ? Inspection::with('session')
                ->where('tenant_id', $tenantUser->tenant_id)
                ->whereHas('session', fn ($s) => $s->where('status', 'in_progress'))
                ->latest()->take(5)->get()->map(fn ($i) => [
                    'id' => $i->id,
                    'template_name' => $i->checklist_snapshot['template_name'] ?? '—',
                    'session_started_at' => $i->session->started_at?->toDateTimeString(),
                ])->values()
            : collect();

        return Inertia::render('TenantPortal/Inspections/Index', [
            'inspections' => $inspections,
            'sidak_active' => $activeCount,
            'active_inspections' => $activeInspections,
        ]);
    }

    public function show(Inspection $inspection, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($inspection->tenant_id === $tenantUser->tenant_id, 403);

        $inspection->load(['session', 'answers.photos']);

        $answersByItemId = $inspection->answers->keyBy('checklist_item_id');

        $snapshot = $inspection->checklist_snapshot;
        $answered = 0;
        $total = 0;
        foreach ($snapshot['sections'] as &$section) {
            foreach ($section['items'] as &$item) {
                $total++;
                $existingAnswer = $answersByItemId->get($item['id']);
                if ($existingAnswer?->value) {
                    $answered++;
                }
                $item['answer'] = $existingAnswer ? [
                    'value' => $existingAnswer->value,
                    'note' => $existingAnswer->note,
                    'photos' => $existingAnswer->photos->map(fn ($p) => [
                        'id' => $p->id,
                        'url' => $p->url(),
                    ]),
                ] : null;
            }
        }

        return Inertia::render('TenantPortal/Inspections/Show', [
            'inspection' => [
                'id' => $inspection->id,
                'status' => $inspection->status,
                'is_flagged' => $inspection->is_flagged,
                'notes' => $inspection->notes,
                'other_notes' => $inspection->other_notes,
                'session_status' => $inspection->session->status,
                'session_started_at' => $inspection->session->started_at?->toDateTimeString(),
            ],
            'checklistSnapshot' => $snapshot,
            'progress' => ['answered' => $answered, 'total' => $total],
        ]);
    }

    private function summary(Inspection $inspection): array
    {
        $snapshot = $inspection->checklist_snapshot ?? ['sections' => []];
        $total = 0;
        foreach ($snapshot['sections'] ?? [] as $section) {
            $total += count($section['items'] ?? []);
        }
        $answered = $inspection->answers->filter(fn ($a) => (string) $a->value !== '')->count();

        return [
            'id' => $inspection->id,
            'template_name' => $snapshot['template_name'] ?? '—',
            'status' => $inspection->status,
            'is_flagged' => $inspection->is_flagged,
            'session_status' => $inspection->session->status,
            'session_started_at' => $inspection->session->started_at?->toDateTimeString(),
            'answered' => $answered,
            'total' => $total,
        ];
    }
}
