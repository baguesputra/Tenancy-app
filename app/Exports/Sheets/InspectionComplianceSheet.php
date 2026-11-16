<?php

namespace App\Exports\Sheets;

use App\Exports\Concerns\StandardExcelFormatting;
use App\Models\Inspection;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithFreezePane;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;

class InspectionComplianceSheet implements FromQuery, ShouldAutoSize, WithFreezePane, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use StandardExcelFormatting;

    public function __construct(private Builder $query) {}

    public function title(): string
    {
        return 'Rekap Kepatuhan';
    }

    public function query(): Builder
    {
        return $this->query->with([
            'session:id,branch_id,user_id,creator_name_snapshot,started_at,ended_at,status',
            'session.branch:id,name',
            'session.user:id,name',
            'session.participants:id,inspection_session_id,name_snapshot',
            'tenant:id,name',
            'tenant.activeTenancy:id,tenant_id,unit_id',
            'tenant.activeTenancy.unit:id,unit_code',
            'answers.checklistItem:id,type,option_positive,option_negative',
        ]);
    }

    public function headings(): array
    {
        return [
            'Tanggal Sesi',
            'Status Sesi',
            'Cabang',
            'PIC Sidak',
            'Tim Peserta',
            'Nama Tenant',
            'Kode Unit',
            'Template Checklist',
            'Terjawab',
            'Total Item',
            'Item Positif',
            'Item Negatif',
            'Skor Kepatuhan (%)',
            'Status Inspeksi',
            'Jam Selesai',
        ];
    }

    /**
     * @param  Inspection  $inspection
     */
    public function map($inspection): array
    {
        $itemMeta = [];
        $totalItems = 0;
        foreach ($inspection->checklist_snapshot['sections'] ?? [] as $section) {
            foreach ($section['items'] ?? [] as $item) {
                $totalItems++;
                $itemMeta[(string) ($item['id'] ?? '')] = $item;
            }
        }

        $answered = 0;
        $positive = 0;
        $negative = 0;

        foreach ($inspection->answers as $answer) {
            if ($answer->value === null || $answer->value === '') {
                continue;
            }
            $answered++;
            $meta = $itemMeta[(string) $answer->checklist_item_id] ?? [];
            $type = $meta['type'] ?? $answer->checklistItem?->type;
            if ($type !== 'binary_choice') {
                continue;
            }
            $pos = $meta['option_positive'] ?? $answer->checklistItem?->option_positive;
            $neg = $meta['option_negative'] ?? $answer->checklistItem?->option_negative;
            if ($pos !== null && $answer->value === $pos) {
                $positive++;
            } elseif ($neg !== null && $answer->value === $neg) {
                $negative++;
            }
        }

        $binaryTotal = $positive + $negative;
        $score = $binaryTotal > 0 ? round(($positive / $binaryTotal) * 100, 1).'%' : '—';

        $participants = $inspection->session?->participants
            ?->pluck('name_snapshot')
            ->filter()
            ->implode(', ');

        return [
            $inspection->session?->started_at?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
            $inspection->session?->status === 'completed' ? 'Selesai' : 'Berlangsung',
            $this->safeCell($inspection->session?->branch?->name),
            $this->safeCell($inspection->session?->pic_name),
            $this->safeCell($participants),
            $this->safeCell($inspection->tenant?->name),
            $this->safeCell($inspection->tenant?->activeTenancy?->unit?->unit_code),
            $this->safeCell($inspection->checklist_snapshot['template_name'] ?? null),
            $answered,
            $totalItems,
            $positive,
            $negative,
            $score,
            $inspection->status === 'completed' ? 'Selesai' : 'Draft',
            $inspection->completed_at?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
        ];
    }
}
