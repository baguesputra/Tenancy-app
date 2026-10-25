<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\BranchScopeService;
use App\Services\LooProgressService;
use App\Services\LooSectionService;
use App\Services\LooStateService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LooController extends Controller
{
    public function __construct(
        private BranchScopeService $branchScope,
        private LooStateService $state,
        private LooSectionService $sections,
        private LooProgressService $progress,
        private NotificationService $notifications,
    ) {}

    private const STATUSES = [
        'draft' => 'Draft',
        'pengisian_divisi' => 'Pengisian Divisi',
        'pengukuran_ulang' => 'Pengukuran Ulang',
        'sebelum_fitout' => 'Sebelum Fitout',
        'setelah_fitout' => 'Setelah Fitout',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];

    private const STAGES = [
        'marketing' => 'Pengisian Divisi',
        'pre_handover' => 'Pengukuran Ulang',
        'ba_handover' => 'Sebelum Fitout',
        'fitout' => 'Setelah Fitout',
        'completed' => 'Completed',
    ];

    private const FILE_LABELS = [
        'cover_file' => 'Cover LOO',
        'isi_file' => 'Isi LOO',
        'loo_letter_file' => 'Surat LOO',
        'loo_proposal_file' => 'Penawaran LOO',
    ];

    // Role ini hanya boleh membuka file Cover LOO.
    private const COVER_ONLY_ROLES = ['tenancy_staff', 'tenant_mgmt'];

    public function index(Request $request)
    {
        $query = Loo::with(['branch:id,name', 'tenant:id,name', 'tenantCategory:id,name', 'marketing:id,name', 'sections:id,loo_id,section_key,is_submitted,data,filled_at,submitted_at'])
            ->when($request->search, fn ($q) => $q->where('loo_number', 'like', "%{$request->search}%")
                ->orWhere('prospective_tenant_name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->current_stage, fn ($q) => $q->where('current_stage', $request->current_stage))
            ->latest();

        $this->branchScope->apply($query, $request->user());

        $summary = (clone $query)
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(status = "draft") as draft')
            ->selectRaw('sum(status = "pengisian_divisi") as pengisian_divisi')
            ->selectRaw('sum(status = "pengukuran_ulang") as pengukuran_ulang')
            ->selectRaw('sum(status = "sebelum_fitout") as sebelum_fitout')
            ->selectRaw('sum(status = "setelah_fitout") as setelah_fitout')
            ->selectRaw('sum(status = "completed") as completed')
            ->selectRaw('sum(status = "cancelled") as cancelled')
            ->first()
            ->only(array_keys(self::STATUSES));

        $loos = $query->paginate(15)->withQueryString()->through(function (Loo $loo) {
            $loo->status_detail = $this->progress->summaryLine($loo);

            return $loo;
        });

        return Inertia::render('Loos/Index', [
            'loos' => $loos,
            'summary' => $summary,
            'filters' => $request->only(['search', 'status', 'current_stage']),
            'statusOptions' => $this->options(self::STATUSES),
            'stageOptions' => $this->options(self::STAGES),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('Loos/Create', [
            'branches' => Branch::orderBy('name')->get(['id', 'name', 'code']),
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'tenants' => $this->activeTenants($request->user()),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $branch = Branch::findOrFail($data['branch_id']);

        $loo = Loo::create([
            ...$data,
            ...$this->storeFiles($request, []),
            'marketing_id' => $request->user()->id,
            'loo_number' => Loo::generateLooNumber($branch->code, now()->year),
            'status' => 'draft',
            'current_stage' => 'marketing',
        ]);

        $this->state->log($loo, $request->user(), 'created');
        $this->notifyLooViewers($loo, $request->user());

        return redirect()->route('loos.show', $loo->id)->with('success', 'LOO berhasil dibuat.');
    }

    public function show(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        $loo->load(['branch', 'tenant', 'tenantCategory', 'marketing', 'unit', 'sections.filler', 'history.user']);

        return Inertia::render('Loos/Show', [
            'loo' => $loo,
            'sectionConfigs' => config('loo_sections'),
            'canEditSections' => $this->editableSectionKeys($loo, $request->user()),
            'visibleSectionKeys' => $this->visibleSectionKeys($loo, $request->user()),
            'canEditLoo' => $request->user()->can('loos.create'),
            'canCancel' => $this->canCancel($loo, $request->user()),
            'files' => $this->accessibleFiles($loo, $request->user()),
            'progress' => $this->progress->progress($loo),
            'options' => [
                'productCategories' => ProductCategory::orderBy('name')->get(['id', 'name']),
                'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
                'units' => $loo->unit
                    ? [['id' => $loo->unit->id, 'name' => $loo->unit->unit_code]]
                    : [],
            ],
        ]);
    }

    /**
     * Servis file LOO ter-auth (storage private). Cover terbuka untuk semua
     * pemilik loos.view; file lain hanya untuk role di luar COVER_ONLY_ROLES.
     */
    public function file(Request $request, Loo $loo, string $key)
    {
        $this->authorizeAccess($loo, $request);

        $column = $this->fileColumns()[$key] ?? null;
        abort_unless($column, 404);

        $coverOnly = $key !== 'cover_file'
            && $request->user()->hasAnyRole(self::COVER_ONLY_ROLES);
        abort_if($coverOnly, 403, 'Anda hanya dapat membuka file Cover LOO.');

        $path = $loo->{$column};
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        $mime = match (strtolower(Str::afterLast($path, '.'))) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => 'application/octet-stream',
        };

        return response(Storage::disk('local')->get($path), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Pencarian unit untuk dropdown form section (server-side, maks 50 baris).
     */
    public function units(Request $request, Loo $loo)
    {
        $this->authorizeAccess($loo, $request);

        $search = trim((string) $request->query('search'));

        $units = Unit::where('branch_id', $loo->branch_id)
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('unit_code', 'like', "%{$search}%")
                ->orWhere('floor', 'like', "%{$search}%")
                ->orWhere('block', 'like', "%{$search}%")
                ->orWhere('unit_number', 'like', "%{$search}%")))
            ->orderBy('floor')
            ->orderBy('block')
            ->orderBy('unit_number')
            ->limit(50)
            ->get(['id', 'unit_code']);

        return response()->json($units->map(fn ($u) => ['id' => $u->id, 'name' => $u->unit_code])->values());
    }

    public function edit(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($this->headerEditable($loo), 422, 'LOO yang sudah masuk tahap pengukuran ulang tidak bisa diubah.');

        return Inertia::render('Loos/Create', [
            'loo' => $loo,
            'branches' => Branch::orderBy('name')->get(['id', 'name', 'code']),
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'tenants' => Tenant::where('branch_id', $loo->branch_id)->where('is_active', true)->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Loo $loo)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($this->headerEditable($loo), 422, 'LOO yang sudah masuk tahap pengukuran ulang tidak bisa diubah.');

        $loo->update([
            ...$this->validated($request),
            ...$this->storeFiles($request, $loo->only(array_keys($this->fileColumns()))),
        ]);

        return back()->with('success', 'LOO berhasil diperbarui.');
    }

    public function section(Request $request, Loo $loo, string $key)
    {
        $this->authorizeAccess($loo, $request);

        abort_unless(! in_array($loo->status, ['completed', 'cancelled'], true), 422, 'LOO sudah selesai atau dibatalkan.');

        $config = config("loo_sections.{$key}");
        abort_unless($config, 404);

        // Gate pipeline: fase terkunci tidak bisa diisi sampai fase sebelumnya selesai.
        abort_unless(
            $this->progress->isSectionUnlocked($loo, $key),
            422,
            'Section ini masih terkunci. Selesaikan tahap sebelumnya dulu.'
        );

        $current = $loo->sections()->where('section_key', $key)->first();

        // Checklist toko: semua bisa lihat, isi dibatasi per departemen.
        $editableDepts = in_array($key, LooSectionService::FITOUT_CHECKLIST_KEYS, true)
            ? $this->sections->editableFitoutDepartments($request->user())
            : null;

        if ($editableDepts !== null) {
            abort_unless($editableDepts !== [], 403, 'Tidak berwenang mengisi checklist ini.');
            $this->sections->assertFitoutDepartmentsAllowed($request->all(), $config, $current?->data ?? [], $editableDepts);
        } else {
            abort_unless($request->user()->can($config['permission']), 403, 'Tidak berwenang mengisi section ini.');
        }

        $this->sections->validateUploads($request, $config);

        if ($key === 'manajemen_tenant') {
            $this->assertUnitBelongsToBranch($request, $loo);
            $request->validate(['tenant_category_id' => 'nullable|exists:tenant_categories,id']);

            $loo->update([
                'unit_id' => $request->input('unit_id') ?: null,
                'tenant_category_id' => $request->input('tenant_category_id') ?: null,
            ]);
        }

        $data = $this->sections->collect($request->all(), $config, $loo, $current?->data ?? []);

        if ($editableDepts !== null) {
            $data = $this->sections->mergeFitoutDepartments($data, $current?->data ?? [], $editableDepts, $config);
        }

        $section = $this->state->fillSection(
            $loo,
            $key,
            $config['label'],
            $data,
            $request->user(),
            $request->boolean('submit'),
        );

        return back()->with('success', $section->is_submitted
            ? "Section {$config['label']} disubmit."
            : "Section {$config['label']} disimpan.");
    }

    public function transition(Request $request, Loo $loo)
    {
        $this->authorizeAccess($loo, $request);

        $data = $request->validate([
            'status' => 'required|in:cancelled',
            'cancel_reason' => 'required|string|max:1000',
        ]);

        abort_unless($this->canCancel($loo, $request->user()), 403, 'Hanya pembuat LOO atau admin yang bisa membatalkan.');

        $this->state->transition($loo, $data['status'], $request->user(), array_filter([
            'cancel_reason' => $data['cancel_reason'] ?? null,
        ]));

        return back()->with('success', 'Status LOO berhasil diperbarui.');
    }

    public function destroy(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($this->headerEditable($loo), 422, 'Hanya LOO yang masih tahap pengisian divisi yang bisa dihapus.');

        foreach ($this->fileColumns() as $column) {
            if ($loo->{$column}) {
                Storage::disk('local')->delete($loo->{$column});
            }
        }

        $loo->delete();

        return redirect()->route('loos.index')->with('success', 'LOO berhasil dihapus.');
    }

    private function notifyLooViewers(Loo $loo, User $creator): void
    {
        $allBranchRoles = ['manager', 'admin', 'super_admin'];

        $recipients = User::query()
            ->where('id', '!=', $creator->id)
            ->where(fn ($q) => $q
                ->whereHas('roles', fn ($r) => $r->whereHas('permissions', fn ($p) => $p->where('name', 'loos.view')))
                ->orWhereHas('permissions', fn ($p) => $p->where('name', 'loos.view'))
                ->orWhereHas('roles', fn ($r) => $r->where('name', 'super_admin')))
            ->where(fn ($q) => $q
                ->where('branch_id', $loo->branch_id)
                ->orWhereHas('roles', fn ($r) => $r->whereIn('name', $allBranchRoles)))
            ->get();

        foreach ($recipients as $user) {
            $this->notifications->notify(
                $user,
                'LOO Baru: '.$loo->loo_number,
                ($loo->prospective_tenant_name ?: 'Calon tenant').' — menunggu ditindaklanjuti divisi Anda.',
                "/loos/{$loo->id}",
            );
        }
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'tenant_category_id' => 'nullable|exists:tenant_categories,id',
            'prospective_tenant_name' => 'nullable|string|max:255',
            'loo_received_date' => 'nullable|date',
            'loo_distributor' => 'nullable|string|max:255',
            'cover_file' => 'nullable|file|mimes:pdf|max:10240',
            'isi_file' => 'nullable|file|mimes:pdf|max:10240',
            'loo_letter_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'loo_proposal_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $this->assertBranchOwnsTenant($request, $data);

        return collect($data)->except(array_keys($this->fileColumns()))->all();
    }

    /**
     * Guard trust boundary: tenant_id harus cabang yang sama, kecuali user lintas cabang.
     */
    private function assertBranchOwnsTenant(Request $request, array $data): void
    {
        if (empty($data['tenant_id'])) {
            return;
        }

        $tenant = Tenant::find($data['tenant_id']);

        if (! $tenant || $request->user()->canViewAllBranches()) {
            return;
        }

        $mismatch = $tenant->branch_id !== $request->user()->branch_id
            || (int) $data['branch_id'] !== $tenant->branch_id;

        if ($mismatch) {
            throw ValidationException::withMessages([
                'tenant_id' => 'Tenant tidak berada di cabang yang dipilih.',
            ]);
        }
    }

    private function fileColumns(): array
    {
        return [
            'cover_file' => 'cover_file_path',
            'isi_file' => 'isi_file_path',
            'loo_letter_file' => 'loo_letter_file_path',
            'loo_proposal_file' => 'loo_proposal_file_path',
        ];
    }

    private function storeFiles(Request $request, array $current): array
    {
        $paths = [];

        foreach ($this->fileColumns() as $input => $column) {
            if (! $request->hasFile($input)) {
                continue;
            }

            if ($current[$column] ?? null) {
                Storage::disk('local')->delete($current[$column]);
            }

            $dir = str_replace('_file', '', $input);
            $paths[$column] = $request->file($input)->store("loos/{$dir}", 'local');
        }

        return $paths;
    }

    private function accessibleFiles(Loo $loo, User $user): array
    {
        $coverOnly = $user->hasAnyRole(self::COVER_ONLY_ROLES);

        return collect($this->fileColumns())
            ->map(function ($column, $key) use ($loo) {
                $path = $loo->{$column};

                return [
                    'key' => $key,
                    'label' => self::FILE_LABELS[$key],
                    'type' => $path && Str::endsWith(strtolower($path), '.pdf') ? 'pdf' : 'image',
                    // Path relatif: URL absolut dari route() mengikuti APP_URL
                    // (port salah saat dev) dan bikin preview blank.
                    'url' => $path ? "/loos/{$loo->id}/files/{$key}" : null,
                ];
            })
            ->filter(fn ($file) => $file['url'] && (! $coverOnly || $file['key'] === 'cover_file'))
            ->values()
            ->all();
    }

    private function editableSectionKeys(Loo $loo, User $user): array
    {
        if (in_array($loo->status, ['completed', 'cancelled'], true)) {
            return [];
        }

        // Terkunci oleh progres: hanya section fase aktif + fase sebelumnya
        // (yang belum selesai tetap bisa dilengkapi) yang bisa diisi.
        $unlocked = $this->progress->unlockedSectionKeys($loo);

        return collect(config('loo_sections'))
            ->filter(fn ($cfg, $key) => in_array($key, $unlocked, true) && $user->can($cfg['permission']))
            ->keys()
            ->values()
            ->all();
    }

    /**
     * Semua tab divisi selalu terlihat semua role (Legal, Accounting,
     * Tenant Mgmt) agar progress pengisian terpantau — termasuk role
     * tenant/divisi tunggal. Yang dibatasi hanya kemampuan mengisi
     * (canEditSections); tab di luar wewenang tampil read-only.
     */
    private function visibleSectionKeys(Loo $loo, User $user): array
    {
        return ['legalitas', 'biaya_termin', 'manajemen_tenant'];
    }

    /** Header LOO (data umum/file) hanya bisa diubah sebelum pengukuran ulang. */
    private function headerEditable(Loo $loo): bool
    {
        return in_array($loo->status, ['draft', 'pengisian_divisi'], true);
    }

    private function canCancel(Loo $loo, User $user): bool
    {
        return $loo->marketing_id === $user->id || $user->hasAnyRole(['admin', 'super_admin']);
    }

    private function options(array $map): array
    {
        return collect($map)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values()->all();
    }

    private function activeTenants(User $user)
    {
        return Tenant::where('is_active', true)
            ->when(! $user->canViewAllBranches(), fn ($q) => $q->where('branch_id', $user->branch_id))
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function assertUnitBelongsToBranch(Request $request, Loo $loo): void
    {
        if (! $request->filled('unit_id')) {
            return;
        }

        $exists = Unit::where('id', $request->input('unit_id'))
            ->where('branch_id', $loo->branch_id)
            ->exists();

        abort_unless($exists, 422, 'Unit tidak berada di cabang LOO ini.');
    }

    private function authorizeAccess(Loo $loo, Request $request): void
    {
        $user = $request->user();
        abort_unless($loo->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
