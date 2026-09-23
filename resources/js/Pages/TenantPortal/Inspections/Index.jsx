import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import { formatDateID } from '@/utils/format';

const statusColor = { draft: 'gray', active: 'gray', completed: 'green', ended: 'yellow', terminated: 'red' };
const statusLabel = { draft: 'Draft', active: 'Aktif', completed: 'Selesai', ended: 'Berakhir', terminated: 'Diakhiri' };

export default function Index({ inspections, sidak_active }) {
    return (
        <PortalLayout>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight animate-stagger-in">Hasil Sidak</h1>
            <p className="text-sm text-gray-500 mt-0.5 animate-stagger-in">Riwayat pemeriksaan toko — hanya lihat, tidak bisa diubah</p>

            {sidak_active && (
                <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-2xl flex items-center gap-3 animate-stagger-in" style={{ animationDelay: '60ms' }} role="status">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden="true" />
                    <p><span className="font-semibold">Sedang dilaksanakan penyidakan</span> di toko Anda. Hasil muncul di sini setelah sesi selesai.</p>
                </div>
            )}

            <div className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in" style={{ animationDelay: '120ms' }}>
                <div className="divide-y divide-gray-100">
                    {(inspections?.data ?? []).map((i) => (
                        <Link
                            key={i.id}
                            href={`/portal/inspections/${i.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900 truncate">{i.template_name}</span>
                                <span className="block text-xs text-gray-400 mt-0.5 truncate">
                                    {i.session_started_at ? formatDateID(i.session_started_at) : '—'} · Terjawab {i.answered}/{i.total}
                                    {i.is_flagged ? ' · Perlu perhatian' : ''}
                                </span>
                            </span>
                            <Badge color={statusColor[i.session_status] ?? statusColor[i.status]} variant="soft" size="sm">
                                {i.session_status === 'in_progress' ? 'Penyidakan' : (statusLabel[i.status] ?? i.status)}
                            </Badge>
                        </Link>
                    ))}
                    {(inspections?.data ?? []).length === 0 && (
                        <p className="px-5 py-10 text-sm text-gray-400 text-center">
                            {sidak_active ? 'Penyidakan masih berjalan. Hasil muncul setelah sesi selesai.' : 'Belum ada hasil sidak.'}
                        </p>
                    )}
                </div>
                <Pagination meta={inspections} links={inspections?.links} />
            </div>
        </PortalLayout>
    );
}
