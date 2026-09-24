<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\PermitRequest;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\BranchScopeService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $branchScoped = ! $user->canViewAllBranches();

        // Stats
        $tenantQuery = Tenant::where('is_active', true);
        if ($branchScoped) {
            $tenantQuery->where('branch_id', $user->branch_id);
        }
        $totalTenants = $tenantQuery->count();

        $unitQuery = Unit::where('is_active', true);
        if ($branchScoped) {
            $unitQuery->where('branch_id', $user->branch_id);
        }
        $totalUnits = (clone $unitQuery)->count();
        $occupiedUnits = (clone $unitQuery)->whereHas('activeTenancy')->count();

        $permitQuery = PermitRequest::where('status', 'pending');
        if ($branchScoped) {
            $permitQuery->where('branch_id', $user->branch_id);
        }
        $pendingPermits = (clone $permitQuery)->count();

        $sessionQuery = InspectionSession::where('status', 'in_progress');
        if ($branchScoped) {
            $sessionQuery->where('branch_id', $user->branch_id);
        }
        $activeSessions = $sessionQuery->count();

        $actionNeeded = collect();
        if ($user->department_id) {
            $pendingApprovals = Approval::where('department_id', $user->department_id)
                ->where('status', 'pending')
                ->where('approvable_type', PermitRequest::class)
                ->get();

            $permitIds = $pendingApprovals->pluck('approvable_id');

            $permitsQuery = PermitRequest::whereIn('id', $permitIds);
            if ($branchScoped) {
                $permitsQuery->where('branch_id', $user->branch_id);
            }
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
        $recentPermits = PermitRequest::select(['id', 'permit_number', 'store_name_snapshot', 'status', 'created_at'])
            ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->latest()->take(5)->get()
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

        $recentActivity = $recentPermits
            ->concat($recentInspections)
            ->concat($recentTenancies)
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
        $isMarketing = $user->hasRole('marketing_staff');

        try {
            $month = Carbon::createFromFormat('Y-m', (string) $request->input('cal_month', now()->format('Y-m')))->startOfMonth();
        } catch (\Throwable $e) {
            $month = now()->startOfMonth();
        }
        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();
        $warnFrom = now()->toDateString();
        $warnTo = now()->addDays(30)->toDateString();

        $permitQuery = PermitRequest::query()
            ->select(['id', 'permit_number', 'store_name_snapshot', 'activity_types', 'status', 'request_date', 'work_start_date', 'work_end_date', 'branch_id'])
            ->where(fn ($q) => $q
                ->whereBetween('work_start_date', [$start->toDateString(), $end->toDateString()])
                ->orWhereBetween('work_end_date', [$start->toDateString(), $end->toDateString()])
                ->orWhere(fn ($w) => $w->where('work_start_date', '<=', $start->toDateString())->where(fn ($x) => $x->whereNull('work_end_date')->orWhere('work_end_date', '>=', $end->toDateString()))))
            ->when($isMarketing, fn ($q) => $q->where('activity_types', 'like', '%pameran%'))
            ->when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->latest('work_start_date')
            ->limit(200);

        $events = $permitQuery->get()->map(fn ($p) => [
            'id' => "permit-{$p->id}",
            'type' => in_array('pameran', $p->activity_types ?? []) ? 'pameran' : 'permit',
            'title' => "{$p->permit_number} — {$p->store_name_snapshot}",
            'start' => ($p->work_start_date ?? $p->request_date)?->toDateString(),
            'end' => ($p->work_end_date ?? $p->work_start_date ?? $p->request_date)?->toDateString(),
            'status' => $p->status,
            'url' => "/permit-requests/{$p->id}",
        ]);

        if (! $isMarketing) {
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
                $sessions = InspectionSession::select(['id', 'user_id', 'branch_id', 'status', 'started_at'])->with('user:id,name')
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
                        'title' => 'Sidak '.($s->user?->name ? "— {$s->user->name}" : ''),
                        'start' => $s->started_at?->toDateString(),
                        'end' => $s->started_at?->toDateString(),
                        'status' => $s->status,
                        'url' => "/inspection-sessions/{$s->id}",
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
