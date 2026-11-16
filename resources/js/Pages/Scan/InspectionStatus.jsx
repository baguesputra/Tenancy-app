import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { formatDateID, formatDateTimeShortID } from '@/utils/format';

const severityMeta = {
    minor: { label: 'Ringan', cls: 'bg-gray-100 text-gray-700' },
    major: { label: 'Sedang', cls: 'bg-amber-100 text-amber-800' },
    critical: { label: 'Kritis', cls: 'bg-red-100 text-red-700' },
};

const capaStatusMeta = {
    open: { label: 'Perlu Perbaikan', cls: 'bg-amber-100 text-amber-800' },
    submitted: { label: 'Menunggu Verifikasi', cls: 'bg-blue-100 text-blue-800' },
    verified: { label: 'Terverifikasi', cls: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'Perlu Perbaikan Ulang', cls: 'bg-red-100 text-red-700' },
};

export default function InspectionStatus({ token, inspection, checklistSnapshot, findings = [], progress }) {
    const { flash } = usePage().props;
    const sections = checklistSnapshot?.sections ?? [];
    const pct = progress?.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;
    const done = inspection.status === 'completed' || inspection.session_status === 'completed';

    const findingsByItem = Object.fromEntries(
        findings.map((f) => [String(f.checklist_item_id ?? f.id), f])
    );

    const [openFindingId, setOpenFindingId] = useState(null);
    const [reporterName, setReporterName] = useState('');
    const [resolutionNote, setResolutionNote] = useState('');
    const [photo, setPhoto] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const openUploadForm = (finding) => {
        setFormError('');
        setReporterName(finding.resolved_by_name ?? '');
        setResolutionNote(finding.resolution_note ?? '');
        setPhoto(null);
        setOpenFindingId(finding.id);
    };

    const submitResolution = (e, findingId) => {
        e.preventDefault();
        if (!token) return;
        if (!photo) {
            setFormError('Foto bukti perbaikan wajib dilampirkan.');
            return;
        }
        setSubmitting(true);
        setFormError('');
        router.post(
            `/scan/${token}/findings/${findingId}/submit`,
            {
                resolved_by_name: reporterName,
                resolution_note: resolutionNote,
                photo,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setOpenFindingId(null);
                    setPhoto(null);
                },
                onError: (errors) => {
                    setFormError(Object.values(errors)[0] ?? 'Gagal mengirim bukti perbaikan.');
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12">
            <div className="w-full max-w-2xl mx-auto space-y-4">
                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-6 sm:p-8 text-center">
                    <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto mx-auto" />
                    <p className={`mt-4 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {done ? 'Sidak Selesai' : 'Sidak Berjalan'}
                    </p>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">{inspection.store_name}</h1>
                    <p className="mt-1 text-sm text-gray-500">{inspection.template_name}</p>
                    {(inspection.location || inspection.session_started_at) && (
                        <p className="mt-1 text-xs text-gray-500">
                            {[inspection.location, inspection.session_started_at].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    <p className="mt-3 text-sm text-gray-600">
                        Terisi <span className="font-semibold text-gray-900 tabular-nums">{progress?.answered ?? 0}/{progress?.total ?? 0}</span> item ({pct}%)
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres checklist">
                        <div className="h-2 rounded-full bg-[#0F1E36] transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                </div>

                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl px-4 py-3">
                        {flash.success}
                    </div>
                )}

                {findings.length > 0 && (
                    <div className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Tindak Lanjut Temuan (CAPA)
                            </p>
                            <span className="text-xs font-medium text-gray-600">
                                {findings.filter((f) => f.status !== 'verified').length} terbuka / {findings.length} temuan
                            </span>
                        </div>

                        <div className="space-y-3">
                            {findings.map((f) => {
                                const sev = severityMeta[f.severity] ?? severityMeta.minor;
                                const st = capaStatusMeta[f.status] ?? capaStatusMeta.open;
                                const canSubmit = token && (f.status === 'open' || f.status === 'rejected');
                                const isFormOpen = openFindingId === f.id;

                                return (
                                    <div key={f.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                {f.section_name && (
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{f.section_name}</p>
                                                )}
                                                <p className="text-sm font-semibold text-gray-900">{f.item_label}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${sev.cls}`}>{sev.label}</span>
                                                <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${st.cls}`}>{st.label}</span>
                                                {f.is_overdue && (
                                                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-100 text-red-700">Terlambat</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-600 space-y-1">
                                            {f.due_date && (
                                                <p className={f.is_overdue ? 'text-red-700 font-medium' : ''}>
                                                    Tenggat perbaikan: <span className="font-semibold">{formatDateID(f.due_date)}</span>
                                                </p>
                                            )}
                                            {f.action_required && (
                                                <p className="text-gray-700">Instruksi: {f.action_required}</p>
                                            )}
                                            {f.verification_note && (
                                                <p className={f.status === 'rejected' ? 'text-red-700' : 'text-emerald-700'}>
                                                    Catatan verifikasi: {f.verification_note}
                                                </p>
                                            )}
                                        </div>

                                        {f.resolved_at && (
                                            <div className="flex items-start gap-2.5 pt-1 border-t border-gray-200/80 text-xs">
                                                {f.resolution_photo_url && (
                                                    <a href={f.resolution_photo_url} target="_blank" rel="noreferrer" className="shrink-0">
                                                        <img src={f.resolution_photo_url} alt="Bukti perbaikan" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                                                    </a>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-800">{f.resolution_note}</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        Dilaporkan oleh {f.resolved_by_name ?? '—'} · {formatDateTimeShortID(f.resolved_at)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {canSubmit && !isFormOpen && (
                                            <button
                                                type="button"
                                                onClick={() => openUploadForm(f)}
                                                className="mt-1 inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-lg transition"
                                            >
                                                {f.status === 'rejected' ? 'Kirim Ulang Bukti Perbaikan' : 'Kirim Bukti Perbaikan'}
                                            </button>
                                        )}

                                        {canSubmit && isFormOpen && (
                                            <form onSubmit={(e) => submitResolution(e, f.id)} className="mt-2 pt-2 border-t border-gray-200 space-y-2.5">
                                                {formError && (
                                                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{formError}</p>
                                                )}
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nama Pelapor / PIC Toko</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={reporterName}
                                                        onChange={(e) => setReporterName(e.target.value)}
                                                        placeholder="Nama penanggung jawab toko"
                                                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Keterangan Perbaikan</label>
                                                    <textarea
                                                        rows={2}
                                                        required
                                                        value={resolutionNote}
                                                        onChange={(e) => setResolutionNote(e.target.value)}
                                                        placeholder="Jelaskan perbaikan yang sudah dilakukan..."
                                                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Foto Bukti Perbaikan</label>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        required
                                                        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                                                        className="w-full text-xs text-gray-600"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={submitting}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-lg transition disabled:opacity-50"
                                                    >
                                                        {submitting ? 'Mengirim...' : 'Kirim Bukti'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenFindingId(null)}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg"
                                                    >
                                                        Batal
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {sections.map((section, si) => (
                    <div key={si} className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{section.name ?? `Bagian ${si + 1}`}</p>
                        <div className="space-y-3">
                            {(section.items ?? []).map((item) => {
                                const finding = findingsByItem[String(item.id)];
                                const findingStatus = finding ? (capaStatusMeta[finding.status] ?? capaStatusMeta.open) : null;

                                return (
                                    <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-gray-900">{item.label ?? item.question ?? '—'}</p>
                                            {findingStatus && (
                                                <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${findingStatus.cls}`}>
                                                    CAPA: {findingStatus.label}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm">
                                            {item.answer?.value
                                                ? <span className={`font-semibold ${item.answer.value === item.option_negative ? 'text-red-700' : 'text-emerald-700'}`}>{item.answer.value}</span>
                                                : <span className="text-gray-400">Belum diisi</span>}
                                        </p>
                                        {item.answer?.note && (
                                            <p className="mt-1 text-xs text-gray-500">{item.answer.note}</p>
                                        )}
                                        {(item.answer?.photos ?? []).length > 0 && (
                                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                                                {item.answer.photos.map((p) => (
                                                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                                                        <img src={p.url} alt="Foto sidak" className="w-full h-20 object-cover rounded-lg border border-gray-200" loading="lazy" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <p className="text-center text-[11px] text-gray-400">
                    Halaman publik — untuk pertanyaan hubungi kantor manajemen.
                </p>
            </div>
        </div>
    );
}
