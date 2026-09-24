<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Unit;
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
        $base = Unit::with(['branch', 'activeTenancy.tenant', 'scannableCode'])
            ->when($request->search, fn ($q) => $q->where(function ($qq) use ($request) {
                $qq->where('unit_code', 'like', "%{$request->search}%")
                    ->orWhere('floor', 'like', "%{$request->search}%")
                    ->orWhere('block', 'like', "%{$request->search}%")
                    ->orWhere('unit_number', 'like', "%{$request->search}%");
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

        $agg = (clone $filterBase)->toBase()->selectRaw("count(*) as total, sum(is_active = 0) as inactive, sum((select count(*) from tenancies where tenancies.unit_id = units.id and tenancies.status = 'active') > 0) as occupied")->first();
        $total = (int) ($agg->total ?? 0);
        $inactive = (int) ($agg->inactive ?? 0);
        $occupied = (int) ($agg->occupied ?? 0);
        $vacant = $total - $occupied - $inactive;

        $query = (clone $base)
            ->when($request->floor, fn ($q) => $q->where('floor', $request->floor))
            ->when($request->block, fn ($q) => $q->where('block', $request->block))
            ->when($request->unit_number, fn ($q) => $q->where('unit_number', $request->unit_number))
            ->when($request->status === 'occupied', fn ($q) => $q->whereHas('activeTenancy'))
            ->when($request->status === 'vacant', fn ($q) => $q->whereDoesntHave('activeTenancy')->where('is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderBy('floor')->orderBy('block')->orderBy('unit_number');

        $units = $query->paginate(15)->withQueryString();
        $units->getCollection()->transform(function (Unit $unit) {
            $unit->is_occupied = $unit->activeTenancy !== null;
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
                'inactive' => $inactive,
            ],
            'filters' => $request->only(['search', 'status', 'floor', 'block', 'unit_number']),
            'floors' => $floors,
            'blocks' => $blocks,
            'unitNumbers' => $unitNumbers,
            'branches' => $request->user()->canViewAllBranches() ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ]);
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
