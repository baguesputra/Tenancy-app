<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ChecklistItem;
use App\Models\ChecklistTemplate;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class InspectionTemplateController extends Controller
{
    /**
     * Halaman "Form Sidak": hanya template aktif + struktur lengkap.
     * Template nonaktif (arsip) disembunyikan total — riwayat tetap utuh di DB.
     */
    public function index()
    {
        $templates = ChecklistTemplate::with([
            'productCategories:id,name',
            'sections' => fn ($q) => $q->orderBy('order')->with([
                'items' => fn ($q) => $q->orderBy('order'),
            ]),
        ])
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'is_active' => $t->is_active,
                'product_categories' => $t->productCategories,
                'sections' => $t->sections->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'scope_product_categories' => $s->scope_product_categories,
                    'floor_scope' => $s->floor_scope,
                    'items' => $s->items->map(fn ($i) => [
                        'id' => $i->id,
                        'label' => $i->label,
                        'type' => $i->type,
                        'option_positive' => $i->option_positive,
                        'option_negative' => $i->option_negative,
                    ]),
                ]),
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

        $newActive = $validated['is_active'] ?? $template->is_active;
        if ($template->is_active && ! $newActive
            && ! ChecklistTemplate::where('id', '!=', $template->id)->where('is_active', true)->exists()
        ) {
            throw ValidationException::withMessages([
                'is_active' => 'Tidak bisa menonaktifkan template terakhir yang aktif — sidak akan kehilangan form.',
            ]);
        }

        $newCategoryIds = $validated['product_category_ids'] ?? null;
        if ($newCategoryIds !== null || ! $newActive) {
            $this->ensureCategoriesCovered(
                $template,
                $newActive ? ($newCategoryIds ?? $template->productCategories()->pluck('product_categories.id')->all()) : []
            );
        }

        $template->update([
            'name' => $validated['name'],
            'is_active' => $newActive,
        ]);
        if ($newCategoryIds !== null) {
            $template->productCategories()->sync($newCategoryIds);
        }

        return back()->with('success', "Template '{$template->name}' berhasil diperbarui.");
    }

    /**
     * Edit label + pasangan opsi per item. Aman untuk riwayat: snapshot
     * inspeksi menyimpan salinan label/opsi, jadi data lama tidak berubah.
     */
    public function updateItem(ChecklistItem $item, Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'option_positive' => 'nullable|string|max:50',
            'option_negative' => 'nullable|string|max:50',
        ]);

        if ($item->type === 'binary_choice'
            && (! $validated['option_positive'] || ! $validated['option_negative'])
        ) {
            throw ValidationException::withMessages([
                'option_positive' => 'Item pilihan ganda wajib punya dua opsi jawaban.',
            ]);
        }

        $item->update([
            'label' => $validated['label'],
            'option_positive' => $item->type === 'binary_choice' ? $validated['option_positive'] : null,
            'option_negative' => $item->type === 'binary_choice' ? $validated['option_negative'] : null,
        ]);

        return back()->with('success', "Item '{$item->label}' berhasil diperbarui.");
    }

    /**
     * Guard anti-"tidak ada template aktif": setiap kategori produk harus
     * tetap punya minimal satu template aktif setelah perubahan.
     */
    private function ensureCategoriesCovered(ChecklistTemplate $template, array $remainingCategoryIds): void
    {
        $removed = $template->productCategories()->pluck('product_categories.id')
            ->diff($remainingCategoryIds);
        if ($removed->isEmpty()) {
            return;
        }

        $orphaned = ProductCategory::whereIn('id', $removed)
            ->whereNotExists(function ($q) use ($template) {
                $q->selectRaw('1')->from('checklist_template_product_categories as ctpc')
                    ->join('checklist_templates as ct', 'ct.id', '=', 'ctpc.checklist_template_id')
                    ->whereColumn('ctpc.product_category_id', 'product_categories.id')
                    ->where('ct.is_active', true)
                    ->where('ct.id', '!=', $template->id);
            })
            ->pluck('name');

        if ($orphaned->isNotEmpty()) {
            throw ValidationException::withMessages([
                'product_category_ids' => 'Kategori '.implode(', ', $orphaned->all()).' akan kehilangan template aktif — sidak untuk kategori itu akan error.',
            ]);
        }
    }
}
