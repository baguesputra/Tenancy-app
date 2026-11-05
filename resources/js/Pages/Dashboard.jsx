import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
    IconAlert,
    IconArrowRight,
    IconBuilding,
    IconCheck,
    IconClipboard,
    IconClipboardCheck,
    IconContract,
    IconDocument,
    IconDoor,
    IconFileText,
    IconMap,
    IconPlus,
} from '@/Components/Icons';
import EventCalendar from '@/Components/Dashboard/EventCalendar';
import useCan from '@/hooks/useCan';

const activityMeta = {
    permit: {
        label: 'Izin',
        icon: IconDocument,
        iconBg: 'bg-sky-50 text-sky-600 border-sky-200/80',
        href: '/permit-requests',
    },
    inspection: {
        label: 'Sidak',
        icon: IconClipboardCheck,
        iconBg: 'bg-orange-50 text-orange-600 border-orange-200/80',
        href: '/inspection-sessions',
    },
    tenancy: {
        label: 'Kontrak',
        icon: IconContract,
        iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
        href: '/tenancies',
    },
    loo: {
        label: 'LOO',
        icon: IconFileText,
        iconBg: 'bg-violet-50 text-violet-600 border-violet-200/80',
        href: '/loos',
    },
};

const statusConfig = {
    pending: { label: 'Antre', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    in_progress: { label: 'Berjalan', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
    completed: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    active: { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
    cancelled: { label: 'Dibatalkan', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    ended: { label: 'Berakhir', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    terminated: { label: 'Diakhiri', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
    pengisian_divisi: { label: 'Pengisian Divisi', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    pengukuran_ulang: { label: 'Ukur Ulang', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    sebelum_fitout: { label: 'Pra-Fitout', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    setelah_fitout: { label: 'Pasca-Fitout', cls: 'bg-teal-50 text-teal-800 border-teal-200' },
};

const ACTIVITY_TABS = [
    { key: 'all', label: 'Semua', href: '/permit-requests', linkLabel: 'Semua izin kerja' },
    { key: 'permit', label: 'Izin', href: '/permit-requests', linkLabel: 'Buka register izin' },
    { key: 'loo', label: 'LOO', href: '/loos', linkLabel: 'Buka daftar LOO' },
    { key: 'inspection', label: 'Sidak', href: '/inspection-sessions', linkLabel: 'Buka sesi sidak' },
    { key: 'tenancy', label: 'Kontrak', href: '/tenancies', linkLabel: 'Buka data kontrak' },
];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function isWaitingLong(dateStr) {
    if (!dateStr) return false;
    const hours = (Date.now() - new Date(dateStr).getTime()) / 3600000;
    return hours >= 24;
}

function permitCategoryBadge(item) {
    const types = Array.isArray(item.activity_types) ? item.activity_types : [];
    const num = String(item.permit_number ?? '');
    if (types.includes('pameran')) {
        return { label: 'Pameran', cls: 'bg-violet-50 text-violet-800 border-violet-200' };
    }
    if (types.includes('langganan_parkir') || num.includes('/PRK/')) {
        return { label: 'Parkir', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (types.includes('customer_form') || num.includes('/CST/')) {
        return { label: 'Customer', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (types.some((t) => ['event', 'meeting_internal', 'stock_opname'].includes(t))) {
        return { label: 'Kegiatan', cls: 'bg-teal-50 text-teal-800 border-teal-200' };
    }
    return { label: 'Izin Kerja', cls: 'bg-sky-50 text-sky-800 border-sky-200' };
}

export default function Dashboard({ stats, actionNeeded, recentActivity, calendar }) {
    const { auth } = usePage().props;
    const { can } = useCan();
    const { setRefreshCallback } = useAutoRefresh(true, 60000);
    const [activityFilter, setActivityFilter] = useState('all');

    useEffect(() => {
        setRefreshCallback(() => router.reload({ only: ['stats', 'actionNeeded', 'recentActivity', 'calendar'] }));
    }, [setRefreshCallback]);

    const byOldest = (a, b) => new Date(a.requested_at ?? a.time ?? 0) - new Date(b.requested_at ?? b.time ?? 0);
    const queue = useMemo(
        () => [...(Array.isArray(actionNeeded) ? actionNeeded : [])].sort(byOldest).slice(0, 6),
        [actionNeeded]
    );

    const allActivities = useMemo(
        () => (Array.isArray(recentActivity) ? recentActivity : []),
        [recentActivity]
    );

    const visibleTabs = useMemo(() => {
        const canLoo = can('loos.view');
        const canSidak = can('sidak.view');
        return ACTIVITY_TABS.filter((tab) => {
            if (tab.key === 'loo' && !canLoo) return false;
            if (tab.key === 'inspection' && !canSidak) return false;
            return true;
        });
    }, [can]);

    const filteredActivities = useMemo(() => {
        const base = activityFilter === 'all'
            ? allActivities
            : allActivities.filter((a) => a.type === activityFilter);
        return base.slice(0, 6);
    }, [allActivities, activityFilter]);

    // Kontrak yang akan berakhir dalam 30 hari (dari event kalender yang ditandai urgent)
    const urgentContracts = useMemo(() => {
        const events = Array.isArray(calendar?.events) ? calendar.events : [];
        return events.filter((e) => e.type === 'contract_end' && e.urgent);
    }, [calendar]);

    const occupied = stats?.occupied_units ?? 0;
    const vacant = stats?.vacant_units ?? 0;
    const total = occupied + vacant;
    const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const canSidak = can('sidak.manage') || can('sidak.answer');
    const canPermits = can('permits.view');
    const canCreatePermit = can('permits.create');
    const canLoo = can('loos.view');
    const canCreateLoo = can('loos.create');
    const canUnits = can('units.view');

    const activeTabMeta = visibleTabs.find((t) => t.key === activityFilter) ?? visibleTabs[0];

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-5">
                {/* 1. COMMAND HEADER & QUICK ACTIONS */}
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <span>Ringkasan Operasional</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
                            <span className="inline-flex items-center gap-1.5 font-medium normal-case tracking-normal text-slate-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                Auto-sync tiap 1 menit
                            </span>
                        </div>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            {getGreeting()}, {auth.user?.name?.split(' ')[0]}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-500">
                            <span>
                                {new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                            <span className="h-3.5 w-px bg-slate-200" aria-hidden="true" />
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                <IconBuilding className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                {auth.user?.branch?.name ?? 'Semua Cabang'}
                            </span>
                            {auth.user?.department?.name && (
                                <>
                                    <span className="h-3.5 w-px bg-slate-200" aria-hidden="true" />
                                    <span className="text-slate-500">{auth.user.department.name}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Pintasan Kerja Kontekstual */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {canUnits && (
                            <Link
                                href="/floor-plans"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E5EA] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconMap className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                <span>Denah Lantai</span>
                            </Link>
                        )}
                        {canSidak && (
                            <Link
                                href="/inspection-sessions/current"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E5EA] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconClipboardCheck className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                <span>Sesi Sidak</span>
                            </Link>
                        )}
                        {canCreateLoo && (
                            <Link
                                href="/loos/create"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E2E5EA] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconPlus className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                <span>Buat LOO</span>
                            </Link>
                        )}
                        {canCreatePermit && (
                            <Link
                                href="/permit-requests/create"
                                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0F1E36] text-xs font-semibold text-white hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconPlus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Buat Surat Izin</span>
                            </Link>
                        )}
                    </div>
                </header>

                {/* 2. UNIFIED KPI & OCCUPANCY STRIP (1 SURFACE HAIRLINE) */}
                <section
                    aria-label="Indikator utama dan okupansi"
                    className={`grid grid-cols-1 sm:grid-cols-2 ${
                        canLoo ? 'xl:grid-cols-12' : 'xl:grid-cols-10'
                    } gap-px bg-[#E2E5EA] rounded-lg border border-[#E2E5EA] overflow-hidden`}
                >
                    {/* Hero Cell: Tingkat Hunian & Tenant Aktif */}
                    <div className="relative bg-white p-4 sm:p-5 sm:col-span-2 xl:col-span-5 flex flex-col justify-between">
                        <span
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F766E]"
                        />
                        <span
                            aria-hidden="true"
                            className="hidden xl:block absolute inset-y-0 right-0 w-px bg-[#C9D0D9]"
                        />

                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                        Okupansi &amp; Unit Mal
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-3">
                                    <p className="text-3xl sm:text-4xl font-semibold font-mono tabular-nums text-slate-900 leading-none">
                                        {percentage}
                                        <span className="text-lg text-slate-400 font-normal">%</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <strong className="font-mono tabular-nums text-slate-800">{occupied}</strong> dari{' '}
                                        <strong className="font-mono tabular-nums text-slate-800">{total}</strong> unit terisi
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <Link
                                    href="/units"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-slate-50/70 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <IconDoor className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                    <span>Unit</span>
                                </Link>
                                <Link
                                    href="/tenants"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-slate-50/70 hover:bg-slate-100 text-[11px] font-medium text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <IconBuilding className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                    <span>Tenant</span>
                                </Link>
                            </div>
                        </div>

                        {/* Bar Progres dengan Penanda Target 85% */}
                        <div className="mt-3.5">
                            <div
                                className="relative h-2 rounded-full bg-slate-100 overflow-hidden"
                                role="progressbar"
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-label={`Okupansi ${percentage} persen`}
                            >
                                <div
                                    className="h-full rounded-full bg-[#0F1E36] transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                                <span
                                    aria-hidden="true"
                                    title="Target 85%"
                                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400/70"
                                    style={{ left: '85%' }}
                                />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-3">
                                    <span>
                                        <strong className="font-mono tabular-nums text-slate-800">
                                            {stats?.total_tenants ?? 0}
                                        </strong>{' '}
                                        tenant aktif
                                    </span>
                                    <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
                                    <span>
                                        <strong className="font-mono tabular-nums text-slate-800">{vacant}</strong> unit kosong
                                    </span>
                                </div>
                                {urgentContracts.length > 0 && (
                                    <Link
                                        href="/tenancies"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D64545] hover:underline"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B6B]" aria-hidden="true" />
                                        {urgentContracts.length} kontrak ≤30 hari
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* KPI: Izin Antre / Sesi Sidak / LOO — sel sama lebar */}
                    <div
                        className={`sm:col-span-2 grid grid-cols-1 ${
                            canLoo ? 'sm:grid-cols-3 xl:col-span-7' : 'sm:grid-cols-2 xl:col-span-5'
                        } gap-px bg-[#E2E5EA]`}
                    >
                        <KpiCell
                            icon={<IconDocument className="w-4 h-4" aria-hidden="true" />}
                            label="Izin Antre"
                            value={stats?.pending_permits ?? 0}
                            hint={
                                queue.length > 0
                                    ? `${queue.length} menunggu giliran Anda`
                                    : 'Menunggu persetujuan'
                            }
                            hintAlert={queue.length > 0}
                            href="/permit-requests"
                            alert={(stats?.pending_permits ?? 0) > 0}
                            accent={(stats?.pending_permits ?? 0) > 0 ? 'bg-[#D64545]' : 'bg-[#0F1E36]'}
                        />

                        <KpiCell
                            icon={<IconClipboard className="w-4 h-4" aria-hidden="true" />}
                            label="Sesi Sidak Aktif"
                            value={stats?.active_sessions ?? 0}
                            hint={(stats?.active_sessions ?? 0) > 0 ? 'Sidak sedang berjalan' : 'Tidak ada sesi aktif'}
                            href="/inspection-sessions"
                            accent="bg-[#2563EB]"
                        />

                        {canLoo && (
                            <KpiCell
                                icon={<IconContract className="w-4 h-4" aria-hidden="true" />}
                                label="LOO"
                                value={stats?.pending_loos ?? 0}
                                hint={`${stats?.total_loos ?? 0} total dokumen LOO`}
                                href="/loos"
                                alert={(stats?.pending_loos ?? 0) > 0}
                                accent={(stats?.pending_loos ?? 0) > 0 ? 'bg-[#D64545]' : 'bg-[#0F1E36]'}
                            />
                        )}
                    </div>
                </section>

                {/* 3. WORKSPACE OPERASIONAL PRIORITAS (DI ATAS KALENDER — OPSI A) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* Kolom Kiri: Perlu Tindakan Anda (Antrian Persetujuan + Kontrak Segera Berakhir) */}
                    <section
                        aria-label="Perlu tindakan Anda"
                        className="lg:col-span-7 bg-white rounded-lg border border-[#E2E5EA] overflow-hidden flex flex-col"
                    >
                        <div className="px-5 py-3.5 border-b border-[#E2E5EA] flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-slate-900">
                                        Perlu Tindakan Anda
                                    </h2>
                                    {queue.length > 0 ? (
                                        <span className="inline-flex items-center min-w-[22px] h-5 px-1.5 rounded-full bg-[#FF6B6B]/15 text-[#D64545] text-xs font-semibold font-mono justify-center">
                                            {queue.length}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                                            Terkendali
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Antrean persetujuan giliran departemen Anda — urut dari pengajuan terlama
                                </p>
                            </div>
                            {canPermits && (
                                <Link
                                    href="/permit-requests"
                                    className="shrink-0 text-xs font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    Register Izin
                                </Link>
                            )}
                        </div>

                        {/* Peringatan Kontrak Segera Berakhir (bila ada di bulan berjalan) */}
                        {urgentContracts.length > 0 && (
                            <div className="px-5 py-2.5 bg-rose-50/70 border-b border-rose-200/70 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 text-xs text-rose-900">
                                    <IconAlert className="w-4 h-4 text-[#D64545] shrink-0" aria-hidden="true" />
                                    <span className="truncate">
                                        <strong>{urgentContracts.length} kontrak sewa</strong> akan berakhir dalam ≤ 30 hari ke depan
                                    </span>
                                </div>
                                <Link
                                    href="/tenancies"
                                    className="text-xs font-semibold text-rose-900 hover:underline shrink-0"
                                >
                                    Cek Kontrak →
                                </Link>
                            </div>
                        )}

                        {queue.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                                    <IconCheck className="w-5 h-5" aria-hidden="true" />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-900">
                                    Tidak Ada Antrean Persetujuan
                                </p>
                                <p className="mt-1 max-w-sm text-xs text-slate-500">
                                    Seluruh pengajuan surat izin yang membutuhkan persetujuan bagian Anda sudah selesai ditangani.
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    {canSidak && (
                                        <Link
                                            href="/inspection-sessions/current"
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                        >
                                            <IconClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span>Mulai / Lanjutkan Sidak</span>
                                        </Link>
                                    )}
                                    {canPermits && (
                                        <Link
                                            href="/permit-requests"
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E5EA] rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                        >
                                            <span>Lihat Semua Surat Izin</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <ol className="divide-y divide-[#E2E5EA] flex-1">
                                {queue.map((item) => {
                                    const badge = permitCategoryBadge(item);
                                    const stale = isWaitingLong(item.requested_at);
                                    return (
                                        <li key={item.id}>
                                            <Link
                                                href={`/permit-requests/${item.id}`}
                                                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/90 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.cls}`}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                        <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                                            {item.permit_number}
                                                        </span>
                                                        <span className="text-xs text-slate-400 hidden sm:inline" aria-hidden="true">
                                                            ·
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-700 truncate">
                                                            {item.store_name}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                                                            {item.step_label}
                                                        </span>
                                                        {item.requested_at && (
                                                            <>
                                                                <span className="text-slate-300" aria-hidden="true">·</span>
                                                                <span
                                                                    className={
                                                                        stale
                                                                            ? 'font-medium text-[#D64545]'
                                                                            : 'text-slate-400'
                                                                    }
                                                                >
                                                                    Diajukan {formatRelativeTime(item.requested_at)}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E5EA] bg-white group-hover:border-[#0F1E36] group-hover:bg-[#0F1E36] group-hover:text-white text-xs font-medium text-slate-700 transition-colors">
                                                    <span>Tinjau</span>
                                                    <IconArrowRight
                                                        className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>

                    {/* Kolom Kanan: Aktivitas Terbaru dengan Filter Cepat */}
                    <section
                        aria-label="Aktivitas terbaru"
                        className="lg:col-span-5 bg-white rounded-lg border border-[#E2E5EA] overflow-hidden flex flex-col"
                    >
                        <div className="px-5 py-3.5 border-b border-[#E2E5EA] flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Aktivitas Terbaru</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Arus dokumen &amp; operasional cabang</p>
                            </div>

                            {/* Segmented Filter Mini */}
                            <div
                                role="group"
                                aria-label="Filter tipe aktivitas"
                                className="inline-flex items-center rounded-lg bg-slate-100 p-0.5"
                            >
                                {visibleTabs.map((tab) => {
                                    const active = activityFilter === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setActivityFilter(tab.key)}
                                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                active
                                                    ? 'bg-white text-slate-900 shadow-2xs'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {filteredActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
                                <p className="text-sm font-medium text-slate-600">Belum ada aktivitas</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Tidak ada riwayat untuk kategori ini.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-[#E2E5EA] flex-1">
                                {filteredActivities.map((item, idx) => {
                                    const meta = activityMeta[item.type] ?? activityMeta.permit;
                                    const Icon = meta.icon;
                                    const st = statusConfig[item.status] ?? {
                                        label: item.status,
                                        cls: 'bg-slate-100 text-slate-600 border-slate-200',
                                    };
                                    return (
                                        <li key={`${item.type}-${item.url}-${idx}`}>
                                            <Link
                                                href={item.url}
                                                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                            >
                                                <span
                                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.iconBg}`}
                                                    aria-hidden="true"
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-xs sm:text-sm font-medium text-slate-800 truncate group-hover:text-slate-950">
                                                        {item.title}
                                                    </span>
                                                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <span className="font-medium text-slate-500">{meta.label}</span>
                                                        <span aria-hidden="true">·</span>
                                                        <span>{formatRelativeTime(item.time)}</span>
                                                    </span>
                                                </span>
                                                <span
                                                    className={`hidden sm:inline-flex shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.cls}`}
                                                >
                                                    {st.label}
                                                </span>
                                                <IconArrowRight
                                                    className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-[#E2E5EA] flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                                Menampilkan {filteredActivities.length} aktivitas terbaru
                            </span>
                            <Link
                                href={activeTabMeta.href}
                                className="font-medium text-[#0F1E36] hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                {activeTabMeta.linkLabel} →
                            </Link>
                        </div>
                    </section>
                </div>

                {/* 4. KALENDER OPERASIONAL */}
                <EventCalendar calendar={calendar} />
            </div>
        </AppLayout>
    );
}

function KpiCell({
    icon,
    label,
    value,
    hint,
    href,
    alert = false,
    hintAlert = false,
    accent = null,
}) {
    return (
        <Link
            href={href}
            className="group relative bg-white p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
        >
            {accent === 'bg-[#D64545]' && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#D64545]/[0.06] to-transparent"
                />
            )}
            {accent === 'bg-[#2563EB]' && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#2563EB]/[0.05] to-transparent"
                />
            )}
            {accent === 'bg-[#0F1E36]' && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#0F1E36]/[0.05] to-transparent"
                />
            )}
            {accent && <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 ${accent}`} />}

            <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                </span>
                <span className="w-8 h-8 rounded-lg bg-[#0F1E36]/5 text-[#0F1E36] flex items-center justify-center shrink-0 group-hover:bg-[#0F1E36] group-hover:text-white transition-colors">
                    {icon}
                </span>
            </div>

            <div className="relative z-10 mt-3">
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl leading-none font-semibold font-mono tabular-nums text-slate-900">
                        {value}
                    </p>
                    {alert && (
                        <span
                            className="inline-block w-2 h-2 rounded-full bg-[#FF6B6B]"
                            aria-label="Perlu perhatian"
                        />
                    )}
                </div>
                <p
                    className={`mt-1.5 text-xs truncate ${
                        hintAlert ? 'font-semibold text-[#D64545]' : 'text-slate-500'
                    }`}
                >
                    {hint}
                </p>
            </div>
        </Link>
    );
}
