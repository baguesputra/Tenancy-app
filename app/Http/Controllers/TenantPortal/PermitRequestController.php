<?php

namespace App\Http\Controllers\TenantPortal;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePermitRequestRequest;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Services\PermitRequestService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class PermitRequestController extends Controller
{
    public function __construct(private PermitRequestService $service) {}

    public function index(Request $request)
    {
        $tenantUser = $request->user('tenant');

        $permits = PermitRequest::with(['approvals' => fn ($q) => $q->orderBy('order')])
            ->where('tenant_id', $tenantUser->tenant_id)
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->search, fn ($q) => $q->where(fn ($qq) => $qq
                ->where('permit_number', 'like', "%{$request->search}%")
                ->orWhere('job_type', 'like', "%{$request->search}%")))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $permits->getCollection()->transform(function (PermitRequest $permit) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');
            $permit->current_step_label = $currentStep?->label;
            $permit->step_progress = $permit->approvals->map(fn ($a) => [
                'status' => $a->status,
                'label' => $a->label,
            ]);

            return $permit;
        });

        return Inertia::render('TenantPortal/Permits/Index', [
            'permits' => $permits,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('TenantPortal/Permits/Create', [
            'departments' => Department::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $tenantUser = $request->user('tenant');

        $validated = $request->validated();
        $validated['tenant_id'] = $tenantUser->tenant_id;

        $permit = $this->service->create($validated, $tenantUser);

        return redirect()->route('tenant-portal.permits.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan.');
    }

    public function show(PermitRequest $permit, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);

        $permit->load(['tenant', 'workers', 'goods', 'scannableCode', 'revisions', 'approvals' => fn ($q) => $q->orderBy('order')]);

        $bsStep = $permit->approvals->firstWhere('step_key', 'bs');
        $showQr = $permit->status === 'completed'
            || ($bsStep && $bsStep->status === 'approved' && $permit->status !== 'rejected');

        $scanUrl = $showQr ? $permit->scan_url : '';
        $qrImage = $scanUrl
            ? 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(220)->generate($scanUrl))
            : null;

        return Inertia::render('TenantPortal/Permits/Show', [
            'permit' => $permit,
            'qr_image' => $qrImage,
            'show_qr' => $showQr,
            'expires_at' => $permit->expires_at?->toDateTimeString(),
            'expires_label' => $permit->expires_at?->translatedFormat('d M Y, H:i').' WITA',
            'is_expired' => $permit->is_expired,
            'is_goods_permit' => $permit->is_goods_permit,
        ]);
    }

    public function cancel(PermitRequest $permit, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);

        $this->service->cancel($permit);

        return redirect()->route('tenant-portal.permits.index')->with('success', 'Surat izin dibatalkan.');
    }

    public function qrPdf(PermitRequest $permit, Request $request)
    {
        $tenantUser = $request->user('tenant');
        abort_unless($permit->tenant_id === $tenantUser->tenant_id, 403);

        $permit->load(['tenant', 'scannableCode', 'approvals' => fn ($q) => $q->orderBy('order')]);

        $bsStep = $permit->approvals->firstWhere('step_key', 'bs');
        $showQr = $permit->status === 'completed'
            || ($bsStep && $bsStep->status === 'approved' && $permit->status !== 'rejected');
        abort_unless($showQr, 403, 'QR belum tersedia — tunggu approval Building Service.');

        if (! $permit->scannableCode) {
            $permit->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => PermitRequest::class,
                'scannable_id' => $permit->id,
            ]));
        }

        $time = ($permit->work_start_time?->format('H:i') ?? '').($permit->work_end_time ? '–'.$permit->work_end_time->format('H:i') : '');
        $logoData = null;
        if ($permit->tenant?->logo_path && \Storage::disk('public')->exists($permit->tenant->logo_path)) {
            $mime = match (strtolower(pathinfo($permit->tenant->logo_path, PATHINFO_EXTENSION))) {
                'png' => 'image/png',
                'webp' => 'image/webp',
                default => 'image/jpeg',
            };
            $logoData = 'data:'.$mime.';base64,'.base64_encode(\Storage::disk('public')->get($permit->tenant->logo_path));
        }

        $pdf = Pdf::loadView('pdf.permit-qr-label', [
            'permit' => $permit,
            'schedule' => ($permit->work_start_date?->translatedFormat('d M Y') ?? '—').($permit->work_end_date && $permit->work_end_date->ne($permit->work_start_date) ? ' s/d '.$permit->work_end_date->translatedFormat('d M Y') : ''),
            'time' => $time !== '' ? str_replace(':', '.', $time).' WITA' : '—',
            'expiresLabel' => $permit->expires_at?->translatedFormat('d M Y, H:i').' WITA',
            'isGoods' => $permit->is_goods_permit,
            'logoData' => $logoData,
        ])->setPaper('a6');

        $safeNumber = str_replace(['/', '\\'], '-', $permit->permit_number);

        return $pdf->download("QR-{$safeNumber}.pdf");
    }
}
