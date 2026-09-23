<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ChecklistTemplate;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InspectionTemplateController extends Controller
{
    public function index()
    {
        $itemCounts = \App\Models\ChecklistItem::selectRaw('checklist_sections.checklist_template_id as tid, count(*) as c')
            ->join('checklist_sections', 'checklist_sections.id', '=', 'checklist_items.checklist_section_id')
            ->groupBy('tid')
            ->pluck('c', 'tid');

        $templates = ChecklistTemplate::with('productCategories:id,name')
            ->withCount('sections')
            ->orderBy('name')
            ->get(['id', 'name', 'is_active'])
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'is_active' => $t->is_active,
                'sections_count' => $t->sections_count,
                'items_count' => $itemCounts[$t->id] ?? 0,
                'product_categories' => $t->productCategories,
            ]);

        return Inertia::render('Settings/InspectionTemplates/Index', [
            'templates' => $templates,
            'productCategories' => ProductCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(ChecklistTemplate $template, Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'is_active' => 'boolean',
            'product_category_ids' => 'array',
            'product_category_ids.*' => 'exists:product_categories,id',
        ]);

        $template->update([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? $template->is_active,
        ]);
        $template->productCategories()->sync($validated['product_category_ids'] ?? []);

        return back()->with('success', "Template '{$template->name}' berhasil diperbarui.");
    }
}
