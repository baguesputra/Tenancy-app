<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $templateId = DB::table('checklist_templates')->where('name', 'Form Sidak Lifestyle')->value('id');
        if (! $templateId) {
            return;
        }

        DB::table('checklist_templates')->where('id', $templateId)->update(['name' => 'Form Sidak Fashion']);

        $sportId = DB::table('product_categories')->where('name', 'Sport')->value('id');
        if (! $sportId) {
            return;
        }

        $exists = DB::table('checklist_template_product_categories')
            ->where('checklist_template_id', $templateId)
            ->where('product_category_id', $sportId)
            ->exists();

        if (! $exists) {
            DB::table('checklist_template_product_categories')->insert([
                'checklist_template_id' => $templateId,
                'product_category_id' => $sportId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $templateId = DB::table('checklist_templates')->where('name', 'Form Sidak Fashion')->value('id');
        if (! $templateId) {
            return;
        }

        DB::table('checklist_templates')->where('id', $templateId)->update(['name' => 'Form Sidak Lifestyle']);

        $sportId = DB::table('product_categories')->where('name', 'Sport')->value('id');
        if ($sportId) {
            DB::table('checklist_template_product_categories')
                ->where('checklist_template_id', $templateId)
                ->where('product_category_id', $sportId)
                ->delete();
        }
    }
};
