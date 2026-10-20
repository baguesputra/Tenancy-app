<?php

namespace App\Http\Controllers;

use App\Http\Requests\RevisePermitRequestRequest;
use App\Http\Requests\StorePermitRequestRequest;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\StaticDocument;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PermitRequestService;
use App\Services\PermitRequestVisibilityService;
use App\Services\TenantScopeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Spatie\Permission\Models\Role;

class PermitRequestController extends Controller
{
    public function __construct(
        private PermitRequestService $service,
        private TenantScopeService $tenantScope,
        private PermitRequestVisibilityService $visibility,
    ) {}

    private const PRIVILEGED_ROLES = ['manager', 'admin', 'super_admin'];

    private function isPameranForm(PermitRequest $permit): bool
    {
        return in_array('pameran', $permit->activity_types ?? [], true);
    }

    private function isKegiatanForm(PermitRequest $permit): bool
    {
        return ! empty(array_intersect(
            ['event', 'meeting_internal', 'stock_opname'],
            $permit->activity_types ?? []
        ));
    }

    private function isParkirForm(PermitRequest $permit): bool
    {
        return in_array('langganan_parkir', $permit->activity_types ?? [], true);
    }

    private function canManageForm(User $user, PermitRequest $permit): bool
    {
        if ($user->hasAnyRole(self::PRIVILEGED_ROLES)) {
            return true;
        }

        if ($this->isPameranForm($permit)) {
            return $user->hasRole('marketing');
        }

        return $user->hasRole('tenancy_staff');
    }

    private const ACTIVITY_TYPES = [
        ['value' => 'kerja', 'label' => 'Kerja'],
        ['value' => 'lembur', 'label' => 'Lembur'],
        ['value' => 'masuk_barang', 'label' => 'Masuk Barang'],
        ['value' => 'keluar_barang', 'label' => 'Keluar Barang'],
        ['value' => 'masuk_alat', 'label' => 'Masuk Alat Kerja/Properti'],
        ['value' => 'keluar_alat', 'label' => 'Keluar Alat Kerja/Properti'],
        ['value' => 'fit_out', 'label' => 'Fit Out'],
        ['value' => 'pull_out', 'label' => 'Pull Out'],
        ['value' => 'renovasi', 'label' => 'Renovasi'],
        ['value' => 'pameran', 'label' => 'Pameran / Open Counter', 'code' => 'E&P'],
        ['value' => 'event', 'label' => 'Event', 'code' => 'EVT'],
        ['value' => 'meeting_internal', 'label' => 'Meeting Internal', 'code' => 'MTG'],
        ['value' => 'stock_opname', 'label' => 'Stock Opname', 'code' => 'STO'],
        ['value' => 'langganan_parkir', 'label' => 'Langganan Parkir'],
    ];

    private const KEGIATAN_TYPES = ['event', 'meeting_internal', 'stock_opname'];

