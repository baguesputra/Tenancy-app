<?php

namespace App\Exports;

use App\Exports\Concerns\StandardExcelFormatting;
use App\Models\PermitRequest;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithFreezePane;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;

class PermitRequestsExport implements FromQuery, ShouldAutoSize, WithFreezePane, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use StandardExcelFormatting;

    private const STATUS_LABELS = [
        'pending' => 'Menunggu Persetujuan',
        'completed' => 'Selesai',
        'approved' => 'Disetujui',
        'rejected' => 'Ditolak',
        'cancelled' => 'Dibatalkan',
    ];

    /**
     * @param  array<string, string>  $activityLabels
     * @param  array<string, string>  $categoryLabels
     */
    public function __construct(
        private Builder $query,
        private array $activityLabels,
        private array $categoryLabels,
    ) {}

    public function title(): string
    {
        return 'Rekap Surat Izin';
    }

    public function query(): Builder
    {
        return $this->query->with([
            'tenant:id,name',
            'branch:id,name',
            'approvals' => fn ($q) => $q->orderBy('order'),
        ]);
    }

    public function headings(): array
    {
        return [
            'No. Izin',
            'Tanggal Pengajuan',
            'Cabang',
            'Kategori',
            'Aktivitas',
            'Pekerjaan / Kegiatan',
            'Tenant / Vendor',
            'Lokasi Unit',
            'Tanggal Mulai',
            'Tanggal Selesai',
            'Jam Kerja',
            'PIC',
            'No. HP PIC',
            'Kontraktor Eksternal',
            'Status',
            'Tahap Aktif / Terakhir',
            'Waktu Disetujui BS',
        ];
    }

    /**
     * @param  PermitRequest  $permit
     */
    public function map($permit): array
    {
        $activities = collect($permit->activity_types ?? [])
            ->map(fn ($v) => $this->activityLabels[$v] ?? $v)
            ->implode(', ');

        $location = collect([
            $permit->floor_snapshot,
            $permit->block_snapshot,
            $permit->unit_number_snapshot,
        ])->filter()->implode(' / ');

        $timeRange = trim(($permit->work_start_time?->format('H:i') ?? '')
            .($permit->work_end_time ? '–'.$permit->work_end_time->format('H:i') : ''));

        $currentStep = $permit->approvals->firstWhere('status', 'pending')
            ?? $permit->approvals->last();
        $bsApprovedAt = $permit->approvals->firstWhere('step_key', 'bs')?->approved_at;

        return [
            $this->safeCell($permit->permit_number),
            $permit->request_date?->format('Y-m-d') ?? '—',
            $this->safeCell($permit->branch?->name),
            $this->safeCell($this->categoryLabels[$this->resolveCategory($permit)] ?? '—'),
            $this->safeCell($activities),
            $this->safeCell($permit->job_type ?: $permit->event_name),
            $this->safeCell($permit->store_name_snapshot ?: $permit->tenant?->name),
            $this->safeCell($location),
            $permit->work_start_date?->format('Y-m-d') ?? '—',
            $permit->work_end_date?->format('Y-m-d') ?? '—',
            $timeRange !== '' ? $timeRange.' WITA' : '—',
            $this->safeCell($permit->pic_name),
            $this->safeCell($permit->pic_phone),
            $permit->is_external ? ($this->safeCell($permit->contractor_company ?: 'Ya')) : 'Tidak',
            self::STATUS_LABELS[$permit->status] ?? $permit->status,
            $this->safeCell($currentStep?->label),
            $bsApprovedAt?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
        ];
    }

    private function resolveCategory(PermitRequest $permit): string
    {
        $types = $permit->activity_types ?? [];
        if (in_array('pameran', $types, true)) {
            return 'pameran';
        }
        if (in_array('langganan_parkir', $types, true)) {
            return 'parkir';
        }
        if (in_array('customer_form', $types, true)) {
            return 'customer';
        }
        if (! empty(array_intersect(['event', 'meeting_internal', 'stock_opname'], $types))) {
            return 'kegiatan';
        }

        return $permit->tenant_id ? 'tenant' : 'vendor';
    }
}
