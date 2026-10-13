const statusTone = {
    pending: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-600',
};

const stepDot = {
    pending: 'bg-amber-400',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
};

const stepLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
}

export default function PermitStatus({ permit }) {
    const approvals = permit.approvals ?? [];

    return (
        <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12">
            <div className="w-full max-w-2xl mx-auto space-y-4">
                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-6 sm:p-8 text-center">
                    <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto mx-auto" />
                    <p className={`mt-4 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${statusTone[permit.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {permit.status_label}
                    </p>
                    <h1 className="mt-2 font-mono text-xl font-bold text-gray-900">{permit.permit_number}</h1>
                    <p className="mt-1 text-sm text-gray-500">{permit.store_name}{permit.job_type ? ` · ${permit.job_type}` : ''}</p>
                    {(permit.activity_labels ?? []).length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">{permit.activity_labels.join(' · ')}</p>
                    )}
                </div>

                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Jadwal & Lokasi</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">Tanggal kerja</span>
                            <span className="text-gray-900 font-medium">
                                {formatDate(permit.work_start_date)}
                                {permit.work_end_date && permit.work_end_date !== permit.work_start_date ? ` s/d ${formatDate(permit.work_end_date)}` : ''}
                            </span>
                        </div>
                        {(permit.work_start_time || permit.work_end_time) && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Jam</span>
                                <span className="text-gray-900 font-medium tabular-nums">
                                    {(permit.work_start_time ?? '').replace(':', '.')}{permit.work_end_time ? `–${permit.work_end_time.replace(':', '.')}` : ''} WITA
                                </span>
                            </div>
                        )}
                        {permit.location && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Lokasi</span>
                                <span className="text-gray-900 font-medium text-right">{permit.location}</span>
                            </div>
                        )}
                        {permit.pic_name && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">PIC</span>
                                <span className="text-gray-900 font-medium">{permit.pic_name}</span>
                            </div>
                        )}
                        {permit.expires_label && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Berlaku sampai</span>
                                <span className="text-gray-900 font-medium">{permit.expires_label}</span>
                            </div>
                        )}
                    </div>
                </div>

                {approvals.length > 0 && (
                    <div className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Progres Persetujuan</p>
                        <ol className="space-y-2.5">
                            {approvals.map((a, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${stepDot[a.status] ?? 'bg-gray-300'}`} aria-hidden="true" />
                                    <span className="text-gray-900 font-medium">{a.label}</span>
                                    <span className="text-gray-400 text-xs ml-auto shrink-0">{stepLabel[a.status] ?? a.status}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                <p className="text-center text-[11px] text-gray-400">
                    Halaman publik — untuk perubahan/pengajuan baru hubungi kantor manajemen.
                </p>
            </div>
        </div>
    );
}
