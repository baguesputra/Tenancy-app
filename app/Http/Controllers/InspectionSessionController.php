<?php

namespace App\Http\Controllers;

use App\Models\InspectionSession;
use App\Models\Tenant;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InspectionSessionController extends Controller
{
    public function __construct(
        private InspectionSessionService $sessionService,
        private InspectionService $inspectionService,
    ) {}

    public function index(Request $request)
    {
        $sessions = $this->sessionService->getSessionsForUser($request->user());

        return Inertia::render('InspectionSessions/Index', [
            'sessions' => $sessions,
        ]);
    }

    public function current(Request $request)
    {
        $session = $this->sessionService->getOrCreateActiveSession($request->user());

        return redirect()->route('sessions.show', $session->id);
    }

    public function show(InspectionSession $session, Request $request)
    {
        $this->authorizeAccess($session, $request);

        $session->load(['inspections.tenant']);

        $addedTenantIds = $session->inspections->pluck('tenant_id');

        $availableTenants = Tenant::with(['tenantCategory', 'productCategory', 'activeTenancy.unit'])
            ->where('branch_id', $session->branch_id)
            ->where('is_active', true)
            ->whereNotIn('id', $addedTenantIds)
            ->orderBy('name')
            ->get()
            ->map(fn ($tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'tenant_category' => $tenant->tenantCategory?->name,
                'product_category' => $tenant->productCategory?->name,
                'unit_code' => $tenant->activeTenancy?->unit?->unit_code,
            ]);

        return Inertia::render('InspectionSessions/Show', [
            'session' => $session,
            'availableTenants' => $availableTenants,
        ]);
    }

    public function addTenant(InspectionSession $session, Request $request)
    {
        $this->authorizeAccess($session, $request);

        $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
        ]);

        $tenant = Tenant::findOrFail($request->tenant_id);
        $inspection = $this->inspectionService->addInspection($session, $tenant);

        return redirect()->route('inspections.show', $inspection->id);
    }

    public function complete(InspectionSession $session, Request $request)
    {
        $this->authorizeAccess($session, $request);

        $this->sessionService->markCompleted($session);

        return redirect()->route('sessions.index')->with('success', 'Sesi sidak berhasil diselesaikan.');
    }

    private function authorizeAccess(InspectionSession $session, Request $request): void
    {
        $user = $request->user();
        abort_unless($session->user_id === $user->id || $user->canViewAllBranches(), 403);
    }
}