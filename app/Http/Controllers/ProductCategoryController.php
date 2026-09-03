<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;

class ProductCategoryController extends BaseCategoryController
{
    protected function model(): string
    {
        return ProductCategory::class;
    }

    protected function routePrefix(): string
    {
        return 'product-categories';
    }

    protected function viewFolder(): string
    {
        return 'Master/ProductCategories';
    }

    protected function pageTitle(): string
    {
        return 'Kategori Produk';
    }
}