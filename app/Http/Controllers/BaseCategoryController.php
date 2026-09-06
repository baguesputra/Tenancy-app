<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

abstract class BaseCategoryController extends Controller
{
    abstract protected function model(): string;
    abstract protected function routePrefix(): string;
    abstract protected function viewFolder(): string;
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

    public function store(Request $request)
    {
        $validated = $this->validateCategory($request);
        $this->model()::create($validated);

        return back()->with('success', $this->pageTitle() . ' berhasil ditambahkan.');
    }

    public function update($id, Request $request)
    {
        $category = $this->model()::findOrFail($id);

        $validated = $this->validateCategory($request);
        $category->update($validated);

        return back()->with('success', $this->pageTitle() . ' berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $category = $this->model()::findOrFail($id);

        if ($category->tenants()->exists()) {
            return back()->withErrors(['category' => 'Kategori ini masih dipakai oleh tenant, tidak bisa dihapus.']);
        }

        $category->delete();

        return back()->with('success', $this->pageTitle() . ' berhasil dihapus.');
    }

    protected function validateCategory(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
    }
}