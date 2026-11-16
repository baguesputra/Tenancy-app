<?php

namespace App\Exports\Sheets;

use App\Exports\Concerns\StandardExcelFormatting;
use App\Models\InspectionFinding;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithFreezePane;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;

class InspectionFindingsSheet implements FromQuery, ShouldAutoSize, WithFreezePane, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use StandardExcelFormatting;

    private const SEVERITY_LABELS = [
        'minor' => 'Ringan (Minor)',
        'major' => 'Sedang (Major)',
        'critical' => 'Kritis (Critical)',
    ];

    private const STATUS_LABELS = [
        'open' => 'Perlu Perbaikan',
        'submitted' => 'Menunggu Verifikasi',
        'verified' => 'Terverifikasi',
        'rejected' => 'Ditolak',
    ];

    public function __construct(private Builder $query) {}

    public function title(): string
    {
        return 'Temuan & CAPA';
    }

    public function query(): Builder
    {
        return $this->query->with([
            'inspection:id,inspection_session_id',
            'inspection.session:id,started_at',
            'branch:id,name',
            'tenant:id,name',
            'tenant.activeTenancy:id,tenant_id,unit_id',
            'tenant.activeTenancy.unit:id,unit_code',
            'verifier:id,name',
        ]);
    }

    public function headings(): array
    {
        return [
            'Tanggal Sesi',
            'Cabang',
            'Nama Tenant',
            'Kode Unit',
            'Bagian Checklist',
            'Item Temuan',
            'Catatan Inspector',
            'Tingkat Keparahan',
            'Status CAPA',
            'Tenggat Perbaikan',
            'Terlambat',
            'Instruksi Perbaikan',
            'Catatan Perbaikan',
            'Pelapor Perbaikan',
            'Tgl Kirim Bukti',
            'Verifikator',
            'Tgl Verifikasi',
        ];
    }

    /**
     * @param  InspectionFinding  $finding
     */
    public function map($finding): array
    {
        return [
            $finding->inspection?->session?->started_at?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
            $this->safeCell($finding->branch?->name),
            $this->safeCell($finding->tenant?->name),
            $this->safeCell($finding->tenant?->activeTenancy?->unit?->unit_code),
            $this->safeCell($finding->section_name),
            $this->safeCell($finding->item_label),
            $this->safeCell($finding->finding_note),
            self::SEVERITY_LABELS[$finding->severity] ?? $finding->severity,
            self::STATUS_LABELS[$finding->status] ?? $finding->status,
            $finding->due_date?->format('Y-m-d') ?? '—',
            $finding->is_overdue ? 'Ya' : 'Tidak',
            $this->safeCell($finding->action_required),
            $this->safeCell($finding->resolution_note),
            $this->safeCell($finding->resolved_by_name),
            $finding->resolved_at?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
            $this->safeCell($finding->verifier?->name),
            $finding->verified_at?->timezone('Asia/Makassar')->format('Y-m-d H:i') ?? '—',
        ];
    }
}
