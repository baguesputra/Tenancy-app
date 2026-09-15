import PortalLayout from '@/Layouts/PortalLayout';
import FormSection from '@/Components/Form/FormSection';
import Badge from '@/Components/Badge';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const statusLabel = { pending: 'Sedang Diproses', completed: 'Selesai', rejected: 'Ditolak' };

export default function Show({ permit }) {
    const rejectedStep = permit.approvals.find((a) => a.status === 'rejected');

    return (
        <PortalLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-2xl">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-xl font-semibold text-gray-900">{permit.permit_number}</h1>
                    <Badge color={statusColor[permit.status]}>{statusLabel[permit.status]}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-6">{permit.job_type || '—'} — {permit.request_date}</p>

                {permit.status === 'rejected' && rejectedStep && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
                        <p className="font-medium mb-1">Permohonan Ditolak</p>
                        <p>{rejectedStep.notes || 'Tidak ada alasan spesifik yang dicatat.'}</p>
                    </div>
                )}

                {permit.is_flagged && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-4 rounded-lg mb-4">
                        <p className="font-medium mb-1">⚠ Ada Catatan Ketidaksesuaian</p>
                        <p>Security menemukan ketidaksesuaian saat pemeriksaan fisik. Lihat detail di bagian bawah.</p>
                    </div>
                )}

                {permit.status === 'completed' && !permit.is_flagged && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4 rounded-lg mb-4">
                        ✓ Permohonan sudah selesai diproses dan sesuai.
                    </div>
                )}

                {/* Timeline Approval */}
                <FormSection title="Progress Persetujuan">
                    <div className="relative pl-6">
                        <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-gray-100" />
                        {permit.approvals.map((a, idx) => (
                            <div key={a.id} className="relative pb-6 last:pb-0">
                                <div
                                    className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                                        a.status === 'approved'
                                            ? 'bg-[#1FA24C]'
                                            : a.status === 'rejected'
                                            ? 'bg-red-500'
                                            : 'bg-gray-200'
                                    }`}
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
                                </div>
                                <p className="text-sm font-medium text-gray-800">{a.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {a.status === 'approved' && a.approved_at
                                        ? `Disetujui — ${new Date(a.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                        : a.status === 'rejected'
                                        ? 'Ditolak'
                                        : 'Menunggu'}
                                </p>
                            </div>
                        ))}
                    </div>
                </FormSection>

                {/* Recap pengajuan */}
                <FormSection title="Detail Pengajuan Anda">
                    <dl className="space-y-2.5 text-sm">
                        <RecapRow label="Jadwal" value={`${permit.work_start_date} s/d ${permit.work_end_date}`} />
                        <RecapRow label="Jam" value={`${permit.work_start_time ?? '—'} s/d ${permit.work_end_time ?? '—'}`} />
                        <RecapRow label="Jenis Pekerjaan" value={permit.job_type || '—'} />
                        {permit.is_external && (
                            <RecapRow label="Vendor" value={permit.contractor_company || '—'} />
                        )}
                    </dl>
                </FormSection>

                {/* Hasil pemeriksaan fisik */}
                <FormSection title="Hasil Pemeriksaan Fisik">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pekerja</h3>
                            <div className="space-y-1.5">
                                {permit.workers.map((w) => (
                                    <p key={w.id} className="text-sm text-gray-700 flex justify-between">
                                        <span>{w.name}</span>
                                        <span className={w.is_present ? 'text-emerald-600' : 'text-gray-400'}>
                                            {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                                        </span>
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Barang</h3>
                            <div className="space-y-3">
                                {permit.goods.map((g) => (
                                    <div key={g.id}>
                                        <p className="text-sm text-gray-700 flex justify-between">
                                            <span>{g.description} ({g.quantity_note})</span>
                                            <span className={g.is_verified ? 'text-emerald-600' : 'text-gray-400'}>
                                                {g.is_verified ? '✓' : 'Belum'}
                                            </span>
                                        </p>
                                        {g.mismatch_note && (
                                            <p className="text-xs text-amber-600 mt-1">⚠ {g.mismatch_note}</p>
                                        )}
                                        {g.photo_url && (
                                            <img src={g.photo_url} className="w-16 h-16 object-cover rounded-lg border border-gray-200 mt-1.5" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </FormSection>
            </div>
        </PortalLayout>
    );
}

function RecapRow({ label, value }) {
    return (
        <div className="flex justify-between">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-800 font-medium text-right max-w-[60%]">{value}</dd>
        </div>
    );
}