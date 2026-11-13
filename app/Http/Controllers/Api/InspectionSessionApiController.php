<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use App\Models\InspectionSession;
use App\Models\ScannableCode;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
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

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->sessionService->getSessionsForUser($request->user());

        return response()->json([
            'sessions' => $paginator->getCollection()
                ->map(fn (InspectionSession $session) => $this->sessionPayload($session))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function staffOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        $staff = User::where('branch_id', $user->branch_id)
            ->where('is_active', true)
            ->where('id', '!=', $user->id)
            ->whereHas('department', fn ($q) => $q->whereIn('name', InspectionSessionService::PARTICIPANT_DEPARTMENTS))
            ->with('department:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'department_id']);

        $staffByDepartment = collect(InspectionSessionService::PARTICIPANT_DEPARTMENTS)
            ->mapWithKeys(fn ($dept) => [$dept => $staff
                ->where('department.name', $dept)
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
                ->values()
                ->all()])
            ->all();

        return response()->json(['staffByDepartment' => $staffByDepartment]);
    }

    public function tenants(Request $request): JsonResponse
    {
        $tenants = Tenant::select(['id', 'name', 'logo_path', 'tenant_category_id', 'product_category_id'])
            ->with([
                'tenantCategory:id,name',
                'productCategory:id,name',
                'activeTenancy:id,tenant_id,unit_id',
                'activeTenancy.unit:id,unit_code,floor',
            ])
            ->where('branch_id', $request->user()->branch_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'logo_url' => $tenant->logo_url,
                'tenant_category' => $tenant->tenantCategory?->name,
                'product_category' => $tenant->productCategory?->name,
                'unit_code' => $tenant->activeTenancy?->unit?->unit_code,
                'floor' => $tenant->activeTenancy?->unit?->floor,
            ])
            ->values();

        return response()->json(['tenants' => $tenants]);
    }

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

    public function updateParticipants(InspectionSession $session, Request $request): JsonResponse
    {
        $this->authorizeAccess($session, $request);

        $validated = $request->validate([
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'exists:users,id',
        ], [
            'participant_ids.required' => 'Pilih minimal 1 peserta sidak.',
            'participant_ids.min' => 'Pilih minimal 1 peserta sidak.',
        ]);

        $this->sessionService->syncParticipants($session, $validated['participant_ids']);

        return response()->json(['session' => $this->sessionPayload($session->refresh())]);
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
            'branch:id,name',
            'user:id,name,photo_url',
            'participants:id,inspection_session_id,user_id,name_snapshot,department_name_snapshot',
            'participants.user:id,photo_url',
            'inspections:id,inspection_session_id,tenant_id,status,is_flagged,completed_at',
            'inspections.tenant:id,name,logo_path,product_category_id',
            'inspections.tenant.productCategory:id,name',
            'inspections.tenant.activeTenancy:id,tenant_id,unit_id',
            'inspections.tenant.activeTenancy.unit:id,unit_code,floor',
        ]);

        return [
            'id' => $session->id,
            'status' => $session->status,
            'started_at' => $session->started_at,
            'ended_at' => $session->ended_at,
            'notes' => $session->notes,
            'creator_name' => $session->creator_name_snapshot ?? $session->user?->name,
            'pic_name' => $session->pic_name,
            'branch_name' => $session->branch?->name,
            'participants' => $session->participants->map(fn ($p) => [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'name' => $p->name_snapshot,
                'department' => $p->department_name_snapshot,
                'photo_url' => $p->user?->photo_url,
            ])->values(),
            'inspections' => $session->inspections->map(fn ($i) => [
                'id' => $i->id,
                'status' => $i->status,
                'is_flagged' => (bool) $i->is_flagged,
                'completed_at' => $i->completed_at,
                'tenant' => [
                    'id' => $i->tenant_id,
                    'name' => $i->tenant?->name,
                    'logo_url' => $i->tenant?->logo_url,
                    'product_category' => $i->tenant?->productCategory?->name,
                    'unit_code' => $i->tenant?->activeTenancy?->unit?->unit_code,
                    'floor' => $i->tenant?->activeTenancy?->unit?->floor,
                ],
            ])->values(),
        ];
    }

    private function inspectionPayload(Inspection $inspection): array
    {
        $inspection->loadMissing([
            'tenant:id,name,logo_path,product_category_id',
            'tenant.productCategory:id,name',
            'tenant.activeTenancy:id,tenant_id,unit_id',
            'tenant.activeTenancy.unit:id,unit_code,floor',
        ]);

        return [
            'id' => $inspection->id,
            'status' => $inspection->status,
            'is_flagged' => (bool) $inspection->is_flagged,
            'completed_at' => $inspection->completed_at,
            'session_id' => $inspection->inspection_session_id,
            'tenant' => [
                'id' => $inspection->tenant_id,
                'name' => $inspection->tenant?->name,
                'logo_url' => $inspection->tenant?->logo_url,
                'product_category' => $inspection->tenant?->productCategory?->name,
                'unit_code' => $inspection->tenant?->activeTenancy?->unit?->unit_code,
                'floor' => $inspection->tenant?->activeTenancy?->unit?->floor,
            ],
        ];
    }
}