    public function index(Request $request)
    {
        $user = $request->user();
        $isMarketing = $this->visibility->isMarketingLocked($user);
        $hiddenCategories = $this->visibility->hiddenCategories($user);

        if ($isMarketing) {
            $request->merge(['category' => 'pameran', 'activity_type' => 'pameran']);
        }

        if ($request->filled('category') && in_array($request->category, $hiddenCategories, true)) {
            $request->merge(['category' => null]);
        }

        if ($request->filled('activity_type') && $request->activity_type === 'pameran' && ! $this->visibility->canViewPameran($user)) {
            $request->merge(['activity_type' => null]);
        }

        $base = PermitRequest::with(['approvals' => fn ($q) => $q->orderBy('order'), 'requestedBy'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->activity_type, fn ($q) => $q->where('activity_types', 'like', "%{$request->activity_type}%"))
            ->when($request->search, fn ($q) => $q->where(fn ($w) => $w
                ->where('permit_number', 'like', "%{$request->search}%")
                ->orWhere('store_name_snapshot', 'like', "%{$request->search}%")))
            ->latest();

        $this->visibility->applyView($base, $user);

        if ($isMarketing) {
            $total = (clone $base)->count();
            $summary = [
                'total' => $total,
                'counts' => ['pameran' => $total],
            ];
        } else {
            $agg = (clone $base)->toBase()->selectRaw("
                count(*) as total,
                sum(activity_types like '%pameran%') as pameran,
                sum(activity_types not like '%pameran%' and (activity_types like '%event%' or activity_types like '%meeting_internal%' or activity_types like '%stock_opname%')) as kegiatan,
                sum(activity_types like '%langganan_parkir%') as parkir,
                sum(tenant_id is not null and activity_types not like '%pameran%' and activity_types not like '%event%' and activity_types not like '%meeting_internal%' and activity_types not like '%stock_opname%' and activity_types not like '%langganan_parkir%') as tenant,
                sum(tenant_id is null and activity_types not like '%pameran%' and activity_types not like '%event%' and activity_types not like '%meeting_internal%' and activity_types not like '%stock_opname%' and activity_types not like '%langganan_parkir%') as vendor
            ")->first();

            $summary = [
                'total' => (int) ($agg->total ?? 0),
                'counts' => [
                    'pameran' => (int) ($agg->pameran ?? 0),
                    'kegiatan' => (int) ($agg->kegiatan ?? 0),
                    'parkir' => (int) ($agg->parkir ?? 0),
                    'tenant' => (int) ($agg->tenant ?? 0),
                    'vendor' => (int) ($agg->vendor ?? 0),
                ],
            ];
        }

        $permits = $this->applyCategory($base, $isMarketing ? 'pameran' : $request->category)->paginate(15)->withQueryString();

        $userDepartmentId = $user->department_id;
        $isManager = $user->hasRole('manager');
        $marketingIds = Role::where('name', 'marketing')->first()?->users()->pluck('users.id')->all() ?? [];

        $permits->getCollection()->transform(function (PermitRequest $permit) use ($user, $userDepartmentId, $isManager, $marketingIds) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');
            $isBranchManagerTurn = $currentStep?->step_key === 'branch_manager'
                && $isManager
                && $permit->branch_id === $user->branch_id;

            $permit->current_step_label = $currentStep?->label;
            $permit->is_my_turn = $currentStep && ($isBranchManagerTurn
                || ($currentStep->step_key !== 'branch_manager' && $currentStep->department_id === $userDepartmentId));
            $permit->step_progress = $permit->approvals->map(fn ($a) => [
                'status' => $a->status,
                'label' => $a->label,
            ]);
            $permit->category = $this->categoryOf($permit);
            $permit->activity_labels = collect($permit->activity_types ?? [])
                ->map(fn ($v) => collect(self::ACTIVITY_TYPES)->firstWhere('value', $v)['label'] ?? $v)
                ->values();
            $permit->source = in_array($permit->requested_by_id, $marketingIds) ? 'marketing' : 'staff';

            return $permit;
        });

        return Inertia::render('PermitRequests/Index', [
            'permits' => $permits,
            'filters' => array_merge(
                $request->only(['status', 'category', 'activity_type', 'search']),
                $isMarketing ? ['category' => 'pameran'] : []
            ),
            'activityTypes' => collect(self::ACTIVITY_TYPES)
                ->reject(fn ($type) => $type['value'] === 'pameran' && ! $this->visibility->canViewPameran($user))
                ->values()
                ->all(),
            'summary' => $summary,
            'categoryLocked' => $isMarketing ? 'pameran' : null,
            'hiddenCategories' => $hiddenCategories,
        ]);
    }

    private function applyCategory($query, ?string $category)
    {
        return match ($category) {
            'pameran' => $query->where('activity_types', 'like', '%pameran%'),
            'kegiatan' => $query->where('activity_types', 'not like', '%pameran%')
                ->where(fn ($q) => $q->where('activity_types', 'like', '%event%')
                    ->orWhere('activity_types', 'like', '%meeting_internal%')
                    ->orWhere('activity_types', 'like', '%stock_opname%')),
            'parkir' => $query->where('activity_types', 'like', '%langganan_parkir%'),
            'tenant' => $query->whereNotNull('tenant_id')
                ->where('activity_types', 'not like', '%pameran%')
                ->where('activity_types', 'not like', '%event%')
                ->where('activity_types', 'not like', '%meeting_internal%')
                ->where('activity_types', 'not like', '%stock_opname%')
                ->where('activity_types', 'not like', '%langganan_parkir%'),
            'vendor' => $query->where('activity_types', 'not like', '%pameran%')
                ->where('activity_types', 'not like', '%event%')
                ->where('activity_types', 'not like', '%meeting_internal%')
                ->where('activity_types', 'not like', '%stock_opname%')
                ->where('activity_types', 'not like', '%langganan_parkir%')
                ->whereNull('tenant_id'),
            default => $query,
        };
    }

    private function categoryOf(PermitRequest $permit): string
    {
        if (in_array('pameran', $permit->activity_types ?? [])) {
            return 'pameran';
        }
        if ($this->isParkirForm($permit)) {
            return 'parkir';
        }
        if (! empty(array_intersect(self::KEGIATAN_TYPES, $permit->activity_types ?? []))) {
            return 'kegiatan';
        }
        if ($permit->tenant_id) {
            return 'tenant';
        }

        return 'vendor';
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $isMarketing = $this->visibility->isMarketingLocked($user);
        $canCreatePameran = $this->visibility->canCreatePameran($user);
        $rawMode = $request->query('mode', 'kerja');
        if ($rawMode === 'umum') {
            $rawMode = 'kerja'; // alias lama
        }
        $allowedModes = ['kerja', 'kegiatan', 'parkir'];
        if ($canCreatePameran) {
            $allowedModes[] = 'pameran';
        }
        $mode = $isMarketing ? 'pameran' : (in_array($rawMode, $allowedModes, true) ? $rawMode : 'kerja');
        $isExhibition = $mode === 'pameran';
        $isKegiatan = $mode === 'kegiatan';
        $isParkir = $mode === 'parkir';

        $viewable = $this->tenantScope->viewableCategoryIds($user);

        $tenants = Tenant::where('is_active', true)
            ->whereHas('activeTenancy')
            ->when($isExhibition, fn ($q) => $q->whereHas('tenantCategory', fn ($c) => $c->where('name', 'Open Counter')))
            ->when(! $isExhibition && $viewable !== null, fn ($q) => $q->whereIn('tenant_category_id', $viewable))
            ->when($isParkir, fn ($q) => $q->whereHas('activeTenancy'))
            ->with(['activeTenancy.unit'])
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'floor' => $t->activeTenancy?->unit?->floor,
                'block' => $t->activeTenancy?->unit?->block,
                'unit_number' => $t->activeTenancy?->unit?->unit_number,
            ])->values();

