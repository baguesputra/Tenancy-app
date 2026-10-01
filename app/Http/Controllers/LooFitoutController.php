<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Loo;
use App\Services\BranchScopeService;
use App\Services\LooSectionService;
use App\Services\LooStateService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LooFitoutController extends Controller
{
    public function __construct(
        private BranchScopeService $branchScope,
        private LooStateService $state,
        private LooSectionService $sections,
    ) {}

    public function index(Request $request)
    {
        $query = Loo::with(['branch:id,name,code', 'tenant:id,name', 'unit:id,unit_code', 'sections:id,loo_id,section_key,is_submitted,data'])
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('loo_number', 'like', "%{$search}%")
                        ->orWhere('prospective_tenant_name', 'like', "%{$search}%")
                        ->orWhereHas('tenant', fn ($t) => $t->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->branch_id, fn ($q, $b) => $q->where('branch_id', $b))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->checklist_stage, function ($q, $stage) {
                if ($stage === 'pre_fitout') {
                    $q->whereIn('current_stage', ['ba_handover', 'fitout']);
                } elseif ($stage === 'post_fitout') {
                    $q->whereIn('current_stage', ['fitout', 'pre_handover']);
                } elseif ($stage === 'pre_handover') {
                    $q->where('current_stage', 'pre_handover');
                }
            });

        $this->branchScope->apply($query, $request->user());

        $summary = [
            'total' => (clone $query)->count(),
            'fitout_active' => (clone $query)->whereIn('current_stage', ['ba_handover', 'fitout', 'pre_handover'])->count(),
            'waiting_gm' => (clone $query)->where('current_stage', 'fitout')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
        ];

        $loos = $query->latest()->paginate(15)->withQueryString()->through(function (Loo $loo) {
            $sections = $loo->sections->keyBy('section_key');
            $pre = $sections->get('fitout_checklist_pre');
            $post = $sections->get('fitout_checklist_post');
            $preHandover = $sections->get('pre_handover');

            $gmApprovedPre = ! empty($pre?->data['footer']['gm_approved']);
            $gmApprovedPost = ! empty($post?->data['footer']['gm_approved']);

            return [
                'id' => $loo->id,
                'loo_number' => $loo->loo_number,
                'tenant_name' => ($loo->tenant ? $loo->tenant->name : null) ?? $loo->prospective_tenant_name ?? '—',
                'branch' => $loo->branch ? ['id' => $loo->branch->id, 'name' => $loo->branch->name, 'code' => $loo->branch->code] : null,
                'unit_code' => $loo->unit ? $loo->unit->unit_code : '—',
                'status' => $loo->status,
                'current_stage' => $loo->current_stage,
                'checklist_pre' => [
                    'exists' => (bool) $pre,
                    'is_submitted' => (bool) $pre?->is_submitted,
                    'gm_approved' => $gmApprovedPre,
                ],
                'checklist_post' => [
                    'exists' => (bool) $post,
                    'is_submitted' => (bool) $post?->is_submitted,
                    'gm_approved' => $gmApprovedPost,
                ],
                'pre_handover' => [
                    'exists' => (bool) $preHandover,
                    'is_submitted' => (bool) $preHandover?->is_submitted,
                ],
                'created_at' => $loo->created_at?->format('d/m/Y'),
            ];
        });

        $branches = Branch::orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('Loos/Fitout/Index', [
            'loos' => $loos,
            'summary' => $summary,
            'branches' => $branches,
            'filters' => $request->only(['search', 'branch_id', 'status', 'checklist_stage']),
        ]);
    }

    public function show(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        $loo->load(['branch', 'tenant', 'unit', 'sections.filler', 'history.user']);

        $preSection = $loo->sections()->where('section_key', 'fitout_checklist_pre')->first();
        $postSection = $loo->sections()->where('section_key', 'fitout_checklist_post')->first();
        $preHandoverSection = $loo->sections()->where('section_key', 'pre_handover')->first();

        $preConfig = config('loo_sections.fitout_checklist_pre');
        $postConfig = config('loo_sections.fitout_checklist_post');
        $preHandoverConfig = config('loo_sections.pre_handover');

        return Inertia::render('Loos/FitoutChecklist', [
            'loo' => $loo,
            'preSection' => $preSection,
            'postSection' => $postSection,
            'preHandoverSection' => $preHandoverSection,
            'preConfig' => $preConfig,
            'postConfig' => $postConfig,
            'preHandoverConfig' => $preHandoverConfig,
            'canEditPre' => $request->user()->can('loos.tenant_mgmt_edit') && $this->stageReached($loo, 'ba_handover'),
            'canEditPost' => $request->user()->can('loos.tenant_mgmt_edit') && $this->stageReached($loo, 'fitout'),
            'canEditPreHandover' => $request->user()->can('loos.tenant_mgmt_edit') && $this->stageReached($loo, 'pre_handover'),
            'canGmAcknowledge' => $request->user()->can('loos.fitout_approve'),
        ]);
    }

    public function acknowledgeGm(Loo $loo, Request $request)
    {
        $this->authorizeAccess($loo, $request);
        abort_unless($request->user()->can('loos.fitout_approve'), 403, 'Hanya Deputy GM yang bisa approve.');

        $sectionKey = $loo->current_stage === 'fitout' ? 'fitout_checklist_post' : 'fitout_checklist_pre';
        $configKey = "loo_sections.{$sectionKey}";
        $config = config($configKey);
        abort_unless($config, 404);

        $current = $loo->sections()->where('section_key', $sectionKey)->first();
        $data = $current?->data ?? [];

        $data['footer']['gm_name'] = $request->user()->name;
        $data['footer']['gm_approved'] = true;
        $data['footer']['gm_approved_at'] = now()->toIso8601String();
        $data['footer']['gm_approved_by'] = $request->user()->id;

        $this->state->fillSection(
            $loo,
            $sectionKey,
            $config['label'],
            $data,
            $request->user(),
            true
        );

        return back()->with('success', 'Checklist Fitout berhasil disetujui Deputy GM.');
    }

    private function authorizeAccess(Loo $loo, Request $request): void
    {
        $user = $request->user();
        abort_unless($loo->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }

    private function stageReached(Loo $loo, string $minStage): bool
    {
        if (in_array($loo->status, ['completed', 'cancelled'], true)) {
            return true;
        }

        $stages = ['marketing', 'legal', 'accounting', 'tenant_mgmt', 'measurement', 'ba_handover', 'fitout', 'pre_handover'];
        return array_search($loo->current_stage, $stages, true) >= array_search($minStage, $stages, true);
    }
}
