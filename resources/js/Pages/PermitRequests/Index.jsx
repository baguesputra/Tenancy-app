import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StepProgressMini from '@/Components/StepProgressMini';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red', cancelled: 'gray' };
const statusLabel = { pending: 'Menunggu', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan' };

const categoryMeta = {
    pameran: { label: 'Pameran / Open Counter', color: 'coral', code: 'E&P' },
    tenant: { label: 'Tenant', color: 'blue', code: 'TC' },
    vendor: { label: 'Vendor', color: 'amber', code: 'TC' },
    area: { label: 'Area Mall', color: 'gray', code: 'TC' },
};

const sourceMeta = {
    marketing: { label: 'Marketing', color: 'coral' },
    portal: { label: 'Portal', color: 'green' },
    staff: { label: 'Staff', color: 'blue' },
};

export default function Index({ permits, filters = {}, activityTypes = [], summary = { total: 0, counts: {} }, categoryLocked = null, hiddenCategories = [] }) {
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const locked = !!categoryLocked;

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const updateFilter = (key, value) => {
        if (locked && (key === 'category' || key === 'activity_type')) return;
        const next = { ...filters, [key]: value || undefined };
        if (locked) {
            delete next.category;
            delete next.activity_type;
        }
        router.get('/permit-requests', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const resetFilters = () => {
        setSearchText('');
        router.get('/permit-requests', {}, { preserveScroll: true, replace: true });
    };

    const myTurnCount = permits.data.filter((p) => p.is_my_turn).length;
    const hasFilter = locked ? (filters.search || filters.status) : (filters.search || filters.category || filters.activity_type || filters.status);
    const counts = summary.counts ?? {};

    const stats = locked ? [
        { key: 'pameran', label: 'Pengajuan Pameran', value: summary.total, dot: 'bg-[#FF6B6B]' },
    ] : [
        { key: '', label: 'Total Pengajuan', value: summary.total, dot: 'bg-[#0F1E36]' },
        { key: 'pameran', label: 'Pameran', value: counts.pameran ?? 0, dot: 'bg-[#FF6B6B]' },
        { key: 'tenant', label: 'Tenant', value: counts.tenant ?? 0, dot: 'bg-blue-500' },
        { key: 'vendor', label: 'Vendor', value: counts.vendor ?? 0, dot: 'bg-amber-500' },
        { key: 'area', label: 'Area', value: counts.area ?? 0, dot: 'bg-gray-400' },
    ].filter((s) => s.key === '' || !hiddenCategories.includes(s.key));

    const columns = locked ? [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'source', label: 'Sumber' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'progress', label: 'Progress' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ] : [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'category', label: 'Jenis' },
        { key: 'source', label: 'Sumber' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'progress', label: 'Progress' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{locked ? 'Pengajuan Pameran' : 'Surat Izin'}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{summary.total} pengajuan{locked ? ' pameran' : ' terdaftar'}</p>
                    </div>
                    <Link href="/permit-requests/create">
                        <Button>{locked ? '+ Ajukan Pameran' : '+ Ajukan Atas Nama Tenant'}</Button>
                    </Link>
                </div>

                {myTurnCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <p className="text-sm text-amber-800">
                            Ada <span className="font-semibold">{myTurnCount}</span> permohonan menunggu tindakan kamu.
                        </p>
                    </div>
                )}

                {locked ? (
                    <div className="bg-white rounded-xl border border-[#E2E5EA] px-4 py-3 mb-4 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B]" aria-hidden="true" />
                        <span className="text-xs text-gray-500">Pengajuan Pameran</span>
                        <span className="text-xl font-semibold text-gray-900 tabular-nums ml-auto">{summary.total}</span>
                    </div>
                ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                    {stats.map((s) => {
                        const active = (filters.category ?? '') === s.key;
                        return (
                            <button
                                key={s.label}
                                onClick={() => updateFilter('category', s.key)}
                                aria-pressed={active}
                                className={`text-left bg-white rounded-xl border px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${active ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300 hover:shadow-sm'}`}
                            >
                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                                    {s.label}
                                </span>
                                <span className="block text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                            </button>
                        );
                    })}
                </div>
                )}

                <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="flex flex-col lg:flex-row gap-2">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <TextInput
                                placeholder="Cari nomor / toko..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-10 !rounded-xl !leading-5"
                                aria-label="Cari nomor atau toko"
                            />
                        </div>
                        {!locked && (
                        <SelectInput
                            value={filters.activity_type ?? ''}
                            onChange={(e) => updateFilter('activity_type', e.target.value)}
                            className="lg:w-56 !rounded-xl"
                            aria-label="Filter tipe aktivitas"
                        >
                            <option value="">Semua Aktivitas</option>
                            {activityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </SelectInput>
                        )}
                        <SelectInput
                            value={filters.status ?? ''}
                            onChange={(e) => updateFilter('status', e.target.value)}
                            className="lg:w-44 !rounded-xl"
                            aria-label="Filter status"
                        >
                            <option value="">Semua Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                        </SelectInput>
                        {hasFilter && (
                            <button onClick={resetFilters} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0">
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block">
                <DataTable columns={columns} footer={<Pagination meta={permits} links={permits.links} />}>
                    {permits.data.map((p) => {
                        const cat = categoryMeta[p.category] ?? categoryMeta.area;
                        const src = sourceMeta[p.source] ?? sourceMeta.staff;
                        return (
                            <tr
                                key={p.id}
                                onClick={() => router.visit(`/permit-requests/${p.id}`)}
                                className={`group cursor-pointer transition-all ${
                                    p.is_my_turn ? 'bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-sm' : 'hover:bg-gray-50/80 hover:shadow-sm'
                                }`}
                            >
                                <td className="px-5 py-3.5">
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className={`shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 ${p.category === 'pameran' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'bg-gray-100 text-gray-500'}`}>
                                            {cat.code}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-medium text-gray-900 truncate">{p.permit_number}</span>
                                            {p.is_my_turn && (
                                                <span className="block text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                                                    Menunggu Anda
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </td>
                                {!locked && (
                                <td className="px-5 py-3.5">
                                    <Badge color={cat.color}>{cat.label}</Badge>
                                    {(p.activity_labels ?? []).length > 1 && (
                                        <span className="block text-[11px] text-gray-400 mt-1">+{(p.activity_labels ?? []).length - 1} aktivitas</span>
                                    )}
                                </td>
                                )}
                                <td className="px-5 py-3.5">
                                    <Badge color={src.color} size="sm">{src.label}</Badge>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="block text-sm text-gray-900 truncate max-w-52" title={p.store_name_snapshot}>{p.store_name_snapshot}</span>
                                    <span className="block text-xs text-gray-400 truncate max-w-52" title={(p.activity_labels ?? []).join(' · ') || '—'}>{(p.activity_labels ?? []).join(' · ') || '—'}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                    {p.step_progress?.length > 0 ? (
                                        <StepProgressMini steps={p.step_progress} />
                                    ) : (
                                        <span className="text-xs text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <span className="inline-flex items-center gap-1.5">
                                        {p.status === 'pending' && p.current_step_label ? (
                                            <Badge color="yellow">Menunggu {p.current_step_label.replace('Approval ', '')}</Badge>
                                        ) : (
                                            <Badge color={statusColor[p.status]}>{statusLabel[p.status] ?? p.status}</Badge>
                                        )}
                                        <svg className="w-4 h-4 text-gray-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {permits.data.length === 0 && (
                        <tr>
                            <td colSpan={locked ? 5 : 6} className="px-5 py-12 text-center">
                                <p className="text-sm font-medium text-gray-700">{locked ? 'Belum ada pengajuan pameran.' : 'Belum ada surat izin ditemukan.'}</p>
                                <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : locked ? 'Klik Ajukan Pameran untuk pengajuan pertama.' : 'Klik Ajukan Atas Nama Tenant untuk pengajuan pertama.'}</p>
                                {hasFilter && (
                                    <button onClick={resetFilters} className="mt-3 text-sm text-[#0F1E36] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                                        Reset filter
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {permits.data.map((p) => {
                        const cat = categoryMeta[p.category] ?? categoryMeta.area;
                        return (
                            <div
                                key={p.id}
                                onClick={() => router.visit(`/permit-requests/${p.id}`)}
                                className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{p.permit_number}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.store_name_snapshot}</p>
                                    </div>
                                    {p.status === 'pending' && p.current_step_label ? (
                                        <Badge color="yellow" size="sm">Menunggu {p.current_step_label.replace('Approval ', '')}</Badge>
                                    ) : (
                                        <Badge color={statusColor[p.status]} size="sm">{statusLabel[p.status] ?? p.status}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className={`shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 ${p.category === 'pameran' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]' : 'bg-gray-100 text-gray-500'}`}>
                                        {cat.code}
                                    </span>
                                    <span className="text-xs text-gray-400 truncate">{(p.activity_labels ?? []).join(' · ') || '—'}</span>
                                    {p.is_my_turn && (
                                        <span className="ml-auto shrink-0 text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                                            Menunggu Anda
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {permits.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">{locked ? 'Belum ada pengajuan pameran.' : 'Belum ada surat izin ditemukan.'}</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : locked ? 'Klik Ajukan Pameran untuk pengajuan pertama.' : 'Klik Ajukan Atas Nama Tenant untuk pengajuan pertama.'}</p>
                            {hasFilter ? (
                                <button onClick={resetFilters} className="text-sm text-[#0F1E36] font-medium hover:underline rounded">Reset filter</button>
                            ) : (
                                <Link href="/permit-requests/create">
                                    <Button className="justify-center !py-3 min-h-[48px]">{locked ? '+ Ajukan Pameran' : '+ Ajukan Atas Nama Tenant'}</Button>
                                </Link>
                            )}
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-[#E2E5EA]">
                        <Pagination meta={permits} links={permits.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
