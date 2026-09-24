<?php

namespace App\Http\Controllers;

use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
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

        $session->load(['inspections.tenant.productCategory', 'inspections.tenant.activeTenancy.unit']);

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
                'logo_url' => $tenant->logo_url,
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
        abort_if($tenant->branch_id !== $session->branch_id, 422, 'Tenant tidak berada di cabang yang sama dengan sesi ini.');
        abort_if(Inspection::where('inspection_session_id', $session->id)->where('tenant_id', $tenant->id)->exists(), 422, 'Tenant ini sudah ada di sesi ini.');
        try {
            $inspection = $this->inspectionService->addInspection($session, $tenant);
        } catch (ValidationException $e) {
            return back()->withErrors(['tenant_id' => $e->errors()['tenant_id'][0] ?? 'Tenant tidak bisa ditambahkan ke sesi ini.']);
        }

        return redirect()->route('inspections.show', $inspection->id);
    }

    public function scan(InspectionSession $session, Request $request)
    {
        $this->authorizeAccess($session, $request);

        $validated = $request->validate([
            'token' => 'required|string|max:100',
        ]);

        $scannable = ScannableCode::with('scannable')
            ->where('token', trim($validated['token']))
            ->first();

        if (! $scannable || ! $scannable->scannable instanceof Unit) {
            return back()->withErrors(['token' => 'QR tidak dikenal. Pastikan QR unit yang dipindai.']);
        }

        /** @var Unit $unit */
        $unit = $scannable->scannable;
        $unit->loadMissing('activeTenancy.tenant');

        if (! $unit->activeTenancy || ! $unit->activeTenancy->tenant) {
            return back()->withErrors(['token' => "Unit {$unit->unit_code} kosong, tidak ada tenant aktif."]);
        }

        try {
            $inspection = $this->inspectionService->addInspection($session, $unit->activeTenancy->tenant);
        } catch (ValidationException $e) {
            return back()->withErrors(['token' => $e->errors()['tenant_id'][0] ?? 'Tenant tidak bisa ditambahkan ke sesi ini.']);
        }

        return redirect()->route('inspections.show', $inspection->id);
    }

    public function complete(InspectionSession $session, Request $request)
    {
        $this->authorizeAccess($session, $request);
        abort_if($session->status === 'completed', 422, 'Sesi ini sudah selesai.');

        $this->sessionService->markCompleted($session);

        return redirect()->route('sessions.index')->with('success', 'Sesi sidak berhasil diselesaikan.');
    }

    private function authorizeAccess(InspectionSession $session, Request $request): void
    {
        $user = $request->user();
        abort_unless($session->user_id === $user->id || $user->canViewAllBranches(), 403);
    }
}