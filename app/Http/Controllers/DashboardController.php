<?php

namespace App\Http\Controllers;

use App\Models\Approval;
use App\Models\Inspection;
use App\Models\PermitRequest;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
        if ($branchScoped) $tenantQuery->where('branch_id', $user->branch_id);
        $totalTenants = $tenantQuery->count();

        $unitQuery = Unit::where('is_active', true);
        if ($branchScoped) $unitQuery->where('branch_id', $user->branch_id);
        $totalUnits = (clone $unitQuery)->count();
        $occupiedUnits = (clone $unitQuery)->whereHas('activeTenancy')->count();

        $permitQuery = PermitRequest::where('status', 'pending');
        if ($branchScoped) $permitQuery->where('branch_id', $user->branch_id);
        $pendingPermits = (clone $permitQuery)->count();

        $sessionQuery = \App\Models\InspectionSession::where('status', 'in_progress');
        if ($branchScoped) $sessionQuery->where('branch_id', $user->branch_id);
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
                $hasPendingEarlier = $siblings->contains(fn ($s) =>
                    $s->order < $approval->order && $s->status !== 'approved'
                );
                return ! $hasPendingEarlier;
            })->take(5)->map(function (Approval $a) use ($validPermits) {
                $permit = $validPermits->get($a->approvable_id);
                return [
                    'id' => $permit->id,
                    'permit_number' => $permit->permit_number,
                    'store_name' => $permit->store_name_snapshot,
                    'step_label' => $a->label,
                ];
            });
        }

        // Aktivitas terbaru — gabungan 3 sumber
        $recentPermits = PermitRequest::when($branchScoped, fn ($q) => $q->where('branch_id', $user->branch_id))
            ->latest()->take(5)->get()
            ->map(fn ($p) => [
                'type' => 'permit',
                'title' => "Surat Izin {$p->permit_number} — {$p->store_name_snapshot}",
                'status' => $p->status,
                'time' => $p->created_at,
                'url' => "/permit-requests/{$p->id}",
            ]);

        $recentInspections = Inspection::with('tenant')
            ->whereHas('session', fn ($q) => $branchScoped ? $q->where('branch_id', $user->branch_id) : $q)
            ->latest()->take(5)->get()
            ->map(fn ($i) => [
                'type' => 'inspection',
                'title' => "Sidak {$i->tenant->name}",
                'status' => $i->status,
                'time' => $i->created_at,
                'url' => "/inspections/{$i->id}",
            ]);

        $recentTenancies = Tenancy::with('tenant')
            ->whereHas('unit', fn ($q) => $branchScoped ? $q->where('branch_id', $user->branch_id) : $q)
            ->latest()->take(5)->get()
            ->map(fn ($t) => [
                'type' => 'tenancy',
                'title' => "Kontrak {$t->tenant->name}",
                'status' => $t->status,
                'time' => $t->created_at,
                'url' => "/tenancies",
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
        ]);
    }
}