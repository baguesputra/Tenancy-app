<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;

abstract class BaseCategoryController extends Controller
{
    /**
     * Class model yang dipakai, misal TenantCategory::class
     */
    abstract protected function model(): string;

    /**
     * Nama route prefix, misal 'tenant-categories'
     */
    abstract protected function routePrefix(): string;

    /**
     * Nama folder halaman React, misal 'Master/TenantCategories'
     */
    abstract protected function viewFolder(): string;

    /**
     * Judul halaman untuk ditampilkan di UI
     */
    abstract protected function pageTitle(): string;

    public function index()
    {
        $modelClass = $this->model();

        return Inertia::render("{$this->viewFolder()}/Index", [
            'categories' => $modelClass::withCount('tenants')->orderBy('name')->get(),
            'routePrefix' => $this->routePrefix(),
            'pageTitle' => $this->pageTitle(),
        ]);
    }

    public function create()
    {
        return Inertia::render("{$this->viewFolder()}/Create", [
            'routePrefix' => $this->routePrefix(),
            'pageTitle' => $this->pageTitle(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateCategory($request);

        $this->model()::create($validated);

        return redirect()->route("{$this->routePrefix()}.index")
            ->with('success', $this->pageTitle() . ' berhasil ditambahkan.');
    }

    public function edit(Model $category)
    {
        return Inertia::render("{$this->viewFolder()}/Edit", [
            'category' => $category,
            'routePrefix' => $this->routePrefix(),
            'pageTitle' => $this->pageTitle(),
        ]);
    }

    public function update(Model $category, Request $request)
    {
        $validated = $this->validateCategory($request);

        $category->update($validated);

        return redirect()->route("{$this->routePrefix()}.index")
            ->with('success', $this->pageTitle() . ' berhasil diperbarui.');
    }

    public function destroy(Model $category)
    {
        if ($category->tenants()->exists()) {
            return back()->withErrors([
                'category' => 'Kategori ini masih dipakai oleh tenant, tidak bisa dihapus.',
            ]);
        }

        $category->delete();

        return redirect()->route("{$this->routePrefix()}.index")
            ->with('success', $this->pageTitle() . ' berhasil dihapus.');
    }

    protected function validateCategory(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
    }
}