<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with(['branch', 'department', 'roles'])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Settings/Users/Index', [
            'users' => $users,
            'filters' => $request->only('search'),
            'roles' => Role::orderBy('name')->pluck('name'),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateUser($request);

        $user = User::create([
            'name' => $validated['name'],
            'employee_number' => $validated['employee_number'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?: null,
            'password' => bcrypt($validated['password'] ?? 'password'),
            'must_change_password' => true,
        ]);

        $user->syncRoles([$validated['role']]);

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update($id, Request $request)
    {
        $user = User::findOrFail($id);
        $validated = $this->validateUser($request, $user->id);

        $user->update([
            'name' => $validated['name'],
            'employee_number' => $validated['employee_number'],
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?: null,
        ]);

        if (! empty($validated['password'])) {
            $user->update(['password' => bcrypt($validated['password'])]);
        }

        $user->syncRoles([$validated['role']]);

        return back()->with('success', 'Data user berhasil diperbarui.');
    }

    public function destroy($id, Request $request)
    {
        if ((int) $id === $request->user()->id) {
            return back()->withErrors(['user' => 'Tidak bisa menghapus akun sendiri.']);
        }

        User::findOrFail($id)->delete();

        return back()->with('success', 'User berhasil dihapus.');
    }

    private function validateUser(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'employee_number' => [
                'required', 'string', 'max:50',
                Rule::unique('users', 'employee_number')->ignore($ignoreId),
            ],
            'branch_id' => 'required|exists:branches,id',
            'department_id' => 'nullable|exists:departments,id',
            'role' => 'required|exists:roles,name',
            'password' => 'nullable|string|min:6',
        ]);
    }
}