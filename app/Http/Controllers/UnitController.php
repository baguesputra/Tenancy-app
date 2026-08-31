<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Unit;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UnitController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $query = Unit::with(['branch', 'activeTenancy.tenant'])
            ->when($request->search, fn ($q) => $q->where(function ($qq) use ($request) {
                $qq->where('unit_code', 'like', "%{$request->search}%")
                    ->orWhere('floor', 'like', "%{$request->search}%")
                    ->orWhere('block', 'like', "%{$request->search}%");
            }))
            ->latest();

        $this->branchScope->apply($query, $request->user());

        $units = $query->paginate(15)->withQueryString();

        // Tambahkan status occupied/vacant terhitung otomatis
        $units->getCollection()->transform(function (Unit $unit) {
            $unit->is_occupied = $unit->activeTenancy !== null;
            return $unit;
        });

        return Inertia::render('Master/Units/Index', [
            'units' => $units,
            'filters' => $request->only(['search']),
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
            'branch_id' => $request->user()->canViewAllBranches()
                ? $validated['branch_id']
                : $request->user()->branch_id,
        ]);

        return redirect()->route('units.index')->with('success', 'Unit berhasil ditambahkan.');
    }

    public function edit(Unit $unit, Request $request)
    {
        $this->authorizeAccess($unit, $request);

        return Inertia::render('Master/Units/Edit', [
            ...$this->formProps($request),
            'unit' => $unit,
        ]);
    }

    public function update(Unit $unit, Request $request)
    {
        $this->authorizeAccess($unit, $request);

        $validated = $this->validateUnit($request, $unit->id);

        $unit->update([
            ...$validated,
            'branch_id' => $request->user()->canViewAllBranches()
                ? $validated['branch_id']
                : $unit->branch_id,
        ]);

        return redirect()->route('units.index')->with('success', 'Data unit berhasil diperbarui.');
    }

    public function destroy(Unit $unit, Request $request)
    {
        $this->authorizeAccess($unit, $request);

        if ($unit->tenancies()->exists()) {
            return back()->withErrors([
                'unit' => 'Unit tidak bisa dihapus karena masih punya riwayat tenancy. Nonaktifkan saja unit ini.',
            ]);
        }

        $unit->delete();

        return redirect()->route('units.index')->with('success', 'Unit berhasil dihapus.');
    }

    private function validateUnit(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'floor' => 'required|string|max:50',
            'block' => 'nullable|string|max:50',
            'unit_number' => 'required|string|max:50',
            'unit_code' => [
                'required', 'string', 'max:100',
                Rule::unique('units', 'unit_code')->ignore($ignoreId),
            ],
            'size' => 'nullable|numeric|min:0',
            'branch_id' => 'required_if:canPickBranch,true|exists:branches,id',
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