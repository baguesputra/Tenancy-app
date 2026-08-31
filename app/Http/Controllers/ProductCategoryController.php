<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductCategoryController extends Controller
{
    public function index()
    {
        return Inertia::render('Master/ProductCategories/Index', [
            'categories' => ProductCategory::withCount('tenants')->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/ProductCategories/Create');
    }

    public function store(Request $request)
    {
        $validated = $this->validateCategory($request);

        ProductCategory::create($validated);

        return redirect()->route('product-categories.index')->with('success', 'Kategori produk berhasil ditambahkan.');
    }

    public function edit(ProductCategory $productCategory)
    {
        return Inertia::render('Master/ProductCategories/Edit', [
            'category' => $productCategory,
        ]);
    }

    public function update(ProductCategory $productCategory, Request $request)
    {
        $validated = $this->validateCategory($request);

        $productCategory->update($validated);

        return redirect()->route('product-categories.index')->with('success', 'Kategori produk berhasil diperbarui.');
    }

    public function destroy(ProductCategory $productCategory)
    {
        if ($productCategory->tenants()->exists()) {
            return back()->withErrors([
                'category' => 'Kategori ini masih dipakai oleh tenant, tidak bisa dihapus.',
            ]);
        }

        $productCategory->delete();

        return redirect()->route('product-categories.index')->with('success', 'Kategori produk berhasil dihapus.');
    }

    private function validateCategory(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
    }
}