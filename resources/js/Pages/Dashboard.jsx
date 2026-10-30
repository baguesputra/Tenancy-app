import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
    IconBuilding, IconDocument, IconClipboard, IconContract,
    IconArrowRight,
} from '@/Components/Icons';
import EventCalendar from '@/Components/Dashboard/EventCalendar';
import EmptyState from '@/Components/EmptyState';
import useCan from '@/hooks/useCan';

const activityLabel = { permit: 'Izin', inspection: 'Sidak', tenancy: 'Kontrak', loo: 'LOO' };

const statusLabel = {
    pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan', draft: 'Draft',
    active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri',
};

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
}

function formatRelativeTime(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Dashboard({ stats, actionNeeded, recentActivity, calendar }) {
    const { auth } = usePage().props;
    const { can } = useCan();
    const { setRefreshCallback } = useAutoRefresh(true, 60000);

    useEffect(() => {
        setRefreshCallback(() => router.reload({ only: ['stats', 'actionNeeded', 'recentActivity', 'calendar'] }));
    }, [setRefreshCallback]);

    const byOldest = (a, b) => new Date(a.requested_at ?? a.time ?? 0) - new Date(b.requested_at ?? b.time ?? 0);
    const queue = [...(Array.isArray(actionNeeded) ? actionNeeded : [])].sort(byOldest).slice(0, 5);
    const activities = Array.isArray(recentActivity) ? recentActivity.slice(0, 5) : [];

    const occupied = stats?.occupied_units ?? 0;
    const vacant = stats?.vacant_units ?? 0;
    const total = occupied + vacant;
    const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const canSidak = can('sidak.manage') || can('sidak.answer');
    const canPermits = can('permits.view');
    const canLoo = can('loos.view');

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-1">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Ringkasan Operasional</p>
                        <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                            {getGreeting()}, {auth.user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            <span className="text-slate-300 mx-2" aria-hidden="true">·</span>
                            {auth.user?.branch?.name ?? 'Semua Cabang'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        <span className="text-xs text-slate-400">Data otomatis · tiap 1 menit</span>
                    </div>
                </div>

                <section aria-label="Indikator utama" className={`mt-5 grid grid-cols-2 ${canLoo ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-px bg-[#E2E5EA] rounded-lg border border-[#E2E5EA] overflow-hidden`}>
                    <KpiCell
                        icon={<IconBuilding className="w-5 h-5" aria-hidden="true" />}
                        label="Tenant Aktif"
                        value={stats?.total_tenants ?? 0}
                        hint={`${total} unit dikelola`}
                        href="/tenants"
                        accent="bg-[#0F1E36]"
                        divider
                    />
                    <KpiCell
                        icon={<IconDocument className="w-5 h-5" aria-hidden="true" />}
                        label="Izin Antre"
                        value={stats?.pending_permits ?? 0}
                        hint="Menunggu persetujuan"
                        href="/permit-requests"
                        alert={(stats?.pending_permits ?? 0) > 0}
                        accent={(stats?.pending_permits ?? 0) > 0 ? 'bg-[#D64545]' : 'bg-[#0F1E36]'}
                    />
                    <KpiCell
                        icon={<IconClipboard className="w-5 h-5" aria-hidden="true" />}
                        label="Sesi Sidak Aktif"
                        value={stats?.active_sessions ?? 0}
                        hint="Sedang berjalan"
                        href="/inspection-sessions"
                        accent="bg-[#0F1E36]"
                    />
                    {canLoo && (
                        <KpiCell
                            icon={<IconContract className="w-5 h-5" aria-hidden="true" />}
                            label="LOO Diproses"
                            value={stats?.pending_loos ?? 0}
                            hint={`${stats?.total_loos ?? 0} total LOO`}
                            href="/loos"
                            alert={(stats?.pending_loos ?? 0) > 0}
                            accent={(stats?.pending_loos ?? 0) > 0 ? 'bg-[#D64545]' : 'bg-[#0F1E36]'}
                        />
                    )}
                </section>

                <section aria-label="Okupansi unit" className="mt-4 bg-white rounded-lg border border-[#E2E5EA] p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <p className="text-4xl sm:text-5xl font-semibold font-mono tabular-nums text-slate-900 leading-none">
                                {percentage}<span className="text-xl text-slate-400">%</span>
                            </p>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">Tingkat hunian mal</p>
                                <p className="text-xs text-slate-500 mt-0.5">Target operasional ≥ 85% · {vacant} unit kosong</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`Okupansi ${percentage} persen`}>
                                <div
                                    className="h-full rounded-full bg-[#0F1E36] transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                <span><strong className="font-mono tabular-nums text-slate-800">{occupied}</strong> terisi</span>
                                <span><strong className="font-mono tabular-nums text-slate-800">{vacant}</strong> kosong</span>
                                <Link href="/units" className="font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                    Detail unit
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <EventCalendar calendar={calendar} />

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <section aria-label="Antrian persetujuan" className="bg-white rounded-lg border border-[#E2E5EA] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#E2E5EA] flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Antrian Persetujuan</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Urut tertua — kerjakan dari atas</p>
                            </div>
                            {queue.length > 0 && (
                                <span className="inline-flex items-center min-w-[24px] h-6 px-2 rounded-full bg-[#FF6B6B]/10 text-[#D64545] text-xs font-semibold font-mono justify-center">
                                    {queue.length}
                                </span>
                            )}
                        </div>
                        {queue.length === 0 ? (
                            <EmptyState
                                variant="empty"
                                size="sm"
                                title="Antrean Kosong"
                                description="Tidak ada pengajuan yang membutuhkan tindakan Anda saat ini."
                                action={
                                    canSidak ? (
                                        <Link
                                            href="/inspection-sessions/current"
                                            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-xl hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                        >
                                            Mulai Sidak
                                        </Link>
                                    ) : canPermits ? (
                                        <Link
                                            href="/permit-requests"
                                            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-xl hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                        >
                                            Lihat Surat Izin
                                        </Link>
                                    ) : null
                                }
                                className="py-6"
                            />
                        ) : (
                            <ol className="divide-y divide-[#E2E5EA]">
                                {queue.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={`/permit-requests/${item.id}`}
                                            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                        >
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-mono text-sm font-semibold text-slate-900 truncate">{item.permit_number}</span>
                                                <span className="block text-xs text-slate-400 mt-0.5 truncate">
                                                    {item.store_name} — <span className="text-slate-600 font-medium">{item.step_label}</span>
                                                    {item.requested_at && <span> · {formatRelativeTime(item.requested_at)}</span>}
                                                </span>
                                            </span>
                                            <span className="hidden sm:inline-flex shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                                Antre
                                            </span>
                                            <IconArrowRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    <section aria-label="Aktivitas terbaru" className="bg-white rounded-lg border border-[#E2E5EA] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#E2E5EA] flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Izin · Sidak · Kontrak · LOO</p>
                            </div>
                            <Link href="/permit-requests" className="text-xs font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                Semua
                            </Link>
                        </div>
                        {activities.length === 0 ? (
                            <p className="px-5 py-10 text-sm text-slate-400 text-center">Belum ada aktivitas tercatat.</p>
                        ) : (
                            <ul className="divide-y divide-[#E2E5EA]">
                                {activities.map((item, idx) => (
                                    <li key={`${item.id}-${idx}`}>
                                        <Link
                                            href={item.url}
                                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDot(item.type)}`} aria-hidden="true" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm text-slate-800 truncate group-hover:text-slate-950">{item.title}</span>
                                                <span className="block text-xs text-slate-400 mt-0.5 truncate">
                                                    {activityLabel[item.type] ?? item.type} · {statusLabel[item.status] ?? item.status} · {formatRelativeTime(item.time)}
                                                </span>
                                            </span>
                                            <IconArrowRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}

function typeDot(type) {
    return {
        permit: 'bg-blue-500',
        inspection: 'bg-emerald-500',
        tenancy: 'bg-purple-500',
        loo: 'bg-amber-500',
    }[type] ?? 'bg-slate-300';
}

function KpiCell({ icon, label, value, hint, href, alert = false, accent = null, divider = false }) {
    return (
        <Link
            href={href}
            className="group relative bg-white p-4 sm:p-5 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
        >
            {accent && <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 ${accent}`} />}
            {divider && <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-[#C9D0D9]" />}
            {alert && <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#FF6B6B]" aria-label="Perlu perhatian" />}
            <div className="w-10 h-10 rounded-lg bg-[#0F1E36]/5 text-[#0F1E36] flex items-center justify-center">
                {icon}
            </div>
            <p className="mt-3 text-2xl sm:text-[28px] leading-none font-semibold font-mono tabular-nums text-slate-900">{value}</p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{hint}</p>
        </Link>
    );
}
