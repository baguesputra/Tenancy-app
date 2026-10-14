<?php

namespace Database\Seeders;

use App\Models\ChecklistTemplate;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;

class ChecklistSeeder extends Seeder
{
    /**
     * Satu template "Form Sidak Tenant" untuk semua jenis tenant.
     * Section inti tampil untuk semua kategori; section kondisional hanya
     * untuk kategori produk tertentu (hasil unifikasi 5 file Excel form sidak).
     * Template lama (F&B, Fashion) dinonaktifkan — riwayat snapshot tetap valid.
     */
    public function run(): void
    {
        ChecklistTemplate::whereIn('name', ['Form Sidak F&B', 'Form Sidak Fashion'])
            ->update(['is_active' => false]);

        $template = ChecklistTemplate::updateOrCreate(
            ['name' => 'Form Sidak Tenant'],
            ['is_active' => true]
        );
        $template->productCategories()->sync(ProductCategory::pluck('id'));

        $fnb = ['F&B'];
        $nonFnb = ProductCategory::whereNotIn('name', $fnb)->pluck('name')->all();

        $order = 1;

        // --- Non-F&B (Anchor / Fashion / retail, dari FORM EVALUASI STANDAR TENANT) ---
        $this->createSection($template, 'Kondisi Unit', $order++, $nonFnb, [
            'Dinding' => ['baik', 'tidak baik'],
            'Lantai' => ['baik', 'tidak baik'],
            'Plafond' => ['baik', 'tidak baik'],
            'Pintu' => ['baik', 'tidak baik'],
            'Display Produk' => ['rapi', 'tidak rapi'],
            'Banner Promosi' => ['rapi', 'tidak rapi'],
        ]);
        $this->createSection($template, 'AC & Ventilation', $order++, $nonFnb, [
            'Suhu Ruangan' => ['normal', 'tidak normal'],
            'Diffuser AC' => ['baik', 'tidak baik'],
            'RAG' => ['baik', 'tidak baik'],
            'Ruang AHU' => ['baik', 'tidak baik'],
            'Supply AC' => null, // free_text, di form asli tanpa pasangan opsi
        ]);
        $this->createSection($template, 'Kelistrikan', $order++, $nonFnb, [
            'Signage' => ['nyala', 'mati'],
            'Lampu Dalam Unit' => ['nyala', 'mati'],
            'Lampu Standby' => ['ada', 'tidak ada'],
            'Box Panel Listrik / MCB' => ['baik', 'tidak baik'],
            'Jalur Kabel' => ['rapi', 'tidak rapi'],
            'Stop Kontak' => ['baik', 'tidak baik'],
        ]);
        $this->createSection($template, 'Security', $order++, $nonFnb, [
            'CCTV' => ['ada', 'tidak ada'],
            'RF Security Gate' => ['ada', 'tidak ada'],
            'Alarm Sensor' => ['ada', 'tidak ada'],
            'Entrance Unit' => ['pintu kaca', 'rolling door'],
            'Kunci / Gembok Unit' => ['baik', 'tidak baik'],
        ]);
        $this->createSection($template, 'Protection', $order++, $nonFnb, [
            'Springkler' => ['ada', 'tidak ada'],
            'Heat Detector' => ['ada', 'tidak ada'],
            'Smoke Detector' => ['ada', 'tidak ada'],
            'APAR' => ['ada', 'tidak ada'],
            'Hydrant' => ['ada', 'tidak ada'],
        ]);
        $this->createSection($template, 'Gudang / Storage', $order++, $nonFnb, [
            'Susunan Barang' => ['rapi', 'tidak rapi'],
            'Daya Tampung' => ['cukup', 'overload'],
            'Kebersihan' => ['baik', 'tidak baik'],
            'Pest Control' => ['ada', 'tidak ada'],
            'Kondisi Ruangan' => ['baik', 'tidak baik'],
            'Rak' => ['ada', 'tidak ada'],
            'Bahan Mudah Terbakar' => ['ada', 'tidak ada'],
        ]);

        // --- F&B (dari TENANT INSPECTION REPORT, pasangan Ok/Tidak) ---
        $this->createUniformSection($template, 'Civil', $order++, $fnb, [
            'Lantai', 'Dinding', 'Plafond', 'Rolling Door',
        ]);
        $this->createUniformSection($template, 'Safety Tools', $order++, $fnb, [
            'Apar', 'CCTV', 'Springkler', 'Heat Detector',
            'Smoke Detector', 'Gas Detector', 'Pest Control', 'Emergency Lamp',
        ]);
        $this->createUniformSection($template, 'Kitchen', $order++, $fnb, [
            'Exhaust', 'Gas', 'Kebersihan',
        ]);
        $this->createUniformSection($template, 'Plumbing', $order++, $fnb, [
            'Saluran Air', 'Grease Trap', 'Floordrain/Gutter',
        ]);
        $this->createUniformSection($template, 'Electrical', $order++, $fnb, [
            'Lampu Dalam Unit', 'Lampu Stand By',
            'Signage/Shopfront', 'Instalasi Listrik',
        ]);
    }

    /**
     * Section dengan pasangan opsi per item (null = free_text).
     */
    private function createSection(
        ChecklistTemplate $template,
        string $name,
        int $order,
        ?array $scope,
        array $items
    ): void {
        $section = $template->sections()->updateOrCreate(
            ['name' => $name],
            ['order' => $order, 'scope_product_categories' => $scope]
        );

        $itemOrder = 1;
        foreach ($items as $label => $pair) {
            $section->items()->firstOrCreate(
                ['label' => $label],
                [
                    'type' => $pair === null ? 'free_text' : 'binary_choice',
                    'option_positive' => $pair[0] ?? null,
                    'option_negative' => $pair[1] ?? null,
                    'photo_required_on_negative' => $pair !== null,
                    'order' => $itemOrder++,
                ]
            );
        }
    }

    /**
     * Section dengan satu pasangan opsi seragam untuk semua item.
     */
    private function createUniformSection(
        ChecklistTemplate $template,
        string $name,
        int $order,
        ?array $scope,
        array $labels,
        string $optionPositive = 'Ok',
        string $optionNegative = 'Tidak'
    ): void {
        $this->createSection(
            $template,
            $name,
            $order,
            $scope,
            array_fill_keys($labels, [$optionPositive, $optionNegative])
        );
    }
}
