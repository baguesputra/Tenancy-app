<?php

namespace App\Exports;

use App\Exports\Concerns\StandardExcelFormatting;
use App\Models\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithFreezePane;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;

class TenanciesExport implements FromQuery, ShouldAutoSize, WithFreezePane, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use StandardExcelFormatting;

    private const STATUS_LABELS = [
        'draft' => 'Draft',
        'active' => 'Aktif',
        'ended' => 'Berakhir',
        'terminated' => 'Diakhiri',
    ];

    public function __construct(private Builder $query) {}

    public function title(): string
    {
        return 'Kontrak Tenancy';
    }

    public function query(): Builder
    {
        return $this->query->with([
            'tenant:id,name',
            'unit:id,unit_code,branch_id',
            'unit.branch:id,name',
            'unitGroup:id,name',
        ]);
    }

    public function headings(): array
    {
        return [
            'No. Kontrak',
            'Nama Tenant',
            'Cabang',
            'Kode Unit',
            'Area Gabungan',
            'Luas Total (m²)',
            'Tanggal Mulai',
            'Tanggal Berakhir',
            'Sisa Hari',
            'Status',
            'Nilai Sewa (Rp)',
            'Periode Sewa',
            'Service Charge (Rp)',
            'Deposit (Rp)',
        ];
    }

    /**
     * @param  Tenancy  $tenancy
     */
    public function map($tenancy): array
    {
        $daysRemaining = $tenancy->end_date
            ? (int) now()->startOfDay()->diffInDays($tenancy->end_date->copy()->startOfDay(), false)
            : '—';

        return [
            $this->safeCell($tenancy->contract_number),
            $this->safeCell($tenancy->tenant?->name),
            $this->safeCell($tenancy->unit?->branch?->name),
            $this->safeCell($tenancy->unit?->unit_code),
            $this->safeCell($tenancy->unitGroup?->name),
            $tenancy->total_area_sqm ?? '—',
            $tenancy->start_date?->format('Y-m-d') ?? '—',
            $tenancy->end_date?->format('Y-m-d') ?? '—',
            $daysRemaining,
            self::STATUS_LABELS[$tenancy->status] ?? $tenancy->status,
            $tenancy->rent_value ?? '—',
            $this->safeCell($tenancy->rent_period),
            $tenancy->service_charge ?? '—',
            $tenancy->deposit_value ?? '—',
        ];
    }
}
