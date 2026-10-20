<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Division;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('users.manage'), 403);
        $users = User::with(['branch:id,name,gate_id,company_name', 'department:id,name', 'division:id,name', 'position:id,name', 'roles'])
            ->where('is_active', true)
            ->when($request->search, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('employee_number', 'like', "%{$request->search}%")))
            ->when($request->role, fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('name', $request->role)))
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->department_id, fn ($q) => $q->where('department_id', $request->department_id))
            ->when($request->division_id, fn ($q) => $q->where('division_id', $request->division_id))
            ->when($request->position_id, fn ($q) => $q->where('position_id', $request->position_id))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Settings/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'branch_id', 'department_id', 'division_id', 'position_id']),
            'summary' => ['total' => User::where('is_active', true)->count()],
            'roles' => Role::orderBy('name')->pluck('name'),
            'departments' => Department::orderBy('name')->get(['id', 'name', 'code', 'company_gate_id']),
            'divisions' => Division::orderBy('name')->get(['id', 'name', 'code', 'company_gate_id']),
            'positions' => Position::orderBy('name')->get(['id', 'name', 'department_id', 'division_id', 'company_gate_id']),
            'branches' => Branch::orderBy('name')->get(['id', 'name', 'gate_id', 'company_name']),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('users.manage'), 403);
        $validated = $this->validateUser($request, null, true);
        $this->validasiRoleAman($request, $validated['role'], null);

        $user = User::create([
            'name' => $validated['name'],
            'employee_number' => $validated['employee_number'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?: null,
            'division_id' => $validated['division_id'] ?: null,
            'position_id' => $validated['position_id'] ?: null,
            'password' => bcrypt($validated['password']),
            'must_change_password' => true,
        ]);

        $user->syncRoles([$validated['role']]);

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update($id, Request $request)
    {
        abort_unless($request->user()->can('users.manage'), 403);
        $user = User::findOrFail($id);

        // ponytail: user Gate readonly kecuali role — org/password ikut Gate
        if ($user->gate_id) {
            $validated = $request->validate([
                'role' => 'required|exists:roles,name',
            ]);
            $this->validasiRoleAman($request, $validated['role'], $user->id);
            $user->syncRoles([$validated['role']]);

            return back()->with('success', 'Role user diperbarui. Data lain ikut Gate.');
        }

        $validated = $this->validateUser($request, $user->id);
        $this->validasiRoleAman($request, $validated['role'], $user->id);

        $user->update([
            'name' => $validated['name'],
            'employee_number' => $validated['employee_number'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?: null,
            'division_id' => $validated['division_id'] ?: null,
            'position_id' => $validated['position_id'] ?: null,
        ]);

        if (! empty($validated['password'])) {
            $user->update(['password' => bcrypt($validated['password'])]);
        }

        $user->syncRoles([$validated['role']]);

        return back()->with('success', 'Data user berhasil diperbarui.');
    }

    public function destroy($id, Request $request)
    {
        abort_unless($request->user()->can('users.manage'), 403);
        if ((int) $id === $request->user()->id) {
            return back()->withErrors(['user' => 'Tidak bisa menghapus akun sendiri.']);
        }

        User::findOrFail($id)->delete();

        return back()->with('success', 'User berhasil dihapus.');
    }

    private function validateUser(Request $request, ?int $ignoreId = null, bool $requirePassword = false): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'employee_number' => [
                'required', 'string', 'max:50',
                Rule::unique('users', 'employee_number')->ignore($ignoreId),
            ],
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'division_id' => 'nullable|exists:divisions,id',
            'position_id' => 'nullable|exists:positions,id',
            'role' => 'required|exists:roles,name',
            'password' => $requirePassword ? 'required|string|min:8' : 'nullable|string|min:8',
        ]);
    }

    private function validasiRoleAman(Request $request, string $role, ?int $targetUserId): void
    {
        $actor = $request->user();

        if ($targetUserId !== null && $targetUserId === $actor->id) {
            abort(403, 'Tidak bisa mengubah role akun sendiri.');
        }

        if ($role === 'super_admin' && ! $actor->hasRole('super_admin')) {
            abort(403, 'Hanya super_admin yang boleh menetapkan role super_admin.');
        }
    }
}
