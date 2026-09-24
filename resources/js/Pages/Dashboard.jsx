import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
    IconBuilding, IconGrid, IconDocument, IconClipboard,
    IconArrowRight, IconRefresh,
} from '@/Components/Icons';
import EventCalendar from '@/Components/Dashboard/EventCalendar';

const activityLabel = { permit: 'Izin', inspection: 'Sidak', tenancy: 'Kontrak' };

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
    const { refresh, isRefreshing, formattedLastUpdated, setRefreshCallback } = useAutoRefresh(true, 30000);

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

    const canSidak = auth.user?.permissions?.includes('sidak.create') || auth.user?.roles?.includes('super_admin');
    const canPermits = auth.user?.permissions?.includes('permits.view') || auth.user?.roles?.includes('super_admin');

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-1">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                            {getGreeting()}, {auth.user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            <span className="text-gray-300 mx-2" aria-hidden="true">·</span>
                            {auth.user?.branch?.name ?? 'Semua Cabang'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden md:inline text-xs text-gray-400">Diperbarui {formattedLastUpdated}</span>
                        <button
                            onClick={refresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-[#E2E5EA] rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-label="Muat ulang data"
                        >
                            <IconRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                            Segarkan
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard
                        icon={<IconBuilding className="w-5 h-5" aria-hidden="true" />}
                        tint="bg-[#0F1E36]/5 text-[#0F1E36]"
                        label="Tenant Aktif"
                        value={stats?.total_tenants ?? 0}
                        hint={`${total} unit dikelola`}
                        href="/tenants"
                    />
                    <StatCard
                        icon={<IconGrid className="w-5 h-5" aria-hidden="true" />}
                        tint="bg-emerald-50 text-emerald-600"
                        label="Okupansi"
                        value={`${percentage}%`}
                        hint={`${occupied}/${total} unit terisi`}
                        href="/units"
                    />
                    <StatCard
                        icon={<IconDocument className="w-5 h-5" aria-hidden="true" />}
                        tint="bg-amber-50 text-amber-600"
                        label="Izin Antre"
                        value={stats?.pending_permits ?? 0}
                        hint="Menunggu persetujuan"
                        href="/permit-requests"
                        alert={(stats?.pending_permits ?? 0) > 0}
                    />
                    <StatCard
                        icon={<IconClipboard className="w-5 h-5" aria-hidden="true" />}
                        tint="bg-blue-50 text-blue-600"
                        label="Sesi Sidak Aktif"
                        value={stats?.active_sessions ?? 0}
                        hint="Sedang berjalan"
                        href="/inspection-sessions"
                    />
                </div>

                <section aria-label="Okupansi unit" className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <p className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-gray-900 leading-none">
                                {percentage}<span className="text-xl text-gray-400">%</span>
                            </p>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">Tingkat hunian mal</p>
                                <p className="text-xs text-gray-500 mt-0.5">Target operasional ≥ 85% · {vacant} unit kosong</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`Okupansi ${percentage} persen`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${percentage >= 85 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-[#0F1E36]' : 'bg-amber-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span><strong className="font-mono tabular-nums text-gray-800">{occupied}</strong> terisi</span>
                                <span><strong className="font-mono tabular-nums text-gray-800">{vacant}</strong> kosong</span>
                                <Link href="/units" className="font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                    Detail unit
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <EventCalendar calendar={calendar} />

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <section aria-label="Antrian persetujuan" className="bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Antrian Persetujuan</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Urut tertua — kerjakan dari atas</p>
                            </div>
                            {queue.length > 0 && (
                                <span className="inline-flex items-center min-w-[24px] h-6 px-2 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] text-xs font-bold font-mono justify-center">
                                    {queue.length}
                                </span>
                            )}
                        </div>
                        {queue.length === 0 ? (
                            <div className="px-5 py-10 text-center">
                                <p className="text-sm font-medium text-gray-800">Antrian kosong</p>
                                <p className="text-xs text-gray-400 mt-1">Tidak ada pengajuan yang menunggu Anda.</p>
                                {canSidak ? (
                                    <Link
                                        href="/inspection-sessions/current"
                                        className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        Mulai Sidak
                                    </Link>
                                ) : canPermits ? (
                                    <Link
                                        href="/permit-requests"
                                        className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        Lihat Surat Izin
                                    </Link>
                                ) : null}
                            </div>
                        ) : (
                            <ol className="divide-y divide-gray-100">
                                {queue.map((item, i) => (
                                    <li key={item.id}>
                                        <Link
                                            href={`/permit-requests/${item.id}`}
                                            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                        >
                                            <span className="flex flex-col items-center gap-1 shrink-0" aria-hidden="true">
                                                <span className="font-mono text-xs font-bold text-gray-300">{String(i + 1).padStart(2, '0')}</span>
                                                {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B] animate-pulse" />}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-mono text-sm font-semibold text-gray-900 truncate">{item.permit_number}</span>
                                                <span className="block text-xs text-gray-400 mt-0.5 truncate">
                                                    {item.store_name} — <span className="text-gray-600 font-medium">{item.step_label}</span>
                                                    {item.requested_at && <span> · {formatRelativeTime(item.requested_at)}</span>}
                                                </span>
                                            </span>
                                            <span className="hidden sm:inline-flex shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                                Antre
                                            </span>
                                            <IconArrowRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    <section aria-label="Aktivitas terbaru" className="bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Aktivitas Terbaru</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Izin · Sidak · Kontrak</p>
                            </div>
                            <Link href="/permit-requests" className="text-xs font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                Semua
                            </Link>
                        </div>
                        {activities.length === 0 ? (
                            <p className="px-5 py-10 text-sm text-gray-400 text-center">Belum ada aktivitas tercatat.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {activities.map((item, idx) => (
                                    <li key={`${item.id}-${idx}`}>
                                        <Link
                                            href={item.url}
                                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                        >
                                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold ${typeTint(item.type)}`} aria-hidden="true">
                                                {(activityLabel[item.type] ?? '?').slice(0, 1)}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm text-gray-800 truncate group-hover:text-gray-950">{item.title}</span>
                                                <span className="block text-xs text-gray-400 mt-0.5 truncate">
                                                    {activityLabel[item.type] ?? item.type} · {statusLabel[item.status] ?? item.status} · {formatRelativeTime(item.time)}
                                                </span>
                                            </span>
                                            <IconArrowRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
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

function typeTint(type) {
    return {
        permit: 'bg-blue-50 text-blue-700',
        inspection: 'bg-emerald-50 text-emerald-700',
        tenancy: 'bg-purple-50 text-purple-700',
    }[type] ?? 'bg-gray-100 text-gray-500';
}

function StatCard({ icon, tint, label, value, hint, href, alert = false }) {
    return (
        <Link
            href={href}
            className="group relative bg-white rounded-2xl border border-[#E2E5EA] p-4 sm:p-5 hover:border-gray-300 hover:shadow-[0_8px_24px_-12px_rgba(15,30,54,0.25)] transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] overflow-hidden"
        >
            {alert && <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#FF6B6B] animate-pulse" aria-label="Perlu perhatian" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
                {icon}
            </div>
            <p className="mt-3 text-2xl sm:text-[28px] leading-none font-bold font-mono tabular-nums text-gray-900">{value}</p>
            <p className="mt-1.5 text-[13px] font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{hint}</p>
        </Link>
    );
}
