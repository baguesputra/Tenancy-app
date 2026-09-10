import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link, router } from '@inertiajs/react';
import { useState, useMemo, useEffect, Fragment } from 'react';
import Badge from '@/Components/Badge';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
    IconBuilding, IconGrid, IconDocument, IconClipboard,
    IconContract, IconArrowRight, IconAlert,
    IconRefresh, IconTrendUp, IconTrendDown, IconChevronDown, IconExternalLink
} from '@/Components/Icons';

const activityIcon = {
    permit: IconDocument,
    inspection: IconClipboard,
    tenancy: IconContract,
};

const activityLabel = {
    permit: 'Surat Izin',
    inspection: 'Sidak',
    tenancy: 'Kontrak',
};

const statusConfig = {
    pending: { color: 'yellow', label: 'Pending', icon: null },
    completed: { color: 'green', label: 'Selesai', icon: null },
    rejected: { color: 'red', label: 'Ditolak', icon: null },
    draft: { color: 'gray', label: 'Draft', icon: null },
    active: { color: 'green', label: 'Aktif', icon: null },
    ended: { color: 'yellow', label: 'Berakhir', icon: null },
    terminated: { color: 'red', label: 'Diakhiri', icon: null },
};

const quickActions = [
    { href: '/inspection-sessions/current', icon: IconClipboard, title: 'Sesi Sidak', desc: 'Mulai atau lanjutkan' },
    { href: '/permit-requests', icon: IconDocument, title: 'Surat Izin', desc: 'Kelola pengajuan' },
    { href: '/tenants', icon: IconBuilding, title: 'Master Tenant', desc: 'Kelola data tenant' },
    { href: '/units', icon: IconGrid, title: 'Master Unit', desc: 'Kelola okupansi' },
];

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
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupActivityByDate(activity) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
        today: { label: 'Hari Ini', items: [] },
        yesterday: { label: 'Kemarin', items: [] },
        thisWeek: { label: 'Minggu Ini', items: [] },
        older: { label: 'Lebih Lama', items: [] },
    };

    activity.forEach((item) => {
        const itemDate = new Date(item.time);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

        if (itemDay.getTime() === today.getTime()) {
            groups.today.items.push(item);
        } else if (itemDay.getTime() === yesterday.getTime()) {
            groups.yesterday.items.push(item);
        } else if (itemDay >= weekAgo) {
            groups.thisWeek.items.push(item);
        } else {
            groups.older.items.push(item);
        }
    });

    return Object.entries(groups)
        .filter(([, group]) => group.items.length > 0)
        .map(([key, group]) => ({ key, ...group }));
}

