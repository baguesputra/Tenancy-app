<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\User;
use App\Services\BranchScopeService;
use App\Services\LooSectionService;
use App\Services\LooStateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LooController extends Controller
{
    public function __construct(
        private BranchScopeService $branchScope,
        private LooStateService $state,
        private LooSectionService $sections,
    ) {}

    private const STATUSES = [
        'draft' => 'Draft',
        'legal_review' => 'Legal Review',
        'accounting_review' => 'Accounting Review',
        'tenant_mgmt_review' => 'Tenant Mgmt Review',
        'measurement' => 'Measurement',
        'ba_handover' => 'BA Handover',
        'fitout' => 'Fitout',
        'pre_handover' => 'Pre-Handover',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];

    private const STAGES = [
        'marketing' => 'Marketing',
        'legal' => 'Legal',
        'accounting' => 'Accounting',
        'tenant_mgmt' => 'Tenant Mgmt',
        'measurement' => 'Measurement',
        'ba_handover' => 'BA Handover',
        'fitout' => 'Fitout',
        'pre_handover' => 'Pre-Handover',
    ];

    public function index(Request $request)
    {
        $query = Loo::with(['branch:id,name', 'tenant:id,name', 'tenantCategory:id,name', 'marketing:id,name'])
            ->when($request->search, fn ($q) => $q->where('loo_number', 'like', "%{$request->search}%")
                ->orWhere('prospective_tenant_name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->current_stage, fn ($q) => $q->where('current_stage', $request->current_stage))
            ->latest();

        $this->branchScope->apply($query, $request->user());

        $summary = (clone $query)
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(status = "draft") as draft')
            ->selectRaw('sum(status = "legal_review") as legal_review')
            ->selectRaw('sum(status = "accounting_review") as accounting_review')
            ->selectRaw('sum(status = "measurement") as measurement')
            ->selectRaw('sum(status = "fitout") as fitout')
            ->selectRaw('sum(status = "completed") as completed')
            ->first()
            ->only(array_keys(self::STATUSES));

        return Inertia::render('Loos/Index', [
            'loos' => $query->paginate(15)->withQueryString(),
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

        return redirect()->route('loos.show', $loo->id)->with('success', 'LOO berhasil dibuat.');
    }

    public function show(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        $loo->load(['branch', 'tenant', 'tenantCategory', 'marketing', 'sections.filler', 'history.user']);

        return Inertia::render('Loos/Show', [
            'loo' => $loo,
            'sectionConfigs' => config('loo_sections'),
            'canEditSections' => $this->editableSectionKeys($loo, $request->user()),
            'canEditLoo' => $request->user()->can('loos.create'),
            'canCancel' => $this->canCancel($loo, $request->user()),
            'transitions' => $this->allowedTransitions($loo),
            'options' => ['productCategories' => ProductCategory::orderBy('name')->get(['id', 'name'])],
        ]);
    }

    public function edit(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($loo->status === 'draft', 422, 'LOO yang sudah tidak draft tidak bisa diubah.');

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
        abort_unless($loo->status === 'draft', 422, 'LOO yang sudah tidak draft tidak bisa diubah.');

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
        abort_unless($request->user()->can($config['permission']), 403, 'Tidak berwenang mengisi section ini.');

        $current = $loo->sections()->where('section_key', $key)->first();
        $data = $this->sections->collect($request->all(), $config, $loo, $current?->data ?? []);

        $section = $this->state->fillSection(
            $loo,
            $key,
            $config['label'],
            $data,
            $request->user(),
            $request->boolean('submit'),
        );

        if ($request->boolean('submit')) {
            $next = $this->nextStatusIfStageComplete($loo, $config, $request->user());
            if ($next) {
                $this->state->transition($loo, $next, $request->user());
            }
        }

        return back()->with('success', $section->is_submitted
            ? "Section {$config['label']} disubmit."
            : "Section {$config['label']} disimpan.");
    }

    public function transition(Request $request, Loo $loo)
    {
        $this->authorizeAccess($loo, $request);

        $data = $request->validate([
            'status' => 'required|in:'.implode(',', array_keys(self::STATUSES)),
            'cancel_reason' => 'nullable|string|max:1000',
        ]);

        if ($data['status'] === 'cancelled') {
            $request->validate(['cancel_reason' => 'required|string|max:1000']);
            abort_unless($this->canCancel($loo, $request->user()), 403, 'Hanya pembuat LOO atau admin yang bisa membatalkan.');
        } else {
            $this->assertCanTransition($loo, $data['status'], $request->user());
        }

        $this->state->transition($loo, $data['status'], $request->user(), array_filter([
            'cancel_reason' => $data['cancel_reason'] ?? null,
        ]));

        return back()->with('success', 'Status LOO berhasil diperbarui.');
    }

    public function destroy(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($loo->status === 'draft', 422, 'Hanya LOO draft yang bisa dihapus.');

        foreach ($this->fileColumns() as $column) {
            if ($loo->{$column}) {
                Storage::disk('public')->delete($loo->{$column});
            }
        }

        $loo->delete();

        return redirect()->route('loos.index')->with('success', 'LOO berhasil dihapus.');
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
                Storage::disk('public')->delete($current[$column]);
            }

            $dir = str_replace('_file', '', $input);
            $paths[$column] = $request->file($input)->store("loos/{$dir}", 'public');
        }

        return $paths;
    }

    private function editableSectionKeys(Loo $loo, User $user): array
    {
        if (in_array($loo->status, ['completed', 'cancelled'], true)) {
            return [];
        }

        return collect(config('loo_sections'))
            ->filter(fn ($cfg) => $user->can($cfg['permission']))
            ->keys()
            ->values()
            ->all();
    }

    private function allowedTransitions(Loo $loo): array
    {
        $user = request()->user();
        $required = config("loo.transition_permission.{$loo->status}");

        if (! $required || ! $user->can($required)) {
            return [];
        }

        $forward = $this->nextStatusFor($loo);

        return collect(config("loo.transitions.{$loo->status}") ?? [])
            ->reject(fn ($to) => $to === 'cancelled')
            ->filter(fn ($to) => $to !== $forward || $this->stageSectionsSubmitted($loo))
            ->map(fn ($to) => ['value' => $to, 'label' => self::STATUSES[$to]])
            ->values()
            ->all();
    }

    /**
     * Server-side guard: transisi hanya oleh divisi pemegang status saat ini.
     * Forward wajib SEMUA section stage aktif sudah disubmit — legal harus
     * selesai sebelum accounting bisa maju, walau accounting isi duluan.
     */
    private function assertCanTransition(Loo $loo, string $to, User $user): void
    {
        $required = config("loo.transition_permission.{$loo->status}");

        if ($required) {
            abort_unless($user->can($required), 403, 'Bukan wewenang divisi Anda untuk stage ini.');
        }

        if ($to === $this->nextStatusFor($loo)) {
            abort_unless($this->stageSectionsSubmitted($loo), 422, 'Section stage ini belum disubmit semua.');
        }
    }

    /**
     * Auto-forward setelah submit section: hanya jika section memang milik
     * stage aktif, semua section stage sudah disubmit, dan actor pemegang
     * otoritas stage — paralel mengisi tidak pernah melompatkan status.
     */
    private function nextStatusIfStageComplete(Loo $loo, array $config, User $user): ?string
    {
        $required = config("loo.transition_permission.{$loo->status}");

        if ($config['stage'] !== $loo->current_stage || ! $required || ! $user->can($required)) {
            return null;
        }

        return $this->stageSectionsSubmitted($loo) ? $this->nextStatusFor($loo) : null;
    }

    private function stageSectionsSubmitted(Loo $loo): bool
    {
        $keys = collect(config('loo_sections'))
            ->filter(fn ($cfg) => $cfg['stage'] === $loo->current_stage)
            ->keys();

        return $keys->every(fn ($key) => (bool) $loo->sections()->where('section_key', $key)->value('is_submitted'));
    }

    private function canCancel(Loo $loo, User $user): bool
    {
        return $loo->marketing_id === $user->id || $user->hasAnyRole(['admin', 'super_admin']);
    }

    /**
     * Submit section = LOO maju ke stage berikutnya. Forward transition selalu
     * ditulis pertama di config, jadi ambil entri pertama tanpa `cancelled`.
     */
    private function nextStatusFor(Loo $loo): ?string
    {
        $forward = collect(config("loo.transitions.{$loo->status}") ?? [])
            ->reject(fn ($to) => $to === 'cancelled')
            ->first();

        return $forward;
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

    private function authorizeAccess(Loo $loo, Request $request): void
    {
        $user = $request->user();
        abort_unless($loo->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
