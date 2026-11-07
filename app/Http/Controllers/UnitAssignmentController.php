<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\UnitAssignment;
use Illuminate\Http\Request;

class UnitAssignmentController extends Controller
{
    public function store(Request $request, Unit $unit)
    {
        $this->authorizeAccess($unit, $request);

        $validated = $request->validate([
            'department_id' => 'nullable|exists:departments,id',
            'pic_name' => 'nullable|string|max:100',
            'pic_phone' => 'nullable|string|max:50',
            'note' => 'nullable|string|max:1000',
            'started_at' => 'required|date',
        ]);

        // Satu unit hanya boleh punya satu pemakaian aktif.
        if ($unit->activeAssignment()->exists()) {
            return back()->withErrors([
                'assignment' => 'Unit ini masih punya pemakaian aktif. Akhiri dulu sebelum menambah yang baru.',
            ]);
        }

        $unit->assignments()->create($validated);

        return back()->with('success', 'Pemakaian internal unit dicatat.');
    }

    public function end(Request $request, Unit $unit, UnitAssignment $assignment)
    {
        $this->authorizeAccess($unit, $request);
        abort_unless($assignment->unit_id === $unit->id, 404);

        if ($assignment->ended_at) {
            return back()->with('success', 'Pemakaian internal itu sudah berakhir.');
        }

        $assignment->update([
            'ended_at' => $request->input('ended_at') ?: now()->toDateString(),
        ]);

        return back()->with('success', 'Pemakaian internal unit diakhiri.');
    }

    private function authorizeAccess(Unit $unit, Request $request): void
    {
        $user = $request->user();
        abort_unless($unit->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}