function ActivityTypeBadge({ type }) {
    const configs = {
        permit: { bg: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Izin' },
        inspection: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Sidak' },
        tenancy: { bg: 'bg-purple-50 text-purple-700 border-purple-100', label: 'Kontrak' },
    };
    const config = configs[type] || configs.permit;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${config.bg}`}>
            {config.label}
        </span>
    );
}

function StatusBadge({ status }) {
    const config = statusConfig[status] || statusConfig.draft;
    return (
        <Badge color={config.color} variant="soft" size="sm">
            {config.label}
        </Badge>
    );
}

function HeroOccupancyCard({ occupied, total, vacant, className = '' }) {
    const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const strokeWidth = 8;

    return (
        <div className={`bg-white rounded-2xl border border-[#E2E5EA] p-6 sm:p-8 relative overflow-hidden ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B6B]/5 to-[#0F1E36]/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metrik Utama</span>
                        <Badge color="coral" variant="outline" size="sm">Okupansi</Badge>
                    </div>
                    <div className="flex items-baseline gap-4 flex-wrap">
                        <div className="relative" style={{ '--progress': percentage / 100 }}>
                            <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
                                <circle
                                    className="text-gray-100"
                                    cx="60" cy="60" r={radius}
                                    fill="none"
                                    strokeWidth={strokeWidth}
                                    stroke="currentColor"
                                />
                                <circle
                                    className="text-[#FF6B6B] animate-ring-draw"
                                    cx="60" cy="60" r={radius}
                                    fill="none"
                                    strokeWidth={strokeWidth}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    style={{ '--progress': percentage / 100 }}
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-4xl sm:text-5xl font-bold text-[#0F1E36] font-mono tabular-nums">{percentage}%</p>
                            <p className="text-sm text-gray-500 mt-1">{occupied} dari {total} unit terisi</p>
                            <p className="text-xs text-gray-400 mt-0.5">{vacant} unit kosong · {total} total</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end sm:items-end gap-3 shrink-0">
                    <div className="flex gap-2">
                        <Link
                            href="/units"
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-[#0F1E36] hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <IconExternalLink className="w-3.5 h-3.5" />
                            Detail
                        </Link>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Tingkat okupansi</p>
                        <p className="text-sm font-medium text-[#0F1E36]">Target: ≥ 85%</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E2E5EA] flex flex-wrap gap-4 sm:gap-6">
                <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <IconBuilding className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 font-mono tabular-nums">{occupied}</p>
                        <p className="text-xs text-gray-500">Unit Terisi</p>
                    </div>
                </div>
                <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <IconGrid className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 font-mono tabular-nums">{vacant}</p>
                        <p className="text-xs text-gray-500">Unit Kosong</p>
                    </div>
                </div>
                <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <IconContract className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 font-mono tabular-nums">{total}</p>
                        <p className="text-xs text-gray-500">Total Unit</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color, href, trend }) {
    const colorMap = {
        navy: { bg: 'bg-[#0F1E36]/5', text: 'text-[#0F1E36]', border: 'border-[#0F1E36]/10' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    }[color];

    return (
        <Link
            href={href}
            className={`group bg-white rounded-2xl border border-[#E2E5EA] p-5 hover:border-[#0F1E36]/20 hover:shadow-lg transition-all duration-300 flex flex-col ${colorMap.border}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap.bg}`}>
                    <Icon className={`w-5 h-5 ${colorMap.text}`} />
                </div>
                {trend && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {trend > 0 ? <IconTrendUp className="w-3.5 h-3.5" /> : trend < 0 ? <IconTrendDown className="w-3.5 h-3.5" /> : null}
                        <span className="font-mono">{trend > 0 ? '+' : ''}{trend}%</span>
                    </span>
                )}
            </div>
            <p className="text-3xl font-bold text-gray-900 font-mono tabular-nums mb-1">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </Link>
    );
}

function ActionNeededSection({ items, onRefresh, className = '' }) {
    if (items.length === 0) return null;

    return (
        <div className={`bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in ${className}`} style={{ animationDelay: '100ms' }}>
            <div className="px-5 py-4 border-b border-[#E2E5EA] bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                        <IconAlert className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Perlu Tindakan</h2>
                        <p className="text-xs text-gray-500">{items.length} item menunggu persetujuan Anda</p>
                    </div>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={onRefresh === undefined}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Muat ulang"
                >
                    <IconRefresh className="w-4 h-4" />
                </button>
            </div>
            <div className="divide-y divide-[#E2E5EA]">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={`/permit-requests/${item.id}`}
                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                    >
                        <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {item.permit_number} <span className="font-normal text-gray-500">—</span> {item.store_name}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Menunggu: <span className="text-gray-500 font-medium">{item.step_label}</span></p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Badge color="yellow" variant="soft" size="sm">Pending</Badge>
                            <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF6B6B] group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function ActivityFeed({ activities, filter, onFilterChange }) {
    const availableFilters = useMemo(() => {
        const types = [...new Set(activities.map((a) => a.type))];
        return ['all', ...types];
    }, [activities]);

    const filteredActivities = useMemo(() => {
        if (filter === 'all') return activities;
        return activities.filter((a) => a.type === filter);
    }, [activities, filter]);

    const dateGroups = useMemo(() => groupActivityByDate(filteredActivities), [filteredActivities]);

    if (dateGroups.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-[#E2E5EA] p-10 text-center animate-stagger-in" style={{ animationDelay: '200ms' }}>
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <IconClipboard className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Tidak ada aktivitas</h3>
                <p className="text-xs text-gray-500 mb-4">{filter === 'all' ? 'Belum ada aktivitas tercatat.' : `Tidak ada aktivitas untuk filter "${activityLabel[filter] || filter}".`}</p>
                <Link
                    href={filter === 'all' ? '/permit-requests/create' : '#'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-lg transition-colors"
                >
                    <IconPlus className="w-4 h-4" />
                    Buat Baru
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in" style={{ animationDelay: '200ms' }}>
            <div className="px-5 py-4 border-b border-[#E2E5EA] bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <IconClipboard className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">Aktivitas Terbaru</h2>
                </div>
                {availableFilters.length > 1 && (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5" role="tablist">
                        {availableFilters.map((f) => (
                            <button
                                key={f}
                                onClick={() => onFilterChange(f)}
                                role="tab"
                                aria-selected={filter === f}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                                    filter === f
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {f === 'all' ? 'Semua' : activityLabel[f]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="divide-y divide-[#E2E5EA]">
                {dateGroups.map(({ key, label, items }) => (
                    <Fragment key={key}>
                        <div className="px-5 py-3 bg-gray-50/50 border-b border-[#E2E5EA]">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                        </div>
                        {items.map((item, idx) => {
                            const Icon = activityIcon[item.type];
                            return (
                                <Link
                                    key={`${item.id}-${idx}`}
                                    href={item.url}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${({
                                        permit: 'bg-blue-50 text-blue-600',
                                        inspection: 'bg-emerald-50 text-emerald-600',
                                        tenancy: 'bg-purple-50 text-purple-600',
                                    }[item.type] || 'bg-gray-50 text-gray-500')}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{item.title}</p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <ActivityTypeBadge type={item.type} />
                                            <StatusBadge status={item.status} />
                                            <time className="text-xs text-gray-400 whitespace-nowrap" dateTime={item.time}>
                                                {formatRelativeTime(item.time)}
                                            </time>
                                        </div>
                                    </div>
                                    <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF6B6B] group-hover:translate-x-0.5 transition-all shrink-0" />
                                </Link>
                            );
                        })}
                    </Fragment>
                ))}
            </div>
            <div className="px-5 py-4 border-t border-[#E2E5EA] bg-gray-50/50">
                <Link
                    href="/permit-requests"
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-sm font-medium text-[#0F1E36] hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Lihat semua aktivitas
                    <IconArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

function QuickActionsPanel({ isMobile, onClose }) {
    return (
        <div className={`bg-white rounded-2xl border border-[#E2E5EA] p-4 ${isMobile ? 'fixed bottom-0 left-0 right-0 z-50 animate-slide-up shadow-2xl rounded-t-2xl border-b-0' : 'sticky top-24 animate-stagger-in'} ${isMobile ? '' : 'lg:self-start'}`} style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Akses Cepat</h3>
                {isMobile && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Tutup"
                    >
                        <IconChevronDown className="w-5 h-5" />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {quickActions.map(({ href, icon: Icon, title, desc }) => (
                    <Link
                        key={href}
                        href={href}
                        onClick={isMobile ? onClose : undefined}
                        className="flex flex-col items-start gap-1.5 p-4 rounded-xl border border-[#E2E5EA] hover:border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/5 hover:shadow-md transition-all duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center group-hover:bg-[#FF6B6B]/10 group-hover:text-[#FF6B6B] transition-colors">
                            <Icon className="w-5 h-5 text-[#0F1E36] group-hover:text-[#FF6B6B] transition-colors" />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
                            <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function DashboardHeader({ user, branchName, onRefresh, isRefreshing, formattedLastUpdated }) {
    return (
        <div className="mb-6 animate-stagger-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}, {user?.name?.split(' ')[0]}</h1>
                    <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                        <time dateTime={new Date().toISOString()}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
                        <span className="text-gray-300">·</span>
                        <span className="font-medium text-gray-700">{branchName ?? 'Semua Cabang'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#0F1E36] hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                        aria-label="Muat ulang data"
                    >
                        <IconRefresh className={`w-4 h-4 transition-transform duration-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Muat Ulang</span>
                    </button>
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl">
                        Diperbarui {formattedLastUpdated}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({ stats, actionNeeded, recentActivity }) {
    const { auth } = usePage().props;
    const [activityFilter, setActivityFilter] = useState('all');
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

    const { refresh, isRefreshing, formattedLastUpdated, setRefreshCallback } = useAutoRefresh(true, 30000);

    useEffect(() => {
        setRefreshCallback(() => router.reload({ only: ['stats', 'actionNeeded', 'recentActivity'] }));
    }, [setRefreshCallback]);

    const occupied = stats.occupied_units ?? 0;
    const vacant = stats.vacant_units ?? 0;
    const total = occupied + vacant;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return (
        <AppLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex-1">
                <DashboardHeader
                    user={auth.user}
                    branchName={auth.user?.branch?.name}
                    onRefresh={refresh}
                    isRefreshing={isRefreshing}
                    formattedLastUpdated={formattedLastUpdated}
                />

                {/* Hero Occupancy Card - Full Width */}
                <HeroOccupancyCard occupied={occupied} total={total} vacant={vacant} className="mb-8" />

                {/* Metric Cards - 3 Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-stagger-in" style={{ animationDelay: '100ms' }}>
                    <MetricCard
                        icon={IconBuilding}
                        label="Tenant Aktif"
                        value={stats.total_tenants ?? 0}
                        color="navy"
                        href="/tenants"
                    />
                    <MetricCard
                        icon={IconDocument}
                        label="Surat Izin Pending"
                        value={stats.pending_permits ?? 0}
                        color="amber"
                        href="/permit-requests"
                    />
                    <MetricCard
                        icon={IconClipboard}
                        label="Sesi Sidak Aktif"
                        value={stats.active_sessions ?? 0}
                        color="green"
                        href="/inspection-sessions"
                    />
                </div>

                {/* Action Needed Section */}
                <ActionNeededSection items={actionNeeded} onRefresh={refresh} className="mb-8" />

                {/* Activity Feed + Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-8">
                    <ActivityFeed
                        activities={recentActivity}
                        filter={activityFilter}
                        onFilterChange={setActivityFilter}
                    />

                    <QuickActionsPanel isMobile={false} />
                </div>

                {/* Mobile Quick Actions Bottom Sheet */}
                <div className="lg:hidden fixed bottom-4 right-4 z-40">
                    <button
                        onClick={() => setMobileActionsOpen(true)}
                        className="w-14 h-14 rounded-2xl bg-[#0F1E36] text-white flex items-center justify-center shadow-xl hover:bg-[#1a2f52] transition-all duration-200 animate-scale-in"
                        aria-label="Buka akses cepat"
                    >
                        <IconGrid className="w-6 h-6" />
                    </button>
                </div>

                {mobileActionsOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 flex items-end">
                        <div onClick={() => setMobileActionsOpen(false)} className="fixed inset-0 bg-black/30" />
                        <QuickActionsPanel isMobile={true} onClose={() => setMobileActionsOpen(false)} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}