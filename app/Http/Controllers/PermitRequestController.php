<?php

namespace App\Http\Controllers;

use App\Http\Requests\RevisePermitRequestRequest;
use App\Http\Requests\StorePermitRequestRequest;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PermitRequestService;
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
    public function __construct(private PermitRequestService $service, private TenantScopeService $tenantScope) {}

    private const PRIVILEGED_ROLES = ['manager', 'admin', 'super_admin'];

    private function isPameranForm(PermitRequest $permit): bool
    {
        return in_array('pameran', $permit->activity_types ?? [], true);
    }

    private function canManageForm(User $user, PermitRequest $permit): bool
    {
        if ($user->hasAnyRole(self::PRIVILEGED_ROLES)) {
            return true;
        }

        return $this->isPameranForm($permit)
            ? $user->hasRole('marketing')
            : $user->hasRole('tenancy_staff');
    }

    private const ACTIVITY_TYPES = [
        ['value' => 'kerja', 'label' => 'Kerja'],
        ['value' => 'lembur', 'label' => 'Lembur'],
        ['value' => 'masuk_keluar_barang', 'label' => 'Masuk/Keluar Barang'],
        ['value' => 'masuk_keluar_alat', 'label' => 'Masuk/Keluar Alat Kerja/Properti'],
        ['value' => 'fit_out_pull_out_renovasi', 'label' => 'Fit Out/Pull Out/Renovasi'],
        ['value' => 'pameran', 'label' => 'Pameran / Open Counter', 'code' => 'E&P'],
    ];

    public function index(Request $request)
    {
        $isMarketing = $request->user()->hasRole('marketing');

        $base = PermitRequest::with(['approvals' => fn ($q) => $q->orderBy('order'), 'requestedBy'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->activity_type, fn ($q) => $q->where('activity_types', 'like', "%{$request->activity_type}%"))
            ->when($request->search, fn ($q) => $q->where(fn ($w) => $w
                ->where('permit_number', 'like', "%{$request->search}%")
                ->orWhere('store_name_snapshot', 'like', "%{$request->search}%")))
            ->latest();

        if ($isMarketing) {
            $base->where('activity_types', 'like', '%pameran%');
            $request->merge(['category' => 'pameran', 'activity_type' => 'pameran']);
        }

        if (! $request->user()->canViewAllBranches()) {
            $base->where('branch_id', $request->user()->branch_id);
        }

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
                sum(tenant_id is not null and activity_types not like '%pameran%') as tenant,
                sum(activity_types not like '%pameran%' and (is_external = 1 or contractor_company is not null)) as vendor,
                sum(tenant_id is null and activity_types not like '%pameran%' and (is_external = 0 or is_external is null) and contractor_company is null) as area
            ")->first();

            $summary = [
                'total' => (int) ($agg->total ?? 0),
                'counts' => [
                    'pameran' => (int) ($agg->pameran ?? 0),
                    'tenant' => (int) ($agg->tenant ?? 0),
                    'vendor' => (int) ($agg->vendor ?? 0),
                    'area' => (int) ($agg->area ?? 0),
                ],
            ];
        }

        $permits = $this->applyCategory($base, $isMarketing ? 'pameran' : $request->category)->paginate(15)->withQueryString();

        $userDepartmentId = $request->user()->department_id;
        $marketingIds = Role::where('name', 'marketing')->first()?->users()->pluck('users.id')->all() ?? [];

        $permits->getCollection()->transform(function (PermitRequest $permit) use ($userDepartmentId, $marketingIds) {
            $currentStep = $permit->approvals->firstWhere('status', 'pending');

            $permit->current_step_label = $currentStep?->label;
            $permit->is_my_turn = $currentStep && $currentStep->department_id === $userDepartmentId;
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
            'activityTypes' => self::ACTIVITY_TYPES,
            'summary' => $summary,
            'categoryLocked' => $isMarketing ? 'pameran' : null,
            'hiddenCategories' => [],
        ]);
    }

    private function applyCategory($query, ?string $category)
    {
        return match ($category) {
            'pameran' => $query->where('activity_types', 'like', '%pameran%'),
            'tenant' => $query->whereNotNull('tenant_id')->where('activity_types', 'not like', '%pameran%'),
            'vendor' => $query->where('activity_types', 'not like', '%pameran%')
                ->where(fn ($w) => $w->where('is_external', true)->orWhereNotNull('contractor_company')),
            'area' => $query->whereNull('tenant_id')->where('activity_types', 'not like', '%pameran%')
                ->where(fn ($w) => $w->where('is_external', false)->orWhereNull('is_external'))
                ->whereNull('contractor_company'),
            default => $query,
        };
    }

    private function categoryOf(PermitRequest $permit): string
    {
        if (in_array('pameran', $permit->activity_types ?? [])) {
            return 'pameran';
        }
        if ($permit->tenant_id) {
            return 'tenant';
        }
        if ($permit->is_external || $permit->contractor_company) {
            return 'vendor';
        }

        return 'area';
    }

    public function create(Request $request)
    {
        // ponytail: marketing paksa pameran; non-marketing bebas ?mode=umum|pameran
        $isRoleMarketing = $request->user()->hasRole('marketing');
        $mode = $isRoleMarketing ? 'pameran' : ($request->query('mode') === 'pameran' ? 'pameran' : 'umum');
        $isExhibition = $mode === 'pameran';

        $viewable = $this->tenantScope->viewableCategoryIds($request->user());

        $tenants = Tenant::where('is_active', true)
            ->whereHas('activeTenancy')
            ->when($isExhibition, fn ($q) => $q->whereHas('tenantCategory', fn ($c) => $c->where('name', 'Open Counter')))
            ->when(! $isExhibition && $viewable !== null, fn ($q) => $q->whereIn('tenant_category_id', $viewable))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('PermitRequests/Create', [
            'tenants' => $tenants,
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'isMarketingLocked' => $isExhibition,
            'formMode' => $mode,
            'canChooseMode' => ! $isRoleMarketing,
        ]);
    }

    public function store(StorePermitRequestRequest $request)
    {
        $isRoleMarketing = $request->user()->hasRole('marketing');
        $isExhibition = $isRoleMarketing || $request->input('form_mode') === 'pameran';

        if ($isExhibition) {
            $tenant = Tenant::with('tenantCategory')->find($request->tenant_id);
            abort_unless($tenant && $tenant->tenantCategory?->name === 'Open Counter', 403, 'Mode pameran hanya bisa mengajukan untuk tenant Open Counter.');
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
        }

        $permit = $this->service->create($validated, $request->user());

        return redirect()->route('permit-requests.show', $permit->id)
            ->with('success', 'Surat izin berhasil diajukan atas nama tenant.');
    }

    public function show(PermitRequest $permitRequest, Request $request)
    {
        $user = $request->user();
        abort_unless($permitRequest->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
        abort_if($user->hasRole('marketing') && ! in_array('pameran', $permitRequest->activity_types ?? []), 403);

        $permitRequest->load(['tenant', 'requestedBy', 'workers', 'goods', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy', 'revisions']);
        $permitRequest->currentUserDepartmentId = $user->department_id;
        $permitRequest->can_approve_marketing = strtolower($user->department?->name ?? '') === 'marketing'
            && strtolower($user->position?->name ?? '') === 'manager'
            && $user->hasRole('manager');

        $requestedBy = $permitRequest->requestedBy;
        $permitRequest->requested_by_label = $requestedBy instanceof User
            ? $requestedBy->name
            : ($permitRequest->tenant->name ?? '—');

        return Inertia::render('PermitRequests/Show', [
            'permit' => $permitRequest,
            'can_revise' => $permitRequest->status === 'pending' && $this->canManageForm($user, $permitRequest),
            'can_cancel' => $permitRequest->status === 'pending'
                && (string) $permitRequest->requested_by_id === (string) $user->id
                && ($permitRequest->requested_by_type ?? null) === User::class
                && $this->canManageForm($user, $permitRequest),
            'share' => $this->publicShare($permitRequest),
        ]);
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
        abort_unless($permitRequest->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);

        $permitRequest->load(['tenant', 'scannableCode', 'approvals' => fn ($q) => $q->orderBy('order')]);

        $bsStep = $permitRequest->approvals->firstWhere('step_key', 'bs');
        $showQr = $permitRequest->status === 'completed'
            || ($bsStep && $bsStep->status === 'approved' && $permitRequest->status !== 'rejected');
        abort_unless($showQr, 403, 'QR belum tersedia — tunggu approval Building Service.');

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
        abort_unless($permitRequest->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
        abort_if($user->hasRole('marketing') && ! in_array('pameran', $permitRequest->activity_types ?? []), 403);

        $permitRequest->load(['tenant', 'requestedBy', 'workers', 'goods', 'accompanyingDepartments', 'approvals.department', 'approvals.approvedBy']);

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
            'rightSigner' => ['role' => $bsStep?->label ?? 'Building Service', 'approval' => $bsStep],
            'securityStep' => $securityStep,
            'workersPresent' => $permitRequest->workers->where('is_present', true)->count(),
            'workersTotal' => $permitRequest->workers->count(),
            'goodsVerified' => $permitRequest->goods->where('is_verified', true)->count(),
            'goodsTotal' => $permitRequest->goods->count(),
            'scanUrl' => $permitRequest->scanUrl,
        ])->setPaper('a4');

        $safeNumber = str_replace(['/', '\\'], '-', $permitRequest->permit_number);

        return $pdf->download("Surat-Izin-{$safeNumber}.pdf");
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

    public function revise(PermitRequest $permitRequest, RevisePermitRequestRequest $request)
    {
        abort_unless($permitRequest->status === 'pending', 422, 'Hanya izin pending yang bisa direvisi.');
        abort_unless($permitRequest->branch_id === $request->user()->branch_id || $request->user()->canViewAllBranches(), 403);
        abort_if($request->user()->hasRole('marketing') && ! in_array('pameran', $permitRequest->activity_types ?? []), 403);
        abort_unless($this->canManageForm($request->user(), $permitRequest), 403,
            $this->isPameranForm($permitRequest) ? 'Revisi form pameran hanya oleh marketing.' : 'Revisi form tenant hanya oleh tenancy_staff.');

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
        abort_unless($permitRequest->branch_id === $request->user()->branch_id || $request->user()->canViewAllBranches(), 403);
        abort_unless($this->canManageForm($request->user(), $permitRequest), 403,
            $this->isPameranForm($permitRequest) ? 'Pembatalan form pameran hanya oleh marketing.' : 'Pembatalan form tenant hanya oleh tenancy_staff.');

        $this->service->cancel($permitRequest);

        return redirect()->route('permit-requests.index')->with('success', 'Surat izin dibatalkan.');
    }
}
