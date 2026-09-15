<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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

        return Inertia::render('Settings/TenantAccounts/Index', [
            'tenants' => $tenants,
            'filters' => $request->only(['search', 'status']),
            'withoutAccountCount' => Tenant::whereDoesntHave('tenantUser')->count(),
        ]);
    }

    public function store($tenantId)
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->tenantUser) {
            return back()->withErrors(['tenant' => 'Tenant ini sudah punya akun.']);
        }

        $password = Str::random(10);
        $tenantUser = TenantUser::create([
            'tenant_id' => $tenant->id,
            'username' => TenantUser::generateUsernameFrom($tenant->name),
            'password' => bcrypt($password),
            'is_active' => true,
        ]);

        return back()->with('success',
            "Akun berhasil dibuat untuk \"{$tenant->name}\". Username: \"{$tenantUser->username}\", Password: \"{$password}\" — catat sekarang, tidak akan ditampilkan lagi."
        );
    }

    public function bulkCreate()
    {
        $tenantsWithoutAccount = Tenant::whereDoesntHave('tenantUser')->get();
        $created = [];

        foreach ($tenantsWithoutAccount as $tenant) {
            $password = Str::random(10);
            $tenantUser = TenantUser::create([
                'tenant_id' => $tenant->id,
                'username' => TenantUser::generateUsernameFrom($tenant->name),
                'password' => bcrypt($password),
                'is_active' => true,
            ]);
            $created[] = "{$tenant->name}: {$tenantUser->username} / {$password}";
        }

        if (empty($created)) {
            return back()->with('success', 'Semua tenant sudah punya akun.');
        }

        return back()->with('success',
            count($created) . " akun berhasil dibuat. Detail:\n" . implode("\n", $created)
        );
    }

    public function resetPassword($tenantId)
    {
        $tenant = Tenant::with('tenantUser')->findOrFail($tenantId);

        if (! $tenant->tenantUser) {
            return back()->withErrors(['tenant' => 'Tenant ini belum punya akun.']);
        }

        $password = Str::random(10);
        $tenant->tenantUser->update(['password' => bcrypt($password)]);

        return back()->with('success',
            "Password untuk \"{$tenant->name}\" (username: {$tenant->tenantUser->username}) berhasil direset menjadi: \"{$password}\" — catat sekarang, tidak akan ditampilkan lagi."
        );
    }

    public function toggleActive($tenantId)
    {
        $tenant = Tenant::with('tenantUser')->findOrFail($tenantId);
        abort_unless($tenant->tenantUser, 404);

        $tenant->tenantUser->update(['is_active' => ! $tenant->tenantUser->is_active]);

        return back()->with('success', 'Status akun berhasil diperbarui.');
    }
}