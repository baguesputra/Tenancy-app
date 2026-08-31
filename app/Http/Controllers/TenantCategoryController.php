<?php

namespace App\Http\Controllers;

use App\Models\TenantCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TenantCategoryController extends Controller
{
    public function index()
    {
        return Inertia::render('TenantCategories/Index', [
            'categories' => TenantCategory::withCount('tenants')->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('TenantCategories/Create');
    }

    public function store(Request $request)
    {
        $validated = $this->validateCategory($request);

        TenantCategory::create($validated);

        return redirect()->route('tenant-categories.index')->with('success', 'Kategori tenant berhasil ditambahkan.');
    }

    public function edit(TenantCategory $tenantCategory)
    {
        return Inertia::render('TenantCategories/Edit', [
            'category' => $tenantCategory,
        ]);
    }

    public function update(TenantCategory $tenantCategory, Request $request)
    {
        $validated = $this->validateCategory($request);

        $tenantCategory->update($validated);

        return redirect()->route('tenant-categories.index')->with('success', 'Kategori tenant berhasil diperbarui.');
    }

    public function destroy(TenantCategory $tenantCategory)
    {
        if ($tenantCategory->tenants()->exists()) {
            return back()->withErrors([
                'category' => 'Kategori ini masih dipakai oleh tenant, tidak bisa dihapus.',
            ]);
        }

        $tenantCategory->delete();

        return redirect()->route('tenant-categories.index')->with('success', 'Kategori tenant berhasil dihapus.');
    }

    private function validateCategory(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
    }
}