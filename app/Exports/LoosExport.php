<?php

namespace App\Exports;

use App\Exports\Concerns\StandardExcelFormatting;
use App\Models\Loo;
use App\Models\LooSection;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithFreezePane;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;

class LoosExport implements FromQuery, ShouldAutoSize, WithFreezePane, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use StandardExcelFormatting;

    private const STATUS_LABELS = [
        'draft' => 'Draft',
        'pengisian_divisi' => 'Pengisian Divisi',
        'pengukuran_ulang' => 'Pengukuran Ulang',
        'sebelum_fitout' => 'Sebelum Fitout',
        'setelah_fitout' => 'Setelah Fitout',
        'completed' => 'Selesai',
        'cancelled' => 'Dibatalkan',
    ];

    private const STAGE_LABELS = [
        'marketing' => 'Pengisian Divisi',
        'pre_handover' => 'Pengukuran Ulang',
        'ba_handover' => 'Sebelum Fitout',
        'fitout' => 'Setelah Fitout',
        'completed' => 'Completed',
    ];

    public function __construct(
        private Builder $query,
        private bool $hideFinancial = false,
    ) {}

    public function title(): string
    {
        return 'Progres & Aging LOO';
    }

    public function query(): Builder
    {
        return $this->query->with([
            'branch:id,name',
            'tenant:id,name',
            'marketing:id,name',
            'sections:id,loo_id,section_key,is_submitted,data,submitted_at',
        ]);
    }

    public function headings(): array
    {
        $headings = [
            'No. LOO',
            'Cabang',
            'Tenant / Calon Tenant',
            'Status',
            'Stage Aktif',
            'Tgl Terima LOO',
            'Tgl Submit',
            'Tgl Selesai',
            'Lama Proses (Hari)',
            'Penginput',
            'Legalitas',
            'Biaya & Termin',
            'Manajemen Tenant',
            'Pengukuran Ulang',
            'Pra-Fitout',
            'Pasca-Fitout',
        ];

        if (! $this->hideFinancial) {
            $headings = array_merge($headings, [
                'Sewa Bulanan (Rp)',
                'Service Charge (Rp)',
                'Luas LOO (m²)',
            ]);
        }

        return $headings;
    }

    /**
     * @param  Loo  $loo
     */
    public function map($loo): array
    {
        $sections = $loo->sections->keyBy('section_key');
        $endRef = $loo->completed_at ?? $loo->cancelled_at ?? now();
        $days = $loo->created_at ? (int) $loo->created_at->diffInDays($endRef) : 0;

        $row = [
            $this->safeCell($loo->loo_number),
            $this->safeCell($loo->branch?->name),
            $this->safeCell($loo->tenant?->name ?? $loo->prospective_tenant_name),
            self::STATUS_LABELS[$loo->status] ?? $loo->status,
            self::STAGE_LABELS[$loo->current_stage] ?? $loo->current_stage,
            $loo->loo_received_date?->format('Y-m-d') ?? '—',
            $loo->submitted_at?->timezone('Asia/Makassar')->format('Y-m-d') ?? '—',
            $loo->completed_at?->timezone('Asia/Makassar')->format('Y-m-d') ?? '—',
            $days,
            $this->safeCell($loo->marketing?->name),
            $this->sectionState($sections->get('legalitas')),
            $this->sectionState($sections->get('biaya_termin')),
            $this->sectionState($sections->get('manajemen_tenant')),
            $this->sectionState($sections->get('pre_handover')),
            $this->sectionState($sections->get('fitout_checklist_pre')),
            $this->sectionState($sections->get('fitout_checklist_post')),
        ];

        if (! $this->hideFinancial) {
            $acct = $sections->get('biaya_termin')?->data ?? [];
            $row = array_merge($row, [
                $acct['monthly_rent'] ?? '—',
                $acct['service_charge'] ?? '—',
                $acct['area_sqm_loo'] ?? '—',
            ]);
        }

        return $row;
    }

    private function sectionState(?LooSection $section): string
    {
        if (! $section) {
            return 'Belum Diisi';
        }

        return $section->is_submitted ? 'Disubmit' : 'Draft';
    }
}
