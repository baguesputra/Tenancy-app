<?php

namespace App\Http\Controllers;

use App\Models\TenantCategory;

class TenantCategoryController extends BaseCategoryController
{
    protected function model(): string
    {
        return TenantCategory::class;
    }

    protected function routePrefix(): string
    {
        return 'tenant-categories';
    }

    protected function viewFolder(): string
    {
        return 'Master/TenantCategories';
    }

    protected function pageTitle(): string
    {
        return 'Kategori Tenant';
    }
}