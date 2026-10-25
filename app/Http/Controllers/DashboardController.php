<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\Loo;
use App\Models\LooSection;
use App\Models\PermitRequest;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\BranchScopeService;
use App\Services\PermitRequestVisibilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /** Status LOO yang masih berjalan di pipeline — dipakai kartu dashboard. */
    private const LOO_IN_PROGRESS = [
        'draft', 'pengisian_divisi', 'pengukuran_ulang',
        'sebelum_fitout', 'setelah_fitout',
    ];

    public function __construct(
        private BranchScopeService $branchScope,
        private PermitRequestVisibilityService $permitVisibility,
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $branchScoped = ! $user->canViewAllBranches();

        $statsKey = 'dashboard.stats.'.($branchScoped ? 'b'.$user->branch_id : 'all').'.'.$this->permitVisibility->cacheKey($user);
        $cached = Cache::remember($statsKey, 60, function () use ($branchScoped, $user) {
            $totalTenants = Tenant::where('is_active', true)
                ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))->count();
            $totalUnits = Unit::where('is_active', true)
                ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))->count();
            $occupiedUnits = Unit::where('is_active', true)
                ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
                ->whereHas('activeTenancy')->count();
            $pendingPermits = $this->permitVisibility->applyView(
                PermitRequest::where('status', 'pending'),
                $user
            )->count();
            $activeSessions = InspectionSession::where('status', 'in_progress')
                ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))->count();
            $looBase = fn () => Loo::when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id));
            $totalLoos = $looBase()->count();
            $pendingLoos = $looBase()->whereIn('status', self::LOO_IN_PROGRESS)->count();

            return compact('totalTenants', 'totalUnits', 'occupiedUnits', 'pendingPermits', 'activeSessions', 'totalLoos', 'pendingLoos');
        });
        ['totalTenants' => $totalTenants, 'totalUnits' => $totalUnits, 'occupiedUnits' => $occupiedUnits, 'pendingPermits' => $pendingPermits, 'activeSessions' => $activeSessions, 'totalLoos' => $totalLoos, 'pendingLoos' => $pendingLoos] = $cached;

        $actionNeeded = collect();
        if ($user->department_id) {
            $pendingApprovals = Approval::where('department_id', $user->department_id)
                ->where('status', 'pending')
                ->where('approvable_type', PermitRequest::class)
                ->get();

            $permitIds = $pendingApprovals->pluck('approvable_id');

            $permitsQuery = $this->permitVisibility->applyView(
                PermitRequest::whereIn('id', $permitIds),
                $user
            );
            $validPermits = $permitsQuery->get()->keyBy('id');

            $candidateApprovals = $pendingApprovals->filter(
                fn ($a) => $validPermits->has($a->approvable_id)
            );

            $allRelatedApprovals = Approval::whereIn('approvable_id', $permitIds)
                ->where('approvable_type', PermitRequest::class)
                ->get()
                ->groupBy('approvable_id');

            $actionNeeded = $candidateApprovals->filter(function (Approval $approval) use ($allRelatedApprovals) {
                $siblings = $allRelatedApprovals->get($approval->approvable_id, collect());
                $hasPendingEarlier = $siblings->contains(fn ($s) => $s->order < $approval->order && $s->status !== 'approved'
                );

                return ! $hasPendingEarlier;
            })->map(function (Approval $a) use ($validPermits) {
                $permit = $validPermits->get($a->approvable_id);

                return [
                    'id' => $permit->id,
                    'permit_number' => $permit->permit_number,
                    'store_name' => $permit->store_name_snapshot,
                    'step_label' => $a->label,
                    'requested_at' => $permit->created_at,
                ];
            })->sortBy('requested_at')->take(5)->values();
        }

        // Aktivitas terbaru — gabungan 3 sumber
        $recentPermits = $this->permitVisibility->applyView(
            PermitRequest::select(['id', 'permit_number', 'store_name_snapshot', 'status', 'created_at']),
            $user
        )->latest()->take(5)->get()
            ->map(fn ($p) => [
                'type' => 'permit',
                'title' => "Surat Izin {$p->permit_number} — {$p->store_name_snapshot}",
                'status' => $p->status,
                'time' => $p->created_at,
                'url' => "/permit-requests/{$p->id}",
            ]);

        $recentInspections = Inspection::select(['id', 'tenant_id', 'status', 'created_at'])->with('tenant:id,name')
            ->whereHas('session', fn ($q) => $branchScoped ? $q->where('branch_id', $user->branch_id) : $q)
            ->latest()->take(5)->get()
            ->map(fn ($i) => [
                'type' => 'inspection',
                'title' => "Sidak {$i->tenant->name}",
                'status' => $i->status,
                'time' => $i->created_at,
                'url' => "/inspections/{$i->id}",
            ]);

        $recentTenancies = Tenancy::select(['id', 'tenant_id', 'status', 'created_at'])->with('tenant:id,name')
            ->whereHas('unit', fn ($q) => $branchScoped ? $q->where('branch_id', $user->branch_id) : $q)
            ->latest()->take(5)->get()
            ->map(fn ($t) => [
                'type' => 'tenancy',
                'title' => "Kontrak {$t->tenant->name}",
                'status' => $t->status,
                'time' => $t->created_at,
                'url' => '/tenancies',
            ]);

        $recentLoos = Loo::select(['id', 'loo_number', 'prospective_tenant_name', 'status', 'created_at'])
            ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->latest()->take(5)->get()
            ->map(fn ($l) => [
                'type' => 'loo',
                'title' => "LOO {$l->loo_number} — ".($l->prospective_tenant_name ?? 'Tenant prospektif'),
                'status' => $l->status,
                'time' => $l->created_at,
                'url' => "/loos/{$l->id}",
            ]);

        $recentActivity = $recentPermits
            ->concat($recentInspections)
            ->concat($recentTenancies)
            ->concat($recentLoos)
            ->sortByDesc('time')
            ->take(8)
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => [
                'total_tenants' => $totalTenants,
                'occupied_units' => $occupiedUnits,
                'vacant_units' => $totalUnits - $occupiedUnits,
                'pending_permits' => $pendingPermits,
                'active_sessions' => $activeSessions,
                'total_loos' => $totalLoos,
                'pending_loos' => $pendingLoos,
            ],
            'actionNeeded' => $actionNeeded,
            'recentActivity' => $recentActivity,
            'calendar' => $this->calendarEvents($request),
        ]);
    }

    private function calendarEvents(Request $request): array
    {
        $user = $request->user();
        $branchScoped = ! $user->canViewAllBranches();
        $monthInput = (string) $request->input('cal_month', now()->format('Y-m'));
        $key = implode('|', [
            'dashboard.calendar',
            $branchScoped ? 'b'.$user->branch_id : 'all',
            $this->permitVisibility->cacheKey($user),
            $user->can('loos.view') ? 'loo' : 'noloo',
            $monthInput,
        ]);

        return Cache::remember($key, 60, fn () => $this->buildCalendarEvents($request, $monthInput));
    }

    private function buildCalendarEvents(Request $request, string $monthInput): array
    {
        $user = $request->user();
        $branchScoped = ! $user->canViewAllBranches();
        $isMarketingLocked = $this->permitVisibility->isMarketingLocked($user);
        $canViewLoo = $user->can('loos.view');

        try {
            $month = Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth();
        } catch (\Throwable $e) {
            $month = now()->startOfMonth();
        }
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();
        $warnFrom = now()->toDateString();
        $warnTo = now()->addDays(30)->toDateString();

        $permitQuery = $this->permitVisibility->applyView(
            PermitRequest::query()
                ->select(['id', 'permit_number', 'store_name_snapshot', 'activity_types', 'status', 'request_date', 'work_start_date', 'work_end_date', 'branch_id', 'event_name'])
                ->where(fn ($q) => $q
                    ->whereBetween('work_start_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('work_end_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhere(fn ($w) => $w->where('work_start_date', '<=', $start->toDateString())->where(fn ($x) => $x->whereNull('work_end_date')->orWhere('work_end_date', '>=', $end->toDateString())))),
            $user
        )->latest('work_start_date')->limit(200);

        $events = $permitQuery->get()->map(function ($p) {
            $types = $p->activity_types ?? [];
            if (in_array('pameran', $types)) {
                $type = 'pameran';
                $title = "{$p->permit_number} — {$p->store_name_snapshot}";
            } elseif (! empty(array_intersect(['event', 'meeting_internal', 'stock_opname'], $types))) {
                $type = 'kegiatan';
                $kind = in_array('event', $types) ? 'Event' : (in_array('meeting_internal', $types) ? 'Meeting' : 'Stock Opname');
                $title = "{$kind}: {$p->store_name_snapshot}".($p->event_name ? " — {$p->event_name}" : '')." ({$p->permit_number})";
            } else {
                $type = 'permit';
                $title = "{$p->permit_number} — {$p->store_name_snapshot}";
            }

            return [
                'id' => "permit-{$p->id}",
                'type' => $type,
                'title' => $title,
                'start' => ($p->work_start_date ?? $p->request_date)?->toDateString(),
                'end' => ($p->work_end_date ?? $p->work_start_date ?? $p->request_date)?->toDateString(),
                'status' => $p->status,
                'url' => "/permit-requests/{$p->id}",
            ];
        });

        if (! $isMarketingLocked) {
            $tenancies = Tenancy::select(['id', 'tenant_id', 'start_date', 'end_date', 'status'])->with(['tenant:id,name'])
                ->where(fn ($q) => $q
                    ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('end_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhere(fn ($w) => $w->whereBetween('end_date', [$warnFrom, $warnTo])))
                ->when($branchScoped, fn ($q) => $q->whereHas('unit', fn ($u) => $u->where('branch_id', $user->branch_id)))
                ->latest('end_date')
                ->limit(100)
                ->get();

            foreach ($tenancies as $t) {
                $events->push([
                    'id' => "tenancy-start-{$t->id}",
                    'type' => 'contract_start',
                    'title' => "Mulai: {$t->tenant?->name}",
                    'start' => $t->start_date?->toDateString(),
                    'end' => $t->start_date?->toDateString(),
                    'status' => $t->status,
                    'url' => '/tenancies',
                ]);
                $events->push([
                    'id' => "tenancy-end-{$t->id}",
                    'type' => 'contract_end',
                    'title' => "Berakhir: {$t->tenant?->name}",
                    'start' => $t->end_date?->toDateString(),
                    'end' => $t->end_date?->toDateString(),
                    'status' => $t->status,
                    'urgent' => $t->end_date && $t->end_date->toDateString() >= $warnFrom && $t->end_date->toDateString() <= $warnTo,
                    'url' => '/tenancies',
                ]);
            }

            if ($user->can('sidak.view')) {
                $sessions = InspectionSession::select(['id', 'user_id', 'branch_id', 'status', 'started_at', 'creator_name_snapshot'])->with('user:id,name')
                    ->whereDate('started_at', '>=', $start->toDateString())
                    ->whereDate('started_at', '<=', $end->toDateString())
                    ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
                    ->latest('started_at')
                    ->limit(50)
                    ->get();

                foreach ($sessions as $s) {
                    $events->push([
                        'id' => "sidak-{$s->id}",
                        'type' => 'sidak',
                        'title' => 'Sidak '.(($s->creator_name_snapshot ?? $s->user?->name) ? '— '.($s->creator_name_snapshot ?? $s->user?->name) : ''),
                        'start' => $s->started_at?->toDateString(),
                        'end' => $s->started_at?->toDateString(),
                        'status' => $s->status,
                        'url' => "/inspection-sessions/{$s->id}",
                    ]);
                }
            }
        }

        // LOO events
        if ($canViewLoo) {
            $looQuery = Loo::query()
                ->select(['id', 'loo_number', 'prospective_tenant_name', 'status', 'loo_received_date', 'submitted_at', 'completed_at', 'cancelled_at', 'track_expires_at', 'branch_id'])
                ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
                ->where(function ($q) use ($start, $end) {
                    $q->whereBetween('loo_received_date', [$start->toDateString(), $end->toDateString()])
                        ->orWhereBetween('submitted_at', [$start->toDateString(), $end->toDateString()])
                        ->orWhereBetween('completed_at', [$start->toDateString(), $end->toDateString()])
                        ->orWhereBetween('cancelled_at', [$start->toDateString(), $end->toDateString()])
                        ->orWhereBetween('track_expires_at', [$start->toDateString(), $end->toDateString()]);
                })
                ->limit(200)
                ->get();

            foreach ($looQuery as $loo) {
                $tenantName = $loo->prospective_tenant_name ?? 'Tenant prospektif';
                $baseUrl = "/loos/{$loo->id}";

                if ($loo->loo_received_date) {
                    $events->push([
                        'id' => "loo-received-{$loo->id}",
                        'type' => 'loo_received',
                        'title' => "LOO {$loo->loo_number} diterima — {$tenantName}",
                        'start' => $loo->loo_received_date?->toDateString(),
                        'end' => $loo->loo_received_date?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
                if ($loo->submitted_at) {
                    $events->push([
                        'id' => "loo-submitted-{$loo->id}",
                        'type' => 'loo_submitted',
                        'title' => "LOO {$loo->loo_number} disubmit — {$tenantName}",
                        'start' => $loo->submitted_at?->toDateString(),
                        'end' => $loo->submitted_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
                if ($loo->completed_at) {
                    $events->push([
                        'id' => "loo-completed-{$loo->id}",
                        'type' => 'loo_completed',
                        'title' => "LOO {$loo->loo_number} selesai — {$tenantName}",
                        'start' => $loo->completed_at?->toDateString(),
                        'end' => $loo->completed_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
                if ($loo->cancelled_at) {
                    $events->push([
                        'id' => "loo-cancelled-{$loo->id}",
                        'type' => 'loo_cancelled',
                        'title' => "LOO {$loo->loo_number} dibatalkan — {$tenantName}",
                        'start' => $loo->cancelled_at?->toDateString(),
                        'end' => $loo->cancelled_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
                if ($loo->track_expires_at) {
                    $events->push([
                        'id' => "loo-track-expired-{$loo->id}",
                        'type' => 'loo_track_expired',
                        'title' => "Tracking LOO {$loo->loo_number} expired — {$tenantName}",
                        'start' => $loo->track_expires_at?->toDateString(),
                        'end' => $loo->track_expires_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
            }

            // LooSection events (milestone per divisi)
            $sectionKeys = ['legalitas', 'biaya_termin', 'manajemen_tenant', 'pre_handover', 'fitout_checklist_pre', 'fitout_checklist_post'];
            $sections = LooSection::whereIn('section_key', $sectionKeys)
                ->whereHas('loo', function ($q) use ($branchScoped, $user, $start, $end) {
                    $q->when($branchScoped, fn ($qq) => $qq->where('branch_id', $user->branch_id))
                        ->where(function ($qq) use ($start, $end) {
                            $qq->whereBetween('loo_sections.filled_at', [$start->toDateString(), $end->toDateString()])
                                ->orWhereBetween('loo_sections.submitted_at', [$start->toDateString(), $end->toDateString()]);
                        });
                })
                ->with(['loo:id,loo_number,prospective_tenant_name,status'])
                ->limit(300)
                ->get();

            foreach ($sections as $section) {
                $loo = $section->loo;
                if (! $loo) {
                    continue;
                }
                $tenantName = $loo->prospective_tenant_name ?? 'Tenant prospektif';
                $baseUrl = "/loos/{$loo->id}";
                $label = $section->section_label ?? $section->section_key;

                if ($section->filled_at) {
                    $events->push([
                        'id' => "loo-section-filled-{$section->id}",
                        'type' => 'section_filled',
                        'title' => "{$label} diisi — LOO {$loo->loo_number} ({$tenantName})",
                        'start' => $section->filled_at?->toDateString(),
                        'end' => $section->filled_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
                if ($section->submitted_at) {
                    $events->push([
                        'id' => "loo-section-submitted-{$section->id}",
                        'type' => 'section_submitted',
                        'title' => "{$label} disubmit — LOO {$loo->loo_number} ({$tenantName})",
                        'start' => $section->submitted_at?->toDateString(),
                        'end' => $section->submitted_at?->toDateString(),
                        'status' => $loo->status,
                        'url' => $baseUrl,
                    ]);
                }
            }
        }

        return [
            'month' => $month->format('Y-m'),
            'events' => $events->filter(fn ($e) => $e['start'])->sortBy('start')->values()->all(),
        ];
    }
}
