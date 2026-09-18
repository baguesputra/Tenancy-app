<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use App\Models\TenantCategory;
use Inertia\Inertia;

/**
 * Halaman gabungan read-only untuk dua jenis kategori.
 * Mutasi (store/update/destroy) tetap di TenantCategoryController
 * dan ProductCategoryController agar kepemilikan jelas.
 */
class CategoryController extends Controller
{
    public function index()
    {
        return Inertia::render('Master/Categories/Index', [
            'tenantCategories' => TenantCategory::withCount('tenants')->orderBy('name')->get(),
            'productCategories' => ProductCategory::withCount(['tenants', 'checklistTemplates'])->orderBy('name')->get(),
        ]);
    }
}