        return Inertia::render('PermitRequests/Create', [
            'tenants' => $tenants,
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'isMarketingLocked' => $isExhibition,
            'formMode' => $mode,
            'canChooseMode' => ! $isMarketing,
            'canCreatePameran' => $canCreatePameran,
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $user = $request->user();
        $isMarketing = $this->visibility->isMarketingLocked($user);
        $isExhibition = $isMarketing || $request->input('form_mode') === 'pameran';
        abort_if($isExhibition && ! $this->visibility->canCreatePameran($user), 403);
        $isKegiatan = ! $isExhibition && $request->input('form_mode') === 'kegiatan';
        $isParkir = ! $isExhibition && ! $isKegiatan && $request->input('form_mode') === 'parkir';

        if ($isExhibition) {
            $tenant = Tenant::with('tenantCategory')->find($request->tenant_id);
            abort_unless($tenant && $tenant->tenantCategory?->name === 'Open Counter', 403, 'Mode pameran hanya bisa mengajukan untuk tenant Open Counter.');
        } elseif ($isKegiatan || $isParkir) {
            $request->merge(['tenant_id' => $request->tenant_id ?: null]);
            $tenant = Tenant::find($request->tenant_id);
            abort_unless($tenant, 403, 'Mode ini wajib memilih tenant terdaftar.');
            $viewable = $this->tenantScope->viewableCategoryIds($request->user());
            abort_if(! $tenant || ($viewable !== null && ! $viewable->contains((int) $tenant->tenant_category_id)), 403, 'Tidak boleh mengajukan untuk tenant kategori ini.');
        } else {
            $request->merge(['tenant_id' => $request->tenant_id ?: null]);
            if ($request->tenant_id) {
                $tenant = Tenant::find($request->tenant_id);
                $viewable = $this->tenantScope->viewableCategoryIds($request->user());
                abort_if(! $tenant || ($viewable !== null && ! $viewable->contains((int) $tenant->tenant_category_id)), 403, 'Tidak boleh mengajukan untuk tenant kategori ini.');
            }
        }

        $validated = $request->validated();
        if ($isExhibition) {
            $validated['activity_types'] = ['pameran'];
        } elseif ($isKegiatan) {
            $validated['activity_types'] = [$validated['kegiatan_type']];
            unset($validated['kegiatan_type']);
        } elseif ($isParkir) {
            $validated['activity_types'] = ['langganan_parkir'];
        }

        $permit = $this->service->create($validated, $user);

        return redirect()->route('permit-requests.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan atas nama tenant.');
    }

    public function show(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permitRequest), 403);

        $permitRequest->load(['tenant', 'requestedBy', 'workers', 'goods', 'ktpPhotos', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy', 'revisions']);
        $permitRequest->currentUserDepartmentId = $user->department_id;
        $permitRequest->can_approve_marketing = strtolower($user->department?->name ?? '') === 'marketing'
            && strtolower($user->position?->name ?? '') === 'manager'
            && $user->hasRole('manager');
        $permitRequest->can_approve_tenant_manager = strtolower($user->department?->name ?? '') === 'tenancy'
            && $user->hasRole('manager');
        $permitRequest->can_approve_branch_manager = $user->hasRole('manager')
            && $permitRequest->branch_id === $user->branch_id;

        $requestedBy = $permitRequest->requestedBy;
        $permitRequest->requested_by_label = $requestedBy instanceof User
            ? $requestedBy->name
            : ($permitRequest->tenant->name ?? '—');

        return Inertia::render('PermitRequests/Show', [
            'permit' => $permitRequest,
            'can_revise' => $permitRequest->status === 'pending'
                && ! $this->isParkirForm($permitRequest)
                && $this->canManageForm($user, $permitRequest),
            'can_cancel' => $permitRequest->status === 'pending'
                && (string) $permitRequest->requested_by_id === (string) $user->id
                && ($permitRequest->requested_by_type ?? null) === User::class
                && $this->canManageForm($user, $permitRequest),
            'share' => $this->publicShare($permitRequest),
            'doc_files' => [
                'peraturan-fitout' => $this->staticDocFormat($permitRequest, 'peraturan-fitout'),
                'tata-tertib-lembur' => $this->staticDocFormat($permitRequest, 'tata-tertib-lembur'),
                'penitipan-barang' => $this->staticDocFormat($permitRequest, 'penitipan-barang'),
            ],
        ]);
    }

    /**
     * Ekstensi file upload divisi tenant (null = pakai PDF bawaan).
     * Untuk badge format di menu Dokumen.
     */
    private function staticDocFormat(PermitRequest $permit, string $key): ?string
    {
        $doc = StaticDocument::forPermit($key, $permit->branch_id);
        if (! $doc) {
            return null;
        }

        $ext = strtoupper(pathinfo($doc->original_name, PATHINFO_EXTENSION));

        return $ext !== '' ? $ext : 'FILE';
    }

    /**
     * QR + link publik surat izin untuk dibagikan ke tenant (tanpa login).
     * Hanya aktif setelah selesai / disetujui BS — sama dengan aturan tampil QR.
     */
    private function publicShare(PermitRequest $permitRequest): ?array
    {
        $permitRequest->loadMissing(['approvals' => fn ($q) => $q->orderBy('order')]);

        $bsStep = $permitRequest->approvals->firstWhere('step_key', 'bs');
        $showQr = $permitRequest->status === 'completed'
            || ($bsStep && $bsStep->status === 'approved' && $permitRequest->status !== 'rejected');

        if (! $showQr || ! $permitRequest->scan_url) {
            return null;
        }

        return [
            'url' => $permitRequest->scan_url,
            'qr' => 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(200)->generate($permitRequest->scan_url)),
        ];
    }

