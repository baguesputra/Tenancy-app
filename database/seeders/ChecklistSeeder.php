<?php

namespace Database\Seeders;

use App\Models\ChecklistTemplate;
use Illuminate\Database\Seeder;

class ChecklistSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedFnb();
        $this->seedFashion();
    }

    private function seedFnb(): void
    {
        $template = ChecklistTemplate::create(['name' => 'Form Sidak F&B']);
        $template->businessTypes()->create(['business_type' => 'f&b']);

        $sections = [
            'Civil' => ['Lantai', 'Dinding', 'Plafond', 'Rolling Door'],
            'Safety Tools' => [
                'Apar', 'CCTV', 'Springkler', 'Heat Detector',
                'Smoke Detector', 'Gas Detector', 'Pest Control', 'Emergency Lamp',
            ],
            'Kitchen' => ['Exhaust', 'Gas', 'Kebersihan'],
            'Plumbing' => ['Saluran Air', 'Grease Trap', 'Floordrain/Gutter'],
            'Electrical' => [
                'Lampu Dalam Unit', 'Lampu Stand By',
                'Signage/Shopfront', 'Instalasi Listrik',
            ],
        ];

        $this->createSections($template, $sections, optionPositive: 'Ok', optionNegative: 'Tidak');
    }

    private function seedFashion(): void
    {
        $template = ChecklistTemplate::create(['name' => 'Form Sidak Fashion']);
        $template->businessTypes()->create(['business_type' => 'fashion']);

        $order = 1;

        $sectionsWithCustomPairs = [
            'Kondisi Unit' => [
                'Dinding' => ['baik', 'tidak baik'],
                'Lantai' => ['baik', 'tidak baik'],
                'Plafond' => ['baik', 'tidak baik'],
                'Display Produk' => ['rapi', 'tidak rapi'],
                'Banner Promosi' => ['rapi', 'tidak rapi'],
            ],
            'AC & Ventilation' => [
                'Suhu Ruangan' => ['normal', 'tidak normal'],
                'Diffuser AC' => ['baik', 'tidak baik'],
                'RAG' => ['baik', 'tidak baik'],
                'Supply AC' => null, // free_text, tidak ada pasangan
            ],
            'Kelistrikan' => [
                'Signage' => ['nyala', 'mati'],
                'Lampu Dalam Unit' => ['nyala', 'mati'],
                'Lampu Standby' => ['ada', 'tidak ada'],
                'Box Panel Listrik' => ['baik', 'tidak baik'],
                'Jalur Kabel' => ['rapi', 'tidak rapi'],
            ],
            'Susunan Barang' => [
                'Susunan Barang' => ['rapi', 'tidak rapi'],
                'Daya Tampung' => ['cukup', 'overload'],
                'Kebersihan' => ['rapi', 'tidak rapi'],
                'Pest Control' => ['ada', 'tidak ada'],
                'Kondisi Ruangan' => ['baik', 'tidak baik'],
            ],
            'Security' => [
                'CCTV' => ['ada', 'tidak ada'],
                'RF Security Gate' => ['ada', 'tidak ada'],
                'Alarm Sensor' => ['ada', 'tidak ada'],
                'Entrance Unit' => ['pintu kaca', 'rolling door'],
                'Kunci/Gembok Unit' => ['baik', 'tidak baik'],
            ],
            'Protection' => [
                'Springkler' => ['ada', 'tidak ada'],
                'Heat Detector' => ['ada', 'tidak ada'],
                'Smoke Detector' => ['ada', 'tidak ada'],
                'Apar' => ['ada', 'tidak ada'],
            ],
        ];

        foreach ($sectionsWithCustomPairs as $sectionName => $items) {
            $section = $template->sections()->create([
                'name' => $sectionName,
                'order' => $order++,
            ]);

            $itemOrder = 1;
            foreach ($items as $label => $pair) {
                $section->items()->create([
                    'label' => $label,
                    'type' => $pair === null ? 'free_text' : 'binary_choice',
                    'option_positive' => $pair[0] ?? null,
                    'option_negative' => $pair[1] ?? null,
                    'photo_required_on_negative' => $pair !== null, // free_text tidak relevan
                    'order' => $itemOrder++,
                ]);
            }
        }
    }

    /**
     * Helper khusus F&B — semua section pakai pasangan Ok/Tidak yang seragam.
     */
    private function createSections(ChecklistTemplate $template, array $sections, string $optionPositive, string $optionNegative): void
    {
        $order = 1;
        foreach ($sections as $sectionName => $labels) {
            $section = $template->sections()->create([
                'name' => $sectionName,
                'order' => $order++,
            ]);

            $itemOrder = 1;
            foreach ($labels as $label) {
                $section->items()->create([
                    'label' => $label,
                    'type' => 'binary_choice',
                    'option_positive' => $optionPositive,
                    'option_negative' => $optionNegative,
                    'photo_required_on_negative' => true,
                    'order' => $itemOrder++,
                ]);
            }
        }
    }
}