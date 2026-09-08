import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import Badge from '@/Components/Badge';
import FormSection from '@/Components/Form/FormSection';
import {
    IconBuilding, IconGrid, IconDocument, IconClipboard,
    IconContract, IconArrowRight, IconAlert,
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

const statusColorMap = {
    pending: 'yellow', completed: 'green', rejected: 'red',
    draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red',
};

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
}

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Dashboard({ stats, actionNeeded, recentActivity }) {
    const { auth } = usePage().props;
    const firstName = auth.user?.name?.split(' ')[0];
    const [activityFilter, setActivityFilter] = useState('all');

    const occupancyRate = stats.occupied_units + stats.vacant_units > 0
        ? Math.round((stats.occupied_units / (stats.occupied_units + stats.vacant_units)) * 100)
        : 0;

    const filteredActivity = useMemo(() => {
        if (activityFilter === 'all') return recentActivity;
        return recentActivity.filter((item) => item.type === activityFilter);
    }, [recentActivity, activityFilter]);

    const availableFilters = useMemo(() => {
        const types = [...new Set(recentActivity.map((a) => a.type))];
        return ['all', ...types];
    }, [recentActivity]);

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">
                        {getGreeting()}, {firstName}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}{auth.user?.branch?.name ?? 'Semua Cabang'}
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <StatCard icon={IconBuilding} label="Tenant Aktif" value={stats.total_tenants} color="navy" />

                    <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 hover:shadow-sm transition-shadow">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                            <IconGrid className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{stats.occupied_units}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Unit Terisi</p>
                        <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${occupancyRate}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{occupancyRate}% dari {stats.occupied_units + stats.vacant_units} unit</p>
                    </div>

                    <StatCard icon={IconDocument} label="Surat Izin Pending" value={stats.pending_permits} color="amber" />
                    <StatCard icon={IconClipboard} label="Sesi Sidak Aktif" value={stats.active_sessions} color="green" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div>
                        {actionNeeded.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <IconAlert className="w-5 h-5 text-amber-600 shrink-0" />
                                    <h2 className="text-sm font-semibold text-amber-800">
                                        Perlu Tindakan Anda ({actionNeeded.length})
                                    </h2>
                                </div>
                                <div className="space-y-2">
                                    {actionNeeded.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/permit-requests/${item.id}`}
                                            className="flex justify-between items-center bg-white rounded-lg px-4 py-3 hover:shadow-sm transition-shadow group"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {item.permit_number} — {item.store_name}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">Menunggu: {item.step_label}</p>
                                            </div>
                                            <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-[#E2E5EA]">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5EA]">
                                <h2 className="text-sm font-semibold text-gray-800">Aktivitas Terbaru</h2>
                                {availableFilters.length > 1 && (
                                    <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5">
                                        {availableFilters.map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => setActivityFilter(filter)}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                    activityFilter === filter
                                                        ? 'bg-white text-gray-900 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {filter === 'all' ? 'Semua' : activityLabel[filter]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {filteredActivity.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm text-gray-400">Belum ada aktivitas tercatat.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredActivity.map((item, idx) => {
                                        const Icon = activityIcon[item.type];
                                        return (
                                            <Link
                                                key={idx}
                                                href={item.url}
                                                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                                    <Icon className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-800 truncate">{item.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.time)}</p>
                                                </div>
                                                <Badge color={statusColorMap[item.status] ?? 'gray'}>{item.status}</Badge>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1 mb-1">
                            Akses Cepat
                        </p>
                        <ShortcutTile href="/inspection-sessions/current" icon={IconClipboard} title="Sesi Sidak" desc="Mulai atau lanjutkan" />
                        <ShortcutTile href="/permit-requests" icon={IconDocument} title="Surat Izin" desc="Kelola pengajuan" />
                        <ShortcutTile href="/tenants" icon={IconBuilding} title="Master Tenant" desc="Kelola data tenant" />
                        <ShortcutTile href="/units" icon={IconGrid} title="Master Unit" desc="Kelola okupansi" />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
    const colorMap = {
        navy: { bg: 'bg-[#0F1E36]/5', text: 'text-[#0F1E36]' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    }[color];

    return (
        <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 hover:shadow-sm transition-shadow">
            <div className={`w-8 h-8 rounded-lg ${colorMap.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${colorMap.text}`} />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function ShortcutTile({ href, icon: Icon, title, desc }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E5EA] p-3.5 hover:border-[#0F1E36]/20 hover:shadow-sm transition-all group"
        >
            <div className="w-9 h-9 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#0F1E36]" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">{title}</h3>
                <p className="text-xs text-gray-400 truncate">{desc}</p>
            </div>
            <IconArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0F1E36] group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
    );
}