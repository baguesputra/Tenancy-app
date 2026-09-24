<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TenantAccountController extends Controller
{
    public function index(Request $request)
    {
        $tenants = Tenant::with(['tenantUser', 'branch'])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status === 'with_account', fn ($q) => $q->whereHas('tenantUser'))
            ->when($request->status === 'without_account', fn ($q) => $q->whereDoesntHave('tenantUser'))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $withoutAccountCount = Tenant::whereDoesntHave('tenantUser')->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))->count();

        return Inertia::render('Settings/TenantAccounts/Index', [
            'tenants' => $tenants,
            'filters' => $request->only(['search', 'status']),
            'withoutAccountCount' => $withoutAccountCount,
            'withAccountCount' => Tenant::whereHas('tenantUser')->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))->count(),
        ]);
    }

    public function store(Request $request, $tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->tenantUser) {
            return back()->withErrors(['tenant' => 'Tenant ini sudah punya akun.']);
        }

        $validated = $request->validate([
            'username' => ['nullable', 'string', 'max:50', 'alpha_dash', Rule::unique('tenant_users', 'username')],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        $username = $validated['username'] ?: TenantUser::generateUsernameFrom($tenant->name);
        $password = $validated['password'] ?: Str::random(10);

        $tenantUser = TenantUser::create([
            'tenant_id' => $tenant->id,
            'username' => $username,
            'password' => Hash::make($password),
            'is_active' => true,
        ]);

        return back()
            ->with('success', "Akun portal untuk \"{$tenant->name}\" berhasil dibuat.")
            ->with('credential', [
                'mode' => 'created',
                'tenant_name' => $tenant->name,
                'username' => $tenantUser->username,
                'password' => $password,
            ]);
    }

    public function bulkCreate()
    {
        $created = [];

        Tenant::whereDoesntHave('tenantUser')->orderBy('id')->chunk(200, function ($tenants) use (&$created) {
            foreach ($tenants as $tenant) {
                $password = Str::random(10);
                $tenantUser = TenantUser::create([
                    'tenant_id' => $tenant->id,
                    'username' => TenantUser::generateUsernameFrom($tenant->name),
                    'password' => Hash::make($password),
                    'is_active' => true,
                ]);
                $created[] = ['tenant_name' => $tenant->name, 'username' => $tenantUser->username, 'password' => $password];
            }
        });
        // ponytail: loop create cukup kini, ganti upsert batch saat >1k tenant

        if (empty($created)) {
            return back()->with('success', 'Semua tenant sudah punya akun.');
        }

        return back()
            ->with('success', count($created) . ' akun portal berhasil dibuat. Salin kredensial di bawah sebelum menutup halaman.')
            ->with('credential', ['mode' => 'bulk', 'accounts' => $created]);
    }

    public function resetPassword(Request $request, $tenantId)
    {
        $tenant = Tenant::with('tenantUser')->findOrFail($tenantId);

        if (! $tenant->tenantUser) {
            return back()->withErrors(['tenant' => 'Tenant ini belum punya akun.']);
        }

        $validated = $request->validate([
            'username' => ['nullable', 'string', 'max:50', 'alpha_dash', Rule::unique('tenant_users', 'username')->ignore($tenant->tenantUser->id)],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        $username = $validated['username'] ?: $tenant->tenantUser->username;
        $passwordChanged = ! empty($validated['password']);
        $password = $validated['password'] ?: null;

        $tenant->tenantUser->update(array_filter([
            'username' => $username,
            'password' => $passwordChanged ? Hash::make($password) : null,
        ]));

        if (! $passwordChanged) {
            return back()->with('success', "Username akun \"{$tenant->name}\" diperbarui menjadi \"{$username}\". Password tidak berubah.");
        }

        return back()
            ->with('success', "Akun portal \"{$tenant->name}\" berhasil diperbarui.")
            ->with('credential', [
                'mode' => 'updated',
                'tenant_name' => $tenant->name,
                'username' => $username,
                'password' => $password,
            ]);
    }

    public function toggleActive($tenantId)
    {
        $tenant = Tenant::with('tenantUser')->findOrFail($tenantId);
        abort_unless($tenant->tenantUser, 404);

        $tenant->tenantUser->update(['is_active' => ! $tenant->tenantUser->is_active]);

        return back()->with('success', 'Status akun berhasil diperbarui.');
    }
}