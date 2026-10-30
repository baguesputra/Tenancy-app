<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\Unit;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use App\Services\PermitScanWindowService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScanController extends Controller
{
    public function __invoke(
        Request $request,
        string $token,
        InspectionSessionService $sessions,
        InspectionService $inspections,
        PermitScanWindowService $scanWindow,
    ) {
        $scannable = ScannableCode::with('scannable')
            ->where('token', $token)
            ->firstOrFail();

        $model = $scannable->scannable;
        if (! $model) {
            abort(404, 'Scannable target not found');
        }

        $webUser = $request->user('web');

        return match (get_class($model)) {
            // Dokumen publik: bisa dibuka siapa pun pemegang QR, tanpa login.
            PermitRequest::class => $this->handlePermit($model, $scanWindow),
            Inspection::class => $this->handleInspection($model),
            Unit::class => $this->handleUnit($model, $webUser, $request, $sessions, $inspections),
            default => abort(400, 'Unsupported scannable type'),
        };
    }

    private function handlePermit(PermitRequest $permit, PermitScanWindowService $scanWindow)
    {
        if ($permit->is_expired) {
            $label = $permit->expires_at?->translatedFormat('d M Y, H:i').' WITA';

            return Inertia::render('Scan/Expired', [
                'permit_number' => $permit->permit_number,
                'store_name' => $permit->store_name_snapshot,
                'expires_label' => $label,
            ])->toResponse(request())->setStatusCode(410);
        }

        if ($permit->isScanWindowLimited() && ! $scanWindow->isOpen()) {
            return Inertia::render('Scan/Closed', [
                'permit_number' => $permit->permit_number,
                'store_name' => $permit->store_name_snapshot,
                'next_open_label' => $scanWindow->nextOpenAt()?->translatedFormat('d M Y, H:i').' WITA',
                'summary' => $scanWindow->summary(),
            ])->toResponse(request())->setStatusCode(403);
        }

        $permit->load(['approvals' => fn ($q) => $q->orderBy('order')]);

        $activityLabels = collect($permit->activity_types ?? [])
            ->map(fn ($v) => self::ACTIVITY_LABELS[$v] ?? $v)
            ->values();

        return Inertia::render('Scan/PermitStatus', [
            'permit' => [
                'permit_number' => $permit->permit_number,
                'store_name' => $permit->store_name_snapshot,
                'status' => $permit->status,
                'status_label' => self::STATUS_LABELS[$permit->status] ?? $permit->status,
                'job_type' => $permit->job_type,
                'activity_labels' => $activityLabels,
                'request_date' => $permit->request_date?->toDateString(),
                'work_start_date' => $permit->work_start_date?->toDateString(),
                'work_end_date' => $permit->work_end_date?->toDateString(),
                'work_start_time' => $permit->work_start_time?->format('H:i'),
                'work_end_time' => $permit->work_end_time?->format('H:i'),
                'location' => trim(collect([$permit->floor_snapshot, $permit->block_snapshot, $permit->unit_number_snapshot])->filter()->implode(' / ')) ?: null,
                'pic_name' => $permit->pic_name,
                'is_goods_permit' => $permit->is_goods_permit,
                'expires_label' => $permit->expires_at?->translatedFormat('d M Y, H:i').' WITA',
                'approvals' => $permit->approvals->map(fn ($a) => [
                    'label' => $a->label,
                    'status' => $a->status,
                ])->values(),
            ],
        ]);
    }

    private function handleInspection(Inspection $inspection)
    {
        $inspection->load(['tenant:id,name', 'tenant.activeTenancy.unit:id,unit_code,floor,block,unit_number', 'session', 'answers.photos']);

        // Hasil sidak hanya boleh dilihat publik setelah selesai.
        $done = $inspection->status === 'completed'
            || ($inspection->session && $inspection->session->status === 'completed');
        abort_unless($done, 404);

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

        return Inertia::render('Scan/InspectionStatus', [
            'inspection' => [
                'id' => $inspection->id,
                'store_name' => $inspection->tenant?->name ?? '—',
                'template_name' => $snapshot['template_name'] ?? '—',
                'status' => $inspection->status,
                'session_status' => $inspection->session->status,
                'session_started_at' => $inspection->session->started_at?->toDateTimeString(),
                'location' => ($unit = $inspection->tenant?->activeTenancy?->unit)
                    ? trim(collect([
                        $unit->floor ? "Lantai {$unit->floor}" : null,
                        $unit->block ? "Blok {$unit->block}" : null,
                        $unit->unit_number ? "No. {$unit->unit_number}" : null,
                    ])->filter()->implode(' · ')) ?: null
                    : null,
            ],
            'checklistSnapshot' => $snapshot,
            'progress' => ['answered' => $answered, 'total' => $total],
        ]);
    }

    private function handleUnit(
        Unit $unit,
        $webUser,
        Request $request,
        InspectionSessionService $sessions,
        InspectionService $inspections,
    ) {
        $unit->loadMissing('activeTenancy.tenant');

        // QR unit hanya untuk operasional staff — guest diarahkan ke login staff.
        if (! $webUser) {
            $request->session()->put('scan_redirect_token', $unit->scannableCode->token);

            return redirect()->route('login');
        }

        if ($webUser->can('sidak.manage')) {
            $tenancy = $unit->activeTenancy;
            abort_unless($tenancy && $tenancy->tenant, 404, 'Unit kosong, tidak ada tenant aktif.');

            $ongoing = $inspections->findOngoingInspection($webUser, $tenancy->tenant);
            if ($ongoing) {
                return redirect()->route('inspections.show', $ongoing->id);
            }

            $other = $inspections->findOtherOngoingInspection($webUser, $tenancy->tenant);
            if ($other) {
                $name = $other->session->user->name ?? 'inspector lain';

                return back()->withErrors(['token' => "Tenant {$tenancy->tenant->name} sedang disidak {$name}."]);
            }

            $session = $sessions->getOrCreateActiveSession($webUser);
            $inspection = $inspections->addInspection($session, $tenancy->tenant);

            return redirect()->route('inspections.show', $inspection->id);
        }

        return $webUser->can('units.view')
            ? redirect()->route('units.index')
            : redirect()->route('dashboard');
    }

    private const ACTIVITY_LABELS = [
        'kerja' => 'Kerja',
        'lembur' => 'Lembur',
        'masuk_barang' => 'Masuk Barang',
        'keluar_barang' => 'Keluar Barang',
        'masuk_alat' => 'Masuk Alat Kerja/Properti',
        'keluar_alat' => 'Keluar Alat Kerja/Properti',
        'fit_out' => 'Fit Out',
        'pull_out' => 'Pull Out',
        'renovasi' => 'Renovasi',
        'pameran' => 'Pameran / Open Counter',
    ];

    private const STATUS_LABELS = [
        'pending' => 'Menunggu Persetujuan',
        'completed' => 'Selesai',
        'approved' => 'Disetujui',
        'rejected' => 'Ditolak',
        'cancelled' => 'Dibatalkan',
    ];
}
