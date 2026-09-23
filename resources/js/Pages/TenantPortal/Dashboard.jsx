import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import Badge from '@/Components/Badge';
import StepProgressMini from '@/Components/StepProgressMini';
import { formatDateID } from '@/utils/format';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const statusLabel = { pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak' };

const pipeline = ['Tenancy', 'Building Service', 'Security'];

export default function Dashboard({ store, stats, activePermit, recent, sidak_active, sidak_recent = [] }) {
    return (
        <PortalLayout>
            <section aria-label="Identitas toko" className="bg-[#0F1E36] text-white rounded-2xl p-5 sm:p-6 relative overflow-hidden animate-stagger-in">
                <div className="absolute -right-10 -top-14 w-48 h-48 rounded-full bg-white/[0.06]" aria-hidden="true" />
                <div className="absolute right-16 -bottom-20 w-56 h-56 rounded-full bg-white/[0.04]" aria-hidden="true" />
                <div className="relative">
                    <div className="flex items-center gap-3.5">
                        {store?.logo_url && (
                            <img src={store.logo_url} alt={`Logo ${store?.name}`} className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white object-contain p-1 shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Toko Saya</p>
                            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">{store?.name}</h1>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 font-mono text-[13px]">
                            {store?.unit_code ?? 'Unit belum dipetakan'}
                        </span>
                        {store?.branch && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs">
                                {store.branch}
                            </span>
                        )}
                        <Badge color={store?.is_active ? 'green' : 'gray'} variant="soft" size="sm">
                            {store?.is_active ? 'Kontrak aktif' : 'Kontrak tidak aktif'}
                        </Badge>
                    </div>
                    {store?.tenancy_end && (
                        <p className="mt-3 text-xs text-white/60">
                            Kontrak sampai {new Date(store.tenancy_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </div>
            </section>

            <dl className="mt-4 grid grid-cols-3 gap-3 animate-stagger-in" style={{ animationDelay: '60ms' }}>
                <Stat label="Antre" value={stats?.pending ?? 0} tone="text-amber-700 bg-amber-50 border-amber-100" />
                <Stat label="Selesai" value={stats?.completed ?? 0} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
                <Stat label="Ditolak" value={stats?.rejected ?? 0} tone="text-red-700 bg-red-50 border-red-100" />
            </dl>

            <section aria-label="Izin berjalan" className="mt-4 animate-stagger-in" style={{ animationDelay: '120ms' }}>
                {activePermit ? (
                    <Link
                        href={`/portal/permits/${activePermit.id}`}
                        className="block bg-white rounded-2xl border border-[#E2E5EA] p-5 hover:border-[#0F1E36]/25 hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Sedang berjalan</p>
                                <p className="mt-1 font-mono text-base font-semibold text-gray-900 truncate">{activePermit.permit_number}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Menunggu: {activePermit.current_step_label ?? '—'}</p>
                            </div>
                            <Badge color={statusColor[activePermit.status]} variant="soft" size="sm">
                                {statusLabel[activePermit.status]}
                            </Badge>
                        </div>
                        {activePermit.step_progress?.length > 0 && (
                            <div className="mt-4">
                                <StepProgressMini steps={activePermit.step_progress} />
                                <ol className="mt-2 flex flex-wrap gap-1.5">
                                    {pipeline.map((name) => (
                                        <li key={name} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                                            {name}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </Link>
                ) : (
                    <Link
                        href="/portal/permits/create"
                        className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-dashed border-gray-300 p-5 hover:border-[#0F1E36]/40 hover:bg-gray-50/60 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-gray-900">Belum ada izin antre</span>
                            <span className="block text-xs text-gray-500 mt-0.5">Ajukan izin baru, selesai dalam 3 tahap</span>
                        </span>
                        <span className="shrink-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg">+ Ajukan</span>
                    </Link>
                )}
            </section>

            {sidak_active && (
                <section aria-label="Status sidak" className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-5 flex items-center gap-3 animate-stagger-in" style={{ animationDelay: '150ms' }} role="status">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" aria-hidden="true" />
                    <p className="text-sm"><span className="font-semibold">Sedang dilaksanakan penyidakan</span> di toko Anda. Hasil muncul setelah sesi selesai.</p>
                </section>
            )}

            <section aria-label="Hasil sidak" className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in" style={{ animationDelay: '170ms' }}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-900">Hasil Sidak</h2>
                    <Link href="/portal/inspections" className="text-xs font-medium text-[#0F1E36] hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                        Lihat semua
                    </Link>
                </div>
                <div className="divide-y divide-gray-100">
                    {sidak_recent.map((s) => (
                        <Link
                            key={s.id}
                            href={`/portal/inspections/${s.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900 truncate">{s.template_name}</span>
                                <span className="block text-xs text-gray-400 mt-0.5 truncate">
                                    {s.session_started_at ? formatDateID(s.session_started_at) : '—'}
                                    {s.is_flagged ? ' · Perlu perhatian' : ''}
                                </span>
                            </span>
                            <Badge color={s.session_status === 'in_progress' ? 'yellow' : 'green'} variant="soft" size="sm">
                                {s.session_status === 'in_progress' ? 'Penyidakan' : 'Selesai'}
                            </Badge>
                        </Link>
                    ))}
                    {sidak_recent.length === 0 && (
                        <p className="px-5 py-8 text-sm text-gray-400 text-center">
                            {sidak_active ? 'Penyidakan masih berjalan.' : 'Belum ada hasil sidak.'}
                        </p>
                    )}
                </div>
            </section>

            <section aria-label="Riwayat izin" className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in" style={{ animationDelay: '180ms' }}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-900">Terakhir diajukan</h2>
                    <Link href="/portal/permits" className="text-xs font-medium text-[#0F1E36] hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                        Lihat semua
                    </Link>
                </div>
                <div className="divide-y divide-gray-100">
                    {(recent ?? []).map((p) => (
                        <Link
                            key={p.id}
                            href={`/portal/permits/${p.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                        >
                            <span className="min-w-0">
                                <span className="block font-mono text-sm font-medium text-gray-900 truncate">{p.permit_number}</span>
                                <span className="block text-xs text-gray-400 mt-0.5 truncate">{p.job_type || '—'} — {formatDateID(p.request_date)}</span>
                            </span>
                            <Badge color={statusColor[p.status]} variant="soft" size="sm">
                                {statusLabel[p.status]}
                            </Badge>
                        </Link>
                    ))}
                    {(recent ?? []).length === 0 && (
                        <p className="px-5 py-10 text-sm text-gray-400 text-center">Belum ada pengajuan izin.</p>
                    )}
                </div>
            </section>
        </PortalLayout>
    );
}

function Stat({ label, value, tone }) {
    return (
        <div className={`rounded-2xl border px-4 py-3.5 ${tone}`}>
            <dt className="text-xs font-medium opacity-80">{label}</dt>
            <dd className="mt-0.5 text-2xl font-bold font-mono tabular-nums">{value}</dd>
        </div>
    );
}
