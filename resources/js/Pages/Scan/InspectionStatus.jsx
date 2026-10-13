export default function InspectionStatus({ inspection, checklistSnapshot, progress }) {
    const sections = checklistSnapshot?.sections ?? [];
    const pct = progress?.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;
    const done = inspection.status === 'completed' || inspection.session_status === 'completed';

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
                    <p className="mt-3 text-sm text-gray-600">
                        Terisi <span className="font-semibold text-gray-900 tabular-nums">{progress?.answered ?? 0}/{progress?.total ?? 0}</span> item ({pct}%)
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres checklist">
                        <div className="h-2 rounded-full bg-[#0F1E36] transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                </div>

                {sections.map((section, si) => (
                    <div key={si} className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{section.title ?? `Bagian ${si + 1}`}</p>
                        <div className="space-y-3">
                            {(section.items ?? []).map((item) => (
                                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
                                    <p className="text-sm font-medium text-gray-900">{item.label ?? item.question ?? '—'}</p>
                                    <p className="mt-1 text-sm">
                                        {item.answer?.value
                                            ? <span className={`font-semibold ${item.answer.value === 'Tidak' ? 'text-red-700' : 'text-emerald-700'}`}>{item.answer.value}</span>
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
                            ))}
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
