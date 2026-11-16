<?php

namespace App\Exports\Concerns;

use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

trait StandardExcelFormatting
{
    public function freezePane(): string
    {
        return 'A2';
    }

    public function styles(Worksheet $sheet): ?array
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 11,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '0F1E36'],
                ],
            ],
        ];
    }

    protected function safeCell(mixed $value, string $fallback = '—'): mixed
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        if (is_string($value) && preg_match('/^[=+@\t\r-]/', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
