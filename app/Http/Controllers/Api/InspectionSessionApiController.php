<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\InspectionService;
use App\Services\InspectionSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InspectionSessionApiController extends Controller
{
    public function __construct(
        private InspectionSessionService $sessionService,
        private InspectionService $inspectionService,
    ) {}

    public function current(Request $request): JsonResponse
    {
        $session = InspectionSession::where('user_id', $request->user()->id)
            ->where('status', 'in_progress')
            ->latest('started_at')
            ->first();

        return response()->json([
            'session' => $session ? $this->sessionPayload($session) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'exists:users,id',
            'notes' => 'nullable|string|max:1000',
        ], [
            'participant_ids.required' => 'Pilih minimal 1 peserta sidak.',
            'participant_ids.min' => 'Pilih minimal 1 peserta sidak.',
        ]);

        $session = $this->sessionService->createSession(
            $request->user(),
            $validated['participant_ids'],
            $validated['notes'] ?? null
        );

        return response()->json(['session' => $this->sessionPayload($session)], 201);
    }

    public function show(InspectionSession $session, Request $request): JsonResponse
    {
        $this->authorizeAccess($session, $request);

        return response()->json(['session' => $this->sessionPayload($session)]);
    }

    public function scan(InspectionSession $session, Request $request): JsonResponse
    {
        $this->authorizeAccess($session, $request);

        $validated = $request->validate(['token' => 'required|string|max:100']);

        $scannable = ScannableCode::with('scannable')->where('token', trim($validated['token']))->first();

        if (! $scannable || ! $scannable->scannable instanceof Unit) {
            throw ValidationException::withMessages(['token' => 'QR tidak dikenal. Pastikan QR unit yang dipindai.']);
        }

        /** @var Unit $unit */
        $unit = $scannable->scannable;
        $unit->loadMissing('activeTenancy.tenant');

        if (! $unit->activeTenancy || ! $unit->activeTenancy->tenant) {
            throw ValidationException::withMessages(['token' => "Unit {$unit->unit_code} kosong, tidak ada tenant aktif."]);
        }

        $tenant = $unit->activeTenancy->tenant;
        $other = $this->inspectionService->findOtherOngoingInspection($request->user(), $tenant);
        if ($other) {
            $name = $other->session->user->name ?? 'inspector lain';
            throw ValidationException::withMessages(['token' => "Tenant {$tenant->name} sedang disidak {$name}."]);
        }

        $inspection = $this->inspectionService->addInspection($session, $tenant);

        return response()->json(['inspection' => $this->inspectionPayload($inspection)], 201);
    }

    public function addTenant(InspectionSession $session, Request $request): JsonResponse
    {
        $this->authorizeAccess($session, $request);

        $validated = $request->validate(['tenant_id' => 'required|exists:tenants,id']);
        $tenant = Tenant::findOrFail($validated['tenant_id']);

        $other = $this->inspectionService->findOtherOngoingInspection($request->user(), $tenant);
        if ($other) {
            $name = $other->session->user->name ?? 'inspector lain';
            throw ValidationException::withMessages(['tenant_id' => "Tenant {$tenant->name} sedang disidak {$name}."]);
        }

        $inspection = $this->inspectionService->addInspection($session, $tenant);

        return response()->json(['inspection' => $this->inspectionPayload($inspection)], 201);
    }

    public function complete(InspectionSession $session, Request $request): JsonResponse
    {
        $this->authorizeAccess($session, $request);
        abort_if($session->status === 'completed', 422, 'Sesi ini sudah selesai.');

        $this->sessionService->markCompleted($session);

        return response()->json(['session' => $this->sessionPayload($session->refresh())]);
    }

    private function authorizeAccess(InspectionSession $session, Request $request): void
    {
        $user = $request->user();
        abort_unless($session->user_id === $user->id || $user->canViewAllBranches(), 403);
    }

    private function sessionPayload(InspectionSession $session): array
    {
        $session->load([
            'participants:id,inspection_session_id,name_snapshot,department_name_snapshot',
            'inspections:id,inspection_session_id,tenant_id,status,is_flagged,completed_at',
            'inspections.tenant:id,name',
        ]);

        return [
            'id' => $session->id,
            'status' => $session->status,
            'started_at' => $session->started_at,
            'ended_at' => $session->ended_at,
            'notes' => $session->notes,
            'participants' => $session->participants->map(fn ($p) => [
                'name' => $p->name_snapshot,
                'department' => $p->department_name_snapshot,
            ])->values(),
            'inspections' => $session->inspections->map(fn ($i) => [
                'id' => $i->id,
                'status' => $i->status,
                'is_flagged' => (bool) $i->is_flagged,
                'tenant' => ['id' => $i->tenant_id, 'name' => $i->tenant?->name],
            ])->values(),
        ];
    }

    private function inspectionPayload(Inspection $inspection): array
    {
        $inspection->loadMissing('tenant:id,name');

        return [
            'id' => $inspection->id,
            'status' => $inspection->status,
            'session_id' => $inspection->inspection_session_id,
            'tenant' => ['id' => $inspection->tenant_id, 'name' => $inspection->tenant?->name],
        ];
    }
}
