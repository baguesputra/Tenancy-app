<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ProductCategory;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Services\BranchScopeService;
use App\Models\TenantUser;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TenantController extends Controller
{
    public function __construct(private BranchScopeService $branchScope) {}

    public function index(Request $request)
    {
        $query = Tenant::with(['branch', 'tenantCategory', 'productCategory'])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->tenant_category_id, fn ($q) => $q->where('tenant_category_id', $request->tenant_category_id))
            ->when($request->product_category_id, fn ($q) => $q->where('product_category_id', $request->product_category_id))
            ->latest();

        $this->branchScope->apply($query, $request->user());

        return Inertia::render('Master/Tenants/Index', [
            'tenants' => $query->paginate(15)->withQueryString(),
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'productCategories' => ProductCategory::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'tenant_category_id', 'product_category_id']),
            'branches' => $request->user()->canViewAllBranches() ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('Master/Tenants/Create', $this->formProps($request));
    }

    public function store(Request $request)
    {
        $validated = $this->validateTenant($request);

        $tenant = Tenant::create([
            ...$validated,
            'branch_id' => $request->user()->canViewAllBranches()
                ? $validated['branch_id']
                : $request->user()->branch_id,
        ]);

        $this->syncContacts($tenant, $request->input('contacts', []));

        // Auto-buat akun login untuk staff toko
        $generatedPassword = Str::random(10);
        $tenantUser = TenantUser::create([
            'tenant_id' => $tenant->id,
            'username' => TenantUser::generateUsernameFrom($tenant->name),
            'password' => bcrypt($generatedPassword),
            'is_active' => true,
        ]);

        return redirect()->route('tenants.index')->with('success',
            "Tenant berhasil ditambahkan. Akun login toko: username \"{$tenantUser->username}\", password \"{$generatedPassword}\" — catat sekarang, password tidak akan ditampilkan lagi."
        );
    }

    public function update($id, Request $request)
    {
        $tenant = Tenant::findOrFail($id);
        $this->authorizeAccess($tenant, $request);

        $validated = $this->validateTenant($request);

        $tenant->update([
            ...$validated,
            'branch_id' => $request->user()->canViewAllBranches() ? $validated['branch_id'] : $tenant->branch_id,
        ]);

        $this->syncContacts($tenant, $request->input('contacts', []));

        return back()->with('success', 'Data tenant berhasil diperbarui.');
    }

    public function destroy($id, Request $request)
    {
        $tenant = Tenant::findOrFail($id);
        $this->authorizeAccess($tenant, $request);

        if ($tenant->tenancies()->exists() || $tenant->inspections()->exists()) {
            return back()->withErrors(['tenant' => 'Tenant tidak bisa dihapus karena masih punya riwayat kontrak/sidak. Nonaktifkan saja tenant ini.']);
        }

        $tenant->contacts()->delete();
        $tenant->delete();

        return back()->with('success', 'Tenant berhasil dihapus.');
    }

    private function validateTenant(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'legal_entity_name' => 'nullable|string|max:255',
            'npwp_number' => 'nullable|string|max:50',
            'siup_number' => 'nullable|string|max:50',
            'company_phone' => 'nullable|string|max:30',
            'company_email' => 'nullable|email|max:255',
            'company_address' => 'nullable|string',
            'tenant_category_id' => 'required|exists:tenant_categories,id',
            'product_category_id' => 'required|exists:product_categories,id',
            'branch_id' => $request->user()->canViewAllBranches()
                ? 'required|exists:branches,id'
                : 'nullable',
            'is_active' => 'boolean',
        ]);
    }

    private function syncContacts(Tenant $tenant, array $contacts): void
    {
        $keepIds = [];

        foreach ($contacts as $contact) {
            if (empty($contact['name'])) {
                continue;
            }

            $saved = $tenant->contacts()->updateOrCreate(
                ['id' => $contact['id'] ?? null],
                [
                    'name' => $contact['name'],
                    'position' => $contact['position'] ?? null,
                    'phone' => $contact['phone'] ?? null,
                    'email' => $contact['email'] ?? null,
                    'type' => $contact['type'] ?? null,
                ]
            );

            $keepIds[] = $saved->id;
        }

        // Hapus kontak yang tidak ada lagi di form (dihapus user dari UI)
        $tenant->contacts()->whereNotIn('id', $keepIds)->delete();
    }

    private function formProps(Request $request): array
    {
        return [
            'tenantCategories' => TenantCategory::orderBy('name')->get(['id', 'name']),
            'productCategories' => ProductCategory::orderBy('name')->get(['id', 'name']),
            'branches' => $request->user()->canViewAllBranches()
                ? Branch::orderBy('name')->get(['id', 'name'])
                : [],
            'canPickBranch' => $request->user()->canViewAllBranches(),
        ];
    }

    private function authorizeAccess(Tenant $tenant, Request $request): void
    {
        $user = $request->user();
        abort_unless($tenant->branch_id === $user->branch_id || $user->canViewAllBranches(), 403);
    }
}