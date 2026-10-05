function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
}

export default function Show({ track }) {
    const percent = Math.max(0, Math.min(100, track.progress_percent ?? 0));

    return (
        <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12">
            <div className="w-full max-w-2xl mx-auto space-y-4">
                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-6 sm:p-8 text-center">
                    <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto mx-auto" />
                    <p className="mt-4 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Pengajuan Anda masih dalam proses
                    </p>
                    <h1 className="mt-2 text-xl font-bold text-gray-900">{track.tenant_name}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {track.loo_number} · {track.branch_name}{track.unit_code ? ` · Unit ${track.unit_code}` : ''}
                    </p>
                    <p className="mt-3 text-sm text-gray-600">
                        Tahap saat ini: <span className="font-semibold text-gray-900">{track.phase}</span>
                    </p>
                </div>

                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kelengkapan Berkas</p>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{percent}%</span>
                    </div>
                    <div
                        className="h-2 rounded-full bg-gray-100"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Kelengkapan berkas"
                    >
                        <div
                            className="h-2 rounded-full bg-[#0F1E36] transition-all duration-300"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className={`mt-4 rounded-xl px-4 py-3 text-xs ${track.tenant_signed ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                        {track.tenant_signed
                            ? '✓ Tanda tangan penyewa sudah diterima. Terima kasih.'
                            : 'Menunggu tanda tangan penyewa. Tim kami akan menghubungi Anda saat tiba gilirannya.'}
                    </div>
                </div>

                <div className="bg-white border border-[#E2E5EA] rounded-2xl p-5 sm:p-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tanggal Penting</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">Diajukan</span>
                            <span className="text-gray-900 font-medium">{formatDate(track.submitted_at)}</span>
                        </div>
                        {track.completed_at && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Selesai</span>
                                <span className="text-gray-900 font-medium">{formatDate(track.completed_at)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-[11px] text-gray-400 px-4">
                    Halaman ini hanya menampilkan status proses pengajuan. Hubungi tim marketing kami bila ada pertanyaan.
                    {track.expires_label ? ` Link berlaku hingga ${track.expires_label}.` : ''}
                </p>
            </div>
        </div>
    );
}
