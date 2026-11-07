<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Unit;
use App\Models\UnitAssignment;
use App\Models\UnitGroup;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class UnitController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $base = Unit::with([
            'branch',
            'activeTenancy.tenant',
            'activeAssignment.department',
            'assignments.department',
            'group.activeTenancy',
            'scannableCode',
        ])
            ->when($request->search, fn ($q) => $q->where(function ($qq) use ($request) {
                $term = "%{$request->search}%";

                $qq->where('unit_code', 'like', $term)
                    ->orWhere('floor', 'like', $term)
                    ->orWhere('block', 'like', $term)
                    ->orWhere('unit_number', 'like', $term)
                    ->orWhereHas('activeTenancy.tenant', fn ($t) => $t
                        ->where('name', 'like', $term)
                        ->orWhere('trade_name', 'like', $term))
                    ->orWhereHas('group.activeTenancy.tenant', fn ($t) => $t
                        ->where('name', 'like', $term)
                        ->orWhere('trade_name', 'like', $term));
            }));

        $this->branchScope->apply($base, $request->user());
        $filterBase = Unit::query();
        $this->branchScope->apply($filterBase, $request->user());

        $floors = (clone $filterBase)->whereNotNull('floor')->distinct()->orderBy('floor')->pluck('floor');
        $blocks = (clone $filterBase)
            ->when($request->floor, fn ($q) => $q->where('floor', $request->floor))
            ->whereNotNull('block')->where('block', '!=', '')
            ->distinct()->orderBy('block')->pluck('block');
        $unitNumbers = (clone $filterBase)
            ->when($request->floor, fn ($q) => $q->where('floor', $request->floor))
            ->when($request->block, fn ($q) => $q->where('block', $request->block))
            ->whereNotNull('unit_number')->where('unit_number', '!=', '')
            ->distinct()->orderBy('unit_number')->pluck('unit_number');

        $total = (clone $filterBase)->count();
        $inactive = (clone $filterBase)->where('is_active', false)->count();
        $occupied = $this->applyOccupied(clone $filterBase)->count();
        $internal = $this->applyInternal(clone $filterBase)->count();
        $common = $this->applyCommon(clone $filterBase)->count();
        $vacant = max(0, $total - $inactive - $occupied - $internal - $common);

        $located = (clone $base)
            ->when($request->floor, fn ($q) => $q->where('floor', $request->floor))
            ->when($request->block, fn ($q) => $q->where('block', $request->block))
            ->when($request->unit_number, fn ($q) => $q->where('unit_number', $request->unit_number));

        // Ringkasan per lantai untuk header grup di tabel — sengaja tanpa filter status
        // supaya meter okupansi tetap menggambarkan kondisi lantai, bukan hasil saring.
        $floorSummary = $this->summarizeByFloor(clone $located);

        $query = (clone $located)
            ->when($request->status === 'occupied', fn ($q) => $this->applyOccupied($q))
            ->when($request->status === 'vacant', fn ($q) => $this->applyVacant($q))
            ->when($request->status === 'internal', fn ($q) => $this->applyInternal($q))
            ->when($request->status === 'common', fn ($q) => $this->applyCommon($q))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy('floor')->orderBy('block')->orderBy('unit_number');

        $units = $query->paginate(15)->withQueryString();
        $units->getCollection()->transform(function (Unit $unit) {
            $state = $unit->occupancyState();
            $unit->is_occupied = $state === 'occupied';
            $unit->occupancy_state = $state;
            $unit->internal_department = $unit->activeAssignment?->department?->name;
            $unit->active_assignment_id = $unit->activeAssignment?->id;
            $unit->group_name = $unit->group->first()?->name;
            $unit->assignments_history = $unit->assignments
                ->sortByDesc('started_at')
                ->map(fn (UnitAssignment $assignment) => [
                    'id' => $assignment->id,
                    'department' => $assignment->department?->name,
                    'pic_name' => $assignment->pic_name,
                    'pic_phone' => $assignment->pic_phone,
                    'note' => $assignment->note,
                    'started_at' => $assignment->started_at?->toDateString(),
                    'ended_at' => $assignment->ended_at?->toDateString(),
                ])
                ->values();
            $unit->scan_url = $unit->scanUrl;
            // ponytail: QR inline 15x per page, pindah ke endpoint/PDF saat lambat
            $unit->qr_image = $unit->scanUrl
                ? 'data:image/svg+xml;base64,'.base64_encode((string) QrCode::size(220)->generate($unit->scanUrl))
                : null;

            return $unit;
        });

        return Inertia::render('Master/Units/Index', [
            'units' => $units,
            'summary' => [
                'total' => $total,
                'occupied' => $occupied,
                'vacant' => $vacant,
                'internal' => $internal,
                'common' => $common,
                'inactive' => $inactive,
            ],
            'filters' => $request->only(['search', 'status', 'floor', 'block', 'unit_number']),
            'floorSummary' => $floorSummary,
            'floors' => $floors,
            'blocks' => $blocks,
            'unitNumbers' => $unitNumbers,
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'branches' => $request->user()->canViewAllBranches() ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ]);
    }

    /**
     * Terisi = tenancy aktif di unit itu sendiri atau di grup tempat unit menjadi anggota.
     */
    private function applyOccupied($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereHas('activeTenancy')
                    ->orWhereHas('group.activeTenancy');
            });
    }

    /**
     * Internal = ditandai internal atau ada assignment aktif, dan tidak sedang disewa.
     */
    private function applyInternal($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->where('usage_type', 'internal')
                    ->orWhereHas('activeAssignment');
            })
            ->whereDoesntHave('activeTenancy')
            ->whereDoesntHave('group.activeTenancy');
    }

    private function applyCommon($query)
    {
        return $query->where('is_active', true)
            ->where('usage_type', 'common')
            ->whereDoesntHave('activeTenancy')
            ->whereDoesntHave('group.activeTenancy')
            ->whereDoesntHave('activeAssignment');
    }

    private function applyVacant($query)
    {
        return $query->where('is_active', true)
            ->where('usage_type', 'tenant')
            ->whereDoesntHave('activeTenancy')
            ->whereDoesntHave('group.activeTenancy')
            ->whereDoesntHave('activeAssignment');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, int|string>>
     */
    private function summarizeByFloor($query)
    {
        $counts = function (?callable $scope = null) use ($query) {
            $q = (clone $query)->reorder();

            if ($scope) {
                $q = $scope($q);
            }

            return $q->toBase()
                ->selectRaw('units.floor as floor, count(*) as total')
                ->groupBy('units.floor')
                ->pluck('total', 'floor');
        };

        $total = $counts();
        $inactive = $counts(fn ($q) => $q->where('units.is_active', false));
        $occupied = $counts(fn ($q) => $this->applyOccupied($q));
        $internal = $counts(fn ($q) => $this->applyInternal($q));
        $common = $counts(fn ($q) => $this->applyCommon($q));

        return $total->map(function ($count, $floor) use ($inactive, $occupied, $internal, $common) {
            $t = (int) $count;
            $i = (int) ($inactive[$floor] ?? 0);
            $o = (int) ($occupied[$floor] ?? 0);
            $in = (int) ($internal[$floor] ?? 0);
            $c = (int) ($common[$floor] ?? 0);

            return [
                'floor' => $floor,
                'total' => $t,
                'occupied' => $o,
                'internal' => $in,
                'common' => $c,
                'inactive' => $i,
                'vacant' => max(0, $t - $i - $o - $in - $c),
            ];
        })->values();
    }

    public function create(Request $request)
    {
        return Inertia::render('Master/Units/Create', $this->formProps($request));
    }

    public function store(Request $request)
    {
        $validated = $this->validateUnit($request);

        Unit::create([
            ...$validated,
            'usage_type' => $validated['usage_type'] ?? 'tenant',
            'branch_id' => $request->user()->canViewAllBranches() ? $validated['branch_id'] : $request->user()->branch_id,
        ]);

        return back()->with('success', 'Unit berhasil ditambahkan.');
    }

    public function update($id, Request $request)
    {
        $unit = Unit::findOrFail($id);
        $this->authorizeAccess($unit, $request);

        $validated = $this->validateUnit($request, $unit->id);

        $unit->update([
            ...$validated,
            'usage_type' => $validated['usage_type'] ?? $unit->usage_type ?? 'tenant',
            'branch_id' => $request->user()->canViewAllBranches() ? $validated['branch_id'] : $unit->branch_id,
        ]);

        return back()->with('success', 'Data unit berhasil diperbarui.');
    }

    public function destroy($id, Request $request)
    {
        $unit = Unit::findOrFail($id);
        $this->authorizeAccess($unit, $request);

        if ($unit->tenancies()->exists()) {
            return back()->withErrors(['unit' => 'Unit tidak bisa dihapus karena masih punya riwayat tenancy.']);
        }

        if ($unit->assignments()->exists()) {
            return back()->withErrors(['unit' => 'Unit tidak bisa dihapus karena masih punya riwayat pemakaian internal.']);
        }

        if ($unit->group()->exists()) {
            return back()->withErrors(['unit' => 'Unit tidak bisa dihapus karena masih menjadi anggota area gabungan.']);
        }

        $unit->delete();

        return back()->with('success', 'Unit berhasil dihapus.');
    }

    private function validateUnit(Request $request, ?int $ignoreId = null): array
    {
        $canPickBranch = $request->user()->canViewAllBranches();

        return $request->validate([
            'floor' => 'required|string|max:50',
            'block' => 'nullable|string|max:50',
            'unit_number' => 'required|string|max:50',
            'unit_code' => [
                'required', 'string', 'max:100',
                Rule::unique('units', 'unit_code')->ignore($ignoreId),
            ],
            'size' => 'nullable|numeric|min:0',
            'usage_type' => ['nullable', Rule::in(['tenant', 'internal', 'common'])],
            'branch_id' => $canPickBranch ? 'required|exists:branches,id' : 'nullable',
            'is_active' => 'boolean',
        ]);
    }

    private function formProps(Request $request): array
    {
        return [
            'branches' => $request->user()->canViewAllBranches()
                ? Branch::orderBy('name')->get(['id', 'name'])
                : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ];
    }

    private function authorizeAccess(Unit $unit, Request $request): void
    {
        $user = $request->user();
        abort_unless($unit->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
