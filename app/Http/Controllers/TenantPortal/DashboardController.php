<?php

namespace App\Http\Controllers\TenantPortal;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use App\Models\PermitRequest;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $tenantUser = $request->user('tenant');
        $tenant = Tenant::select(['id', 'name', 'logo_path', 'branch_id'])
            ->with(['activeTenancy:id,tenant_id,unit_id,end_date', 'activeTenancy.unit:id,unit_code', 'branch:id,name'])
            ->findOrFail($tenantUser->tenant_id);

        $base = PermitRequest::select(['id', 'tenant_id', 'permit_number', 'status', 'job_type', 'request_date'])
            ->with(['approvals' => fn ($q) => $q->select(['id', 'approvable_id', 'status', 'label', 'order'])->orderBy('order')])
            ->where('tenant_id', $tenant->id);

        $stats = Cache::remember('portal.stats.'.$tenant->id, 60, fn () => [
            'pending' => (clone $base)->where('status', 'pending')->count(),
            'completed' => (clone $base)->where('status', 'completed')->count(),
            'rejected' => (clone $base)->where('status', 'rejected')->count(),
        ]);
        $stats['total'] = array_sum($stats);

        $mapPermit = function ($permit) {
            $current = $permit->approvals->firstWhere('status', 'pending');

            return [
                'id' => $permit->id,
                'permit_number' => $permit->permit_number,
                'status' => $permit->status,
                'job_type' => $permit->job_type,
                'request_date' => $permit->request_date,
                'current_step_label' => $current?->label,
                'step_progress' => $permit->approvals->map(fn ($a) => [
                    'status' => $a->status,
                    'label' => $a->label,
                ])->values(),
            ];
        };

        $activePermit = (clone $base)->where('status', 'pending')->latest()->first();
        $recent = (clone $base)->latest()->take(5)->get()->map($mapPermit)->values();
        $tenancy = $tenant->activeTenancy;

        $sidakBase = Inspection::select(['id', 'tenant_id', 'inspection_session_id', 'checklist_snapshot', 'status', 'is_flagged'])
            ->with('session:id,status,started_at')->where('tenant_id', $tenant->id);
        $sidakActive = (clone $sidakBase)->whereHas('session', fn ($s) => $s->where('status', 'in_progress'))->exists();
        $sidakRecent = (clone $sidakBase)
            ->where(function ($q) {
                $q->where('status', 'completed')
                    ->orWhereHas('session', fn ($s) => $s->where('status', 'completed'));
            })
            ->latest()
            ->take(3)
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'template_name' => $i->checklist_snapshot['template_name'] ?? '—',
                'status' => $i->status,
                'is_flagged' => $i->is_flagged,
                'session_status' => $i->session->status,
                'session_started_at' => $i->session->started_at?->toDateTimeString(),
            ])
            ->values();

        return Inertia::render('TenantPortal/Dashboard', [
            'store' => [
                'name' => $tenant->name,
                'logo_url' => $tenant->logo_url,
                'unit_code' => $tenancy?->unit?->unit_code,
                'branch' => $tenant->branch?->name,
                'tenancy_end' => $tenancy?->end_date?->toDateString(),
                'is_active' => (bool) $tenancy,
            ],
            'stats' => $stats,
            'activePermit' => $activePermit ? $mapPermit($activePermit) : null,
            'recent' => $recent,
            'sidak_active' => $sidakActive,
            'sidak_recent' => $sidakRecent,
        ]);
    }
}