    /** Unduh kartu QR label (PDF) untuk dicetak dan diberikan ke tenant. */
    public function qrLabel(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permitRequest), 403);

        $permitRequest->load(['tenant', 'scannableCode', 'approvals' => fn ($q) => $q->orderBy('order')]);

        $bsStep = $permitRequest->approvals->firstWhere('step_key', 'bs');
        $showQr = $permitRequest->status === 'completed'
            || ($bsStep && $bsStep->status === 'approved' && $permitRequest->status !== 'rejected');
        abort_unless($showQr, 403, 'QR belum tersedia — tunggu seluruh approval selesai.');

        if (! $permitRequest->scannableCode) {
            $permitRequest->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => PermitRequest::class,
                'scannable_id' => $permitRequest->id,
            ]));
        }

        $time = ($permitRequest->work_start_time?->format('H:i') ?? '').($permitRequest->work_end_time ? '–'.$permitRequest->work_end_time->format('H:i') : '');
        $logoData = null;
        if ($permitRequest->tenant?->logo_path && Storage::disk('public')->exists($permitRequest->tenant->logo_path)) {
            $mime = match (strtolower(pathinfo($permitRequest->tenant->logo_path, PATHINFO_EXTENSION))) {
                'png' => 'image/png',
                'webp' => 'image/webp',
                default => 'image/jpeg',
            };
            $logoData = 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($permitRequest->tenant->logo_path));
        }

        $pdf = Pdf::loadView('pdf.permit-qr-label', [
            'permit' => $permitRequest,
            'schedule' => ($permitRequest->work_start_date?->translatedFormat('d M Y') ?? '—').($permitRequest->work_end_date && $permitRequest->work_end_date->ne($permitRequest->work_start_date) ? ' s/d '.$permitRequest->work_end_date->translatedFormat('d M Y') : ''),
            'time' => $time !== '' ? str_replace(':', '.', $time).' WITA' : '—',
            'expiresLabel' => $permitRequest->expires_at?->translatedFormat('d M Y, H:i').' WITA',
            'isGoods' => $permitRequest->is_goods_permit,
            'logoData' => $logoData,
        ])->setPaper('a6');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("QR-{$safeNumber}.pdf");
    }

    public function pdf(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permitRequest), 403);

        $permitRequest->load(['tenant', 'requestedBy', 'workers', 'goods', 'ktpPhotos', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy']);

        if ($this->isParkirForm($permitRequest)) {
            return $this->parkirPdf($permitRequest);
        }

        // Sertifikat tempel satu halaman khusus surat ijin kegiatan (gaya cetakan foto).
        if ($this->isKegiatanForm($permitRequest)) {
            return $this->kegiatanPdf($permitRequest);
        }

        $requestedBy = $permitRequest->requestedBy;
        $requestedByLabel = $requestedBy instanceof User
            ? $requestedBy->name
            : ($permitRequest->tenant->name ?? '—');

        $activityLabels = collect($permitRequest->activity_types ?? [])
            ->map(fn ($v) => collect(self::ACTIVITY_TYPES)->firstWhere('value', $v)['label'] ?? $v)
            ->values();

        $location = collect([$permitRequest->floor_snapshot, $permitRequest->block_snapshot, $permitRequest->unit_number_snapshot])
            ->filter()->join(' / ') ?: '—';

        $time = ($permitRequest->work_start_time?->format('H:i') ?? '').($permitRequest->work_end_time ? '–'.$permitRequest->work_end_time->format('H:i') : '');
        $schedule = ($permitRequest->work_start_date?->locale('id')->translatedFormat('d F Y') ?? '—').($permitRequest->work_end_date && $permitRequest->work_end_date->ne($permitRequest->work_start_date) ? ' s/d '.$permitRequest->work_end_date->locale('id')->translatedFormat('d F Y') : '');

        $goodsPhotos = [];
        foreach ($permitRequest->goods as $good) {
            $goodsPhotos[$good->id] = $this->photoDataUri($good->photo_path);
        }

        $statusLabels = [
            'pending' => 'Menunggu Persetujuan',
            'completed' => 'Selesai',
            'approved' => 'Disetujui',
            'rejected' => 'Ditolak',
            'cancelled' => 'Dibatalkan',
        ];

        $approvals = $permitRequest->approvals;
        $tenancyStep = $approvals->firstWhere('step_key', 'tenancy') ?? $approvals->first();
        $bsStep = $approvals->firstWhere('step_key', 'bs');
        $securityStep = $approvals->firstWhere('step_key', 'security');
        $isKegiatanPdf = $this->isKegiatanForm($permitRequest);
        $managerStep = $approvals->firstWhere('step_key', 'tenant_manager');
        $kegiatanNameLabel = match ($permitRequest->activity_types[0] ?? null) {
            'event' => 'Nama Event',
            'meeting_internal' => 'Nama Meeting',
            'stock_opname' => 'Nama Stock Opname',
            default => 'Nama Kegiatan',
        };

        if (! $permitRequest->scannableCode) {
            $permitRequest->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => PermitRequest::class,
                'scannable_id' => $permitRequest->id,
            ]));
        }

        $pdf = Pdf::loadView('pdf.permit-letter', [
            'permit' => $permitRequest,
            'requestedByLabel' => $requestedByLabel,
            'activityLabels' => $activityLabels,
            'location' => $location,
            'schedule' => $schedule,
            'time' => $time !== '' ? str_replace(':', '.', $time).' WITA' : '—',
            'requestDate' => $permitRequest->request_date?->locale('id')->translatedFormat('d F Y') ?? '—',
            'goodsPhotos' => $goodsPhotos,
            'statusLabel' => $statusLabels[$permitRequest->status] ?? $permitRequest->status,
            'printedAt' => now()->locale('id')->translatedFormat('d F Y, H:i').' WITA',
            'leftSigner' => ['role' => $tenancyStep?->label ?? 'Tenancy', 'approval' => $tenancyStep],
            'rightSigner' => $isKegiatanPdf
                ? ['role' => $managerStep?->label ?? 'Manager Tenant', 'approval' => $managerStep]
                : ['role' => $bsStep?->label ?? 'Building Service', 'approval' => $bsStep],
            'isKegiatan' => $isKegiatanPdf,
            'kegiatanNameLabel' => $kegiatanNameLabel,
            'securityStep' => $securityStep,
            'workersPresent' => $permitRequest->workers->isNotEmpty()
                ? $permitRequest->workers->where('is_present', true)->count()
                : $permitRequest->ktpPhotos->count(),
            'workersTotal' => $permitRequest->workers->isNotEmpty()
                ? $permitRequest->workers->count()
                : ($permitRequest->worker_count ?? 0),
            'goodsVerified' => $permitRequest->goods->where('is_verified', true)->count(),
            'goodsTotal' => $permitRequest->goods->count(),
            'scanUrl' => $permitRequest->scanUrl,
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Surat-Izin-{$safeNumber}.pdf");
    }

    /**
     * Sertifikat tempel satu halaman untuk surat ijin kegiatan (gaya cetakan foto).
     * Penandatangan = approver Tenancy (pengeluar dokumen).
     */
    private function kegiatanPdf(PermitRequest $permitRequest)
    {
        $permitRequest->loadMissing(['tenant', 'branch', 'approvals.approvedBy.position', 'scannableCode']);

        if (! $permitRequest->scannableCode) {
            $permitRequest->setRelation('scannableCode', ScannableCode::create([
                'token' => (string) Str::uuid(),
                'scannable_type' => PermitRequest::class,
                'scannable_id' => $permitRequest->id,
            ]));
        }

        $kind = $permitRequest->activity_types[0] ?? 'event';
        $kindWord = match ($kind) {
            'meeting_internal' => 'MEETING',
            'stock_opname' => 'STOCK OPNAME',
            default => 'EVENT',
        };
        $nameLabel = match ($kind) {
            'meeting_internal' => 'Nama Meeting',
            'stock_opname' => 'Nama Stock Opname',
            default => 'Nama Event',
        };

        $start = $permitRequest->work_start_date;
        $end = $permitRequest->work_end_date;
        $tanggalStr = ($start && $end && ! $start->eq($end))
            ? strtoupper($start->locale('id')->translatedFormat('d').' s/d '.$end->locale('id')->translatedFormat('d F Y'))
            : strtoupper(($start ?? $end)?->locale('id')->translatedFormat('d F Y') ?? '—');

        $fmtJam = fn ($t) => $t ? str_replace(':', '.', $t->format('H:i')).' WITA' : null;
        $jamParts = array_values(array_filter([
            $fmtJam($permitRequest->work_start_time),
            $fmtJam($permitRequest->work_end_time),
        ]));
        $jamStr = $jamParts !== [] ? implode(' s/d ', $jamParts) : '—';

        $tenancyStep = $permitRequest->approvals->firstWhere('step_key', 'tenancy');
        $signer = $tenancyStep?->approvedBy;
        $signerName = $signer?->name ? strtoupper($signer->name) : '( Menunggu )';
        $signerRole = $signer?->position?->name ? strtoupper($signer->position->name) : 'TENANCY DEPARTMENT';

        $logoPath = public_path('images/logo.png');
        $logoData = is_file($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('pdf.permit-kegiatan', [
            'permit' => $permitRequest,
            'title' => "IZIN {$kindWord} TENANT",
            'kindWord' => $kindWord,
            'nameLabel' => $nameLabel,
            'tanggalStr' => $tanggalStr,
            'jamStr' => $jamStr,
            'kota' => strtoupper($permitRequest->branch?->name ?? 'Banjarmasin'),
            'requestDate' => strtoupper($permitRequest->request_date?->locale('id')->translatedFormat('d F Y') ?? '—'),
            'signerName' => $signerName,
            'signerRole' => $signerRole,
            'scanUrl' => $permitRequest->scanUrl,
            'logoData' => $logoData,
            'printedAt' => now()->locale('id')->translatedFormat('d F Y, H:i').' WITA',
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Izin-Kegiatan-{$safeNumber}.pdf");
    }

    /** Form pengantar langganan parkir, compact satu halaman A4. */
    private function parkirPdf(PermitRequest $permitRequest)
    {
        $permitRequest->loadMissing(['tenant', 'branch']);

        $date = $permitRequest->request_date ?? now();

        $logoPath = public_path('images/logo.png');
        $logoData = is_file($logoPath)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('pdf.permit-langganan-parkir', [
            'permit' => $permitRequest,
            'tenantName' => $permitRequest->tenant->name ?? $permitRequest->store_name_snapshot,
            'lantai' => $permitRequest->floor_snapshot ?: '—',
            'blok' => $permitRequest->block_snapshot ?: '—',
            'nomor' => $permitRequest->unit_number_snapshot ?: '—',
            'tanggal' => $date->locale('id')->translatedFormat('d'),
            'bulan' => $date->locale('id')->translatedFormat('F'),
            'tahun' => $date->locale('id')->translatedFormat('Y'),
            'vehicleTypeLabel' => $permitRequest->vehicle_type === 'motor' ? 'MOTOR (R2)' : 'MOBIL (R4)',
            'logoData' => $logoData,
            'printedAt' => now('Asia/Makassar')->locale('id')->translatedFormat('d F Y, H:i').' WITA',
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Form-Langganan-Parkir-{$safeNumber}.pdf");
    }

    /** Ijin kerja fitout untuk dilekatkan di depan unit — tanpa nomor & QR sesuai template. */
    public function fitoutTempel(PermitRequest $permitRequest, Request $request)
    {
        $jenis = $this->guardFitoutDownload($permitRequest, $request);
        $permitRequest->loadMissing(['tenant', 'branch', 'workers']);

        $upper = fn (?string $v) => strtoupper($v ?? '—');

        $start = $permitRequest->work_start_date;
        $end = $permitRequest->work_end_date;
        $fmtTgl = fn ($d) => strtoupper($d->locale('id')->translatedFormat('d F Y'));
        $tanggalKerja = ($start && $end && ! $start->eq($end))
            ? $fmtTgl($start).' – '.$fmtTgl($end)
            : ((($start ?? $end) ? $fmtTgl($start ?? $end) : '—'));

        $fmtJam = fn ($t) => $t ? str_replace(':', '.', $t->format('H:i')) : null;
        $jamParts = array_values(array_filter([
            $fmtJam($permitRequest->work_start_time),
            $fmtJam($permitRequest->work_end_time),
        ]));
        $jamKerja = $jamParts !== [] ? implode(' – ', $jamParts).' WITA' : '24 JAM';

        $pekerjaan = $jenis === 'pull_out' ? 'PULL OUT' : 'FIT OUT';

        $workerCount = $permitRequest->worker_count ?? $permitRequest->workers->count();

        $pdf = Pdf::loadView('pdf.permit-fitout-tempel', [
            'permit' => $permitRequest,
            'lantai' => $upper($permitRequest->floor_snapshot),
            'blok' => $upper($permitRequest->block_snapshot),
            'nomor' => $upper($permitRequest->unit_number_snapshot),
            'namaTenant' => $upper($permitRequest->tenant->name ?? $permitRequest->store_name_snapshot),
            'penanggungJawab' => $upper($permitRequest->pic_name),
            'pekerjaan' => $pekerjaan,
            'jenis' => $jenis,
            'tanggalKerja' => $tanggalKerja,
            'jamKerja' => $jamKerja,
            'jumlahPekerja' => $workerCount ? '±'.$workerCount.' Orang' : '—',
            'kota' => $permitRequest->branch?->name ?? 'Banjarmasin',
            'tanggalSurat' => $permitRequest->request_date?->locale('id')->translatedFormat('d F Y')
                ?? now()->locale('id')->translatedFormat('d F Y'),
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);
        $jenisLabel = $jenis === 'pull_out' ? 'Pullout' : 'Fitout';

        return $pdf->download("Ijin-Tempel-{$jenisLabel}-{$safeNumber}.pdf");
    }

    /** Peraturan Pekerja Fit Out — file upload (branch → semua branch) atau Blade bawaan. */
    public function peraturanFitout(PermitRequest $permitRequest, Request $request)
    {
        $jenis = $this->guardFitoutDownload($permitRequest, $request);

        if ($doc = StaticDocument::forPermit('peraturan-fitout', $permitRequest->branch_id)) {
            return $doc->downloadResponse();
        }

        $pdf = Pdf::loadView('pdf.permit-peraturan-fitout', [
            'permit' => $permitRequest,
            'jenis' => $jenis,
            'jenisLabel' => $jenis === 'pull_out' ? 'Pull Out' : 'Fit Out',
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);
        $jenisLabel = $jenis === 'pull_out' ? 'Pullout' : 'Fitout';

        return $pdf->download("Peraturan-{$jenisLabel}-{$safeNumber}.pdf");
    }

    /** Tata Tertib Pekerja Lembur — file upload (branch → semua branch) atau Blade bawaan. */
    public function tataTertibLembur(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permitRequest), 403);
        abort_unless(in_array('lembur', $permitRequest->activity_types ?? [], true), 403, 'Tata tertib lembur hanya untuk izin lembur.');

        if ($doc = StaticDocument::forPermit('tata-tertib-lembur', $permitRequest->branch_id)) {
            return $doc->downloadResponse();
        }

        $permitRequest->loadMissing('branch');

        $pdf = Pdf::loadView('pdf.permit-tata-tertib-lembur', [
            'permit' => $permitRequest,
            'kota' => $permitRequest->branch?->name ?? 'Banjarmasin',
            'tanggalSurat' => $permitRequest->request_date?->locale('id')->translatedFormat('d F Y')
                ?? now()->locale('id')->translatedFormat('d F Y'),
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Tata-Tertib-Lembur-{$safeNumber}.pdf");
    }

    /** Kode Fit Out — kartu kontraktor/unit, penanggung jawab dari PIC surat ijin. */
    public function kodeFitout(PermitRequest $permitRequest, Request $request)
    {
        $jenis = $this->guardFitoutDownload($permitRequest, $request);
        $permitRequest->loadMissing(['tenant', 'branch']);

        $upper = fn (?string $v) => strtoupper($v ?? '—');

        $start = $permitRequest->work_start_date;
        $end = $permitRequest->work_end_date;
        $fmtTgl = fn ($d) => $d->locale('id')->translatedFormat('d F Y');
        $tanggalFitout = ($start && $end && ! $start->eq($end))
            ? $fmtTgl($start).' – '.$fmtTgl($end)
            : ((($start ?? $end) ? $fmtTgl($start ?? $end) : '—'));

        $unit = collect([$permitRequest->floor_snapshot, $permitRequest->block_snapshot, $permitRequest->unit_number_snapshot])
            ->filter()->join(' / ') ?: '—';
        $workerCount = $permitRequest->worker_count ?? 0;

        $pdf = Pdf::loadView('pdf.permit-kode-fitout', [
            'permit' => $permitRequest,
            'jenis' => $jenis,
            'jenisUpper' => $jenis === 'pull_out' ? 'PULL OUT' : 'FIT OUT',
            'namaTenant' => $upper($permitRequest->tenant->name ?? $permitRequest->store_name_snapshot),
            'unit' => $upper($unit),
            'penanggungJawab' => $upper($permitRequest->pic_name),
            'jumlahPekerja' => $workerCount ? '+/- '.$workerCount.' ORANG' : '—',
            'telepon' => $permitRequest->pic_phone ?: '—',
            'tanggalFitout' => $tanggalFitout,
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);
        $jenisLabel = $jenis === 'pull_out' ? 'Pullout' : 'Fitout';

        return $pdf->download("Kode-{$jenisLabel}-{$safeNumber}.pdf");
    }

    /** Penitipan barang — file upload (branch → semua branch) atau Blade bawaan. */
    public function penitipanBarang(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permitRequest), 403);
        abort_unless(! empty(array_intersect(['masuk_barang', 'fit_out', 'pull_out'], $permitRequest->activity_types ?? [])), 403, 'Penitipan barang hanya untuk izin masuk barang / fit out / pull out.');

        $jenis = array_intersect(['fit_out', 'pull_out'], $permitRequest->activity_types ?? [])
            ? $this->resolveDocVariant($permitRequest, $request)
            : null;

        if ($doc = StaticDocument::forPermit('penitipan-barang', $permitRequest->branch_id)) {
            return $doc->downloadResponse();
        }

        $permitRequest->loadMissing(['tenant', 'branch']);

        $start = $permitRequest->work_start_date;
        $end = $permitRequest->work_end_date;
        $fmtTgl = fn ($d) => $d->locale('id')->translatedFormat('d F Y');
        $periode = ($start && $end && ! $start->eq($end))
            ? $fmtTgl($start).' – '.$fmtTgl($end)
            : ((($start ?? $end) ? $fmtTgl($start ?? $end) : '—'));

        $pdf = Pdf::loadView('pdf.permit-penitipan-barang', [
            'permit' => $permitRequest,
            'jenis' => $jenis,
            'jenisLabel' => $jenis === 'pull_out' ? 'Pull Out' : 'Fit Out',
            'nama' => $permitRequest->contractor_pic ?: $permitRequest->pic_name ?: '—',
            'namaTenant' => $permitRequest->tenant->name ?? $permitRequest->store_name_snapshot ?? '—',
            'unit' => collect([$permitRequest->floor_snapshot, $permitRequest->block_snapshot, $permitRequest->unit_number_snapshot])
                ->filter()->join(' / ') ?: '—',
            'telepon' => $permitRequest->contractor_phone ?: $permitRequest->pic_phone ?: '—',
            'periode' => $periode,
            'kota' => $permitRequest->branch?->name ?? 'Banjarmasin',
            'tanggalSurat' => $permitRequest->request_date?->locale('id')->translatedFormat('d F Y')
                ?? now()->locale('id')->translatedFormat('d F Y'),
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Penitipan-Barang-{$safeNumber}.pdf");
    }

    private function photoDataUri(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => 'image/jpeg',
        };

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($path));
    }

    private function hasFitoutDocs(PermitRequest $permit): bool
    {
        return ! empty(array_intersect(['fit_out', 'pull_out'], $permit->activity_types ?? []));
    }

    private function resolveDocVariant(PermitRequest $permit, Request $request): string
    {
        $activities = $permit->activity_types ?? [];
        $jenis = $request->query('jenis');

        if (! in_array($jenis, ['fit_out', 'pull_out'], true)) {
            $jenis = in_array('pull_out', $activities, true) && ! in_array('fit_out', $activities, true)
                ? 'pull_out'
                : 'fit_out';
        }

        abort_unless(in_array($jenis, $activities, true), 403, 'Dokumen hanya untuk izin Fit Out / Pull Out.');

        return $jenis;
    }

    private function fitoutImageDataUri(string $filename): ?string
    {
        $path = public_path('images/'.$filename);

        return is_file($path)
            ? 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents($path))
            : null;
    }

    private function fitoutBaseData(PermitRequest $permit): array
    {
        $permit->loadMissing(['tenant', 'branch']);

        $unit = collect([$permit->floor_snapshot, $permit->block_snapshot, $permit->unit_number_snapshot])
            ->filter()->join(' / ') ?: '—';

        return [
            'permit' => $permit,
            'namaTenant' => $permit->tenant->name ?? $permit->store_name_snapshot ?? '—',
            'unit' => $unit,
            'kota' => $permit->branch?->name ?? 'Banjarmasin',
            'tanggalSurat' => $permit->request_date?->locale('id')->translatedFormat('d F Y')
                ?? now()->locale('id')->translatedFormat('d F Y'),
            'printedAt' => now()->locale('id')->translatedFormat('d F Y, H:i').' WITA',
            'kopData' => $this->fitoutImageDataUri('fitout-kop.jpeg'),
            'guideData' => $this->fitoutImageDataUri('fitout-guide.jpeg'),
        ];
    }

    private function guardFitoutDownload(PermitRequest $permit, Request $request): string
    {
        $user = $request->user();
        abort_unless($this->visibility->canView($user, $permit), 403);
        abort_unless($this->hasFitoutDocs($permit), 403, 'Surat pernyataan hanya untuk izin Fit Out / Pull Out.');

        return $this->resolveDocVariant($permit, $request);
    }

    /** Surat Pernyataan Tenant — ?source=surat (PIC surat ijin) atau master (PIC utama master tenant). */
    public function pernyataanTenant(PermitRequest $permitRequest, Request $request)
    {
        $jenis = $this->guardFitoutDownload($permitRequest, $request);

        $source = $request->query('source', 'surat');
        abort_unless(in_array($source, ['surat', 'master'], true), 422, 'Sumber tidak valid.');

        $base = $this->fitoutBaseData($permitRequest);

        if ($source === 'master') {
            abort_unless($permitRequest->tenant, 422, 'Tenant tidak ditemukan untuk sumber master.');
            $nama = $permitRequest->tenant->pic_name ?: '—';
            $jabatan = $permitRequest->tenant->pic_position ?: 'Penanggung Jawab';
            $telepon = $permitRequest->tenant->pic_phone ?: '—';
            $sumberLabel = 'PIC Utama Master Tenant';
        } else {
            $nama = $permitRequest->pic_name ?: '—';
            $jabatan = 'Penanggung Jawab';
            $telepon = $permitRequest->pic_phone ?: '—';
            $sumberLabel = 'Penanggung Jawab Surat Izin';
        }

        $pdf = Pdf::loadView('pdf.permit-pernyataan-tenant', [
            ...$base,
            'jenis' => $jenis,
            'jenisLabel' => $jenis === 'pull_out' ? 'Pull Out' : 'Fit Out',
            'nama' => $nama,
            'jabatan' => $jabatan,
            'telepon' => $telepon,
            'sumberLabel' => $sumberLabel,
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Pernyataan-Tenant-{$safeNumber}.pdf");
    }

    /** Surat Pernyataan Kontraktor — data vendor/kontraktor di surat ijin itu. */
    public function pernyataanKontraktor(PermitRequest $permitRequest, Request $request)
    {
        $jenis = $this->guardFitoutDownload($permitRequest, $request);
        abort_unless($permitRequest->contractor_pic, 422, 'Lengkapi data kontraktor di surat izin dulu.');

        $base = $this->fitoutBaseData($permitRequest);

        $pdf = Pdf::loadView('pdf.permit-pernyataan-kontraktor', [
            ...$base,
            'jenis' => $jenis,
            'jenisLabel' => $jenis === 'pull_out' ? 'Pull Out' : 'Fit Out',
            'nama' => $permitRequest->contractor_pic ?: '—',
            'jabatan' => 'Penanggung Jawab',
            'telepon' => $permitRequest->contractor_phone ?: '—',
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Pernyataan-Kontraktor-{$safeNumber}.pdf");
    }

    public function revise(PermitRequest $permitRequest, RevisePermitRequestRequest $request)
    {
        abort_unless($permitRequest->status === 'pending', 422, 'Hanya izin pending yang bisa direvisi.');
        abort_if($this->isParkirForm($permitRequest), 422, 'Form langganan parkir tidak mendukung revisi.');
        abort_unless($this->visibility->canView($request->user(), $permitRequest), 403);
        abort_unless($this->canManageForm($request->user(), $permitRequest), 403,
            $this->isPameranForm($permitRequest) ? 'Revisi form pameran hanya oleh marketing.' : ($this->isKegiatanForm($permitRequest) ? 'Revisi form kegiatan hanya oleh tenancy_staff.' : 'Revisi form tenant hanya oleh tenancy_staff.'));

        $validated = $request->validated();

        $this->service->revise($permitRequest, $validated, $request->user());

        return back()->with('success', 'Revisi diajukan. Menunggu approval ulang BS.');
    }

    public function cancel(PermitRequest $permitRequest, Request $request)
    {
        if ((string) $permitRequest->requested_by_id !== (string) $request->user()->id
            || ($permitRequest->requested_by_type ?? null) !== User::class) {
            abort(403, 'Hanya pembuat yang bisa membatalkan.');
        }
        abort_unless($this->visibility->canView($request->user(), $permitRequest), 403);
        abort_unless($this->canManageForm($request->user(), $permitRequest), 403,
            $this->isPameranForm($permitRequest) ? 'Pembatalan form pameran hanya oleh marketing.' : ($this->isKegiatanForm($permitRequest) ? 'Pembatalan form kegiatan hanya oleh tenancy_staff.' : 'Pembatalan form tenant hanya oleh tenancy_staff.'));

        $this->service->cancel($permitRequest);

        return redirect()->route('permit-requests.index')->with('success', 'Surat izin dibatalkan.');
    }
}
