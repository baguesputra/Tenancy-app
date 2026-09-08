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

        // Perlu Tindakan Anda — approval pending yang cocok department user
        $actionNeeded = collect();
        if ($user->department_id) {
            $actionNeeded = Approval::where('department_id', $user->department_id)
                ->where('status', 'pending')
                ->where('approvable_type', PermitRequest::class)
                ->with('approvable')
                ->whereHas('approvable', function ($q) use ($user, $branchScoped) {
                    if ($branchScoped) $q->where('branch_id', $user->branch_id);
                    // hanya tampilkan kalau step sebelumnya sudah selesai (urutan benar)
                })
                ->get()
                ->filter(function (Approval $approval) {
                    $earlierPending = Approval::where('approvable_type', $approval->approvable_type)
                        ->where('approvable_id', $approval->approvable_id)
                        ->where('order', '<', $approval->order)
                        ->where('status', '!=', 'approved')
                        ->exists();
                    return ! $earlierPending;
                })
                ->take(5)
                ->map(fn (Approval $a) => [
                    'id' => $a->approvable->id,
                    'permit_number' => $a->approvable->permit_number,
                    'store_name' => $a->approvable->store_name_snapshot,
                    'step_label' => $a->label,
                ]);
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