import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import FormSection from '@/Components/Form/FormSection';
import Badge from '@/Components/Badge';
import { formatDateID, formatDateRange, formatTimeRange } from '@/utils/format';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const statusLabel = { pending: 'Sedang Diproses', completed: 'Selesai', rejected: 'Ditolak' };

export default function Show({ permit, scan_url, qr_image, show_qr }) {
    const rejectedStep = permit.approvals.find((a) => a.status === 'rejected');

    return (
        <PortalLayout>
            <Link
                href="/portal/permits"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors w-fit rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36] animate-stagger-in"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke daftar
            </Link>

            <div className="mt-3 bg-white rounded-2xl border border-[#E2E5EA] p-5 sm:p-6 animate-stagger-in" style={{ animationDelay: '60ms' }}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="font-mono text-lg sm:text-xl font-bold text-gray-900 truncate">{permit.permit_number}</h1>
                        <p className="text-sm text-gray-500 mt-1">{permit.job_type || '—'} — {formatDateID(permit.request_date)}</p>
                    </div>
                    <Badge color={statusColor[permit.status]} variant="soft" size="md">{statusLabel[permit.status]}</Badge>
                </div>

                {permit.status === 'rejected' && rejectedStep && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mt-4" role="alert">
                        <p className="font-semibold mb-1">Permohonan ditolak</p>
                        <p>{rejectedStep.notes || 'Tidak ada alasan spesifik yang dicatat.'}</p>
                    </div>
                )}

                {permit.is_flagged && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl mt-4" role="alert">
                        <p className="font-semibold mb-1">Ada catatan ketidaksesuaian</p>
                        <p>Security menemukan ketidaksesuaian saat pemeriksaan fisik. Lihat detail di bawah.</p>
                    </div>
                )}

                {permit.status === 'completed' && !permit.is_flagged && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4 rounded-xl mt-4" role="status">
                        Permohonan selesai dan sesuai.
                    </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
                <FormSection title="Progress Persetujuan">
                    <ol className="relative pl-6">
                        <span className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-gray-100" aria-hidden="true" />
                        {permit.approvals.map((a) => (
                            <li key={a.id} className="relative pb-6 last:pb-0">
                                <span
                                    className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                                        a.status === 'approved'
                                            ? 'bg-[#1FA24C]'
                                            : a.status === 'rejected'
                                            ? 'bg-red-500'
                                            : a.status === 'pending' && isCurrent(a, permit.approvals)
                                            ? 'bg-amber-400 animate-pulse'
                                            : 'bg-gray-200'
                                    }`}
                                    aria-hidden="true"
                                >
                                    {a.status === 'approved' && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {a.status === 'rejected' && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </span>
                                <p className="text-sm font-medium text-gray-800">{a.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{stepTime(a)}</p>
                                {a.notes && a.status === 'rejected' && (
                                    <p className="text-xs text-red-600 mt-1">{a.notes}</p>
                                )}
                            </li>
                        ))}
                    </ol>
                </FormSection>

                <div className="space-y-4 lg:sticky lg:top-24">
                    <FormSection title="Detail Pengajuan">
                        <dl className="space-y-2.5 text-sm">
                            <RecapRow label="Jadwal" value={formatDateRange(permit.work_start_date, permit.work_end_date)} />
                            <RecapRow label="Jam" value={formatTimeRange(permit.work_start_time, permit.work_end_time)} />
                            <RecapRow label="Jenis Pekerjaan" value={permit.job_type || '—'} />
                            {permit.is_external && (
                                <RecapRow label="Vendor" value={permit.contractor_company || '—'} />
                            )}
                        </dl>
                    </FormSection>

                    {show_qr && (
                        <FormSection title="QR Check Security">
                            <div className="text-center">
                                {qr_image && (
                                    <img src={qr_image} alt={`QR ${permit.permit_number}`} className="w-44 h-44 mx-auto border border-gray-200 rounded-xl" />
                                )}
                                <p className="text-xs text-gray-500 mt-3">Tunjukkan ke Security untuk scan saat cek fisik</p>
                                <div className="mt-3 flex gap-2 justify-center">
                                    <a
                                        href={`/portal/permits/${permit.id}/qr.pdf`}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        Download PDF
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        Print
                                    </button>
                                </div>
                                {scan_url && <p className="mt-2 font-mono text-[10px] text-gray-400 break-all">{scan_url}</p>}
                            </div>
                        </FormSection>
                    )}

                    <FormSection title="Hasil Pemeriksaan Fisik">
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">Pekerja</h3>
                                <ul className="space-y-1.5">
                                    {permit.workers.map((w) => (
                                        <li key={w.id} className="text-sm text-gray-700 flex justify-between gap-3">
                                            <span className="min-w-0 truncate">{w.name}</span>
                                            <span className={w.is_present ? 'text-emerald-600 font-medium shrink-0' : 'text-gray-400 shrink-0'}>
                                                {w.is_present ? 'Hadir' : 'Belum dicek'}
                                            </span>
                                        </li>
                                    ))}
                                    {permit.workers.length === 0 && <li className="text-xs text-gray-400">Tidak ada data pekerja.</li>}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">Barang</h3>
                                <ul className="space-y-3">
                                    {permit.goods.map((g) => (
                                        <li key={g.id}>
                                            <p className="text-sm text-gray-700 flex justify-between gap-3">
                                                <span className="min-w-0">{g.description} <span className="text-gray-400">({g.quantity_note || '—'})</span></span>
                                                <span className={g.is_verified ? 'text-emerald-600 font-medium shrink-0' : 'text-gray-400 shrink-0'}>
                                                    {g.is_verified ? 'Terverifikasi' : 'Belum'}
                                                </span>
                                            </p>
                                            {g.mismatch_note && (
                                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-1.5">{g.mismatch_note}</p>
                                            )}
                                            {g.photo_url && (
                                                <img src={g.photo_url} alt={`Foto ${g.description}`} loading="lazy" className="w-16 h-16 object-cover rounded-lg border border-gray-200 mt-1.5" />
                                            )}
                                        </li>
                                    ))}
                                    {permit.goods.length === 0 && <li className="text-xs text-gray-400">Tidak ada data barang.</li>}
                                </ul>
                            </div>
                        </div>
                    </FormSection>
                </div>
            </div>
        </PortalLayout>
    );
}

function isCurrent(step, all) {
    return step.status === 'pending' && all.findIndex((s) => s.status === 'pending') === all.indexOf(step);
}

function stepTime(a) {
    if (a.status === 'approved' && a.approved_at) {
        return `Disetujui — ${new Date(a.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    }
    if (a.status === 'rejected') return 'Ditolak';
    return 'Menunggu';
}

function RecapRow({ label, value }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-gray-500 shrink-0">{label}</dt>
            <dd className="text-gray-800 font-medium text-right min-w-0">{value}</dd>
        </div>
    );
}
