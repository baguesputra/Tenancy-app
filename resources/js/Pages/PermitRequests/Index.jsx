import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StepProgressMini from '@/Components/StepProgressMini';
import FilterBar, { FilterReset } from '@/Components/FilterBar';
import { IconStorefront, IconCalendarEvent, IconWrench, IconBuilding, IconCar, IconChevronDown } from '@/Components/Icons';
import { PERMIT_CATEGORY_META, PERMIT_SOURCE_META, PERMIT_STATUS_META } from '@/Constants/permitMeta';
import { formatRelativeID, formatDateID } from '@/utils/format';

const CATEGORY_ICON = {
    storefront: IconStorefront,
    calendar: IconCalendarEvent,
    building: IconBuilding,
    wrench: IconWrench,
    car: IconCar,
};

const codeOf = (p, cat) => (p.permit_number?.split('/')?.[1]) || cat.code || '—';

export default function Index({ permits, filters = {}, activityTypes = [], summary = { total: 0, counts: {} }, categoryLocked = null, hiddenCategories = [] }) {
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [advancedOpen, setAdvancedOpen] = useState(Boolean(filters.activity_type));
    const { auth } = usePage().props;
    const canCreate = auth?.user?.roles?.includes('super_admin')
        || (auth?.user?.permissions ?? []).includes('permits.create');
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
        setAdvancedOpen(false);
        router.get('/permit-requests', {}, { preserveScroll: true, replace: true });
    };

    const myTurnCount = permits.data.filter((p) => p.is_my_turn).length;
    const hasFilter = locked ? (filters.search || filters.status) : (filters.search || filters.category || filters.activity_type || filters.status);
    const counts = summary.counts ?? {};
    const activeCategory = filters.category ?? '';
    const activeActivityLabel = activityTypes.find((t) => t.value === filters.activity_type)?.label;
    const advancedFilterCount = filters.activity_type ? 1 : 0;

    const categoryFilters = [
        { key: '', label: 'Semua', value: summary.total ?? 0 },
        ...Object.entries(PERMIT_CATEGORY_META)
            .filter(([key]) => !hiddenCategories.includes(key))
            .map(([key, meta]) => ({
                key,
                label: meta.label,
                value: counts[key] ?? 0,
                icon: CATEGORY_ICON[meta.icon] ?? IconBuilding,
                tint: meta.tint,
            })),
    ];

    const rows = [...permits.data].sort((a, b) => Number(b.is_my_turn) - Number(a.is_my_turn));

    const columns = locked ? [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'source', label: 'Sumber' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'date', label: 'Diajukan' },
        { key: 'progress', label: 'Progress' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ] : [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'category', label: 'Jenis' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'date', label: 'Diajukan' },
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
                    {canCreate && (
                        <Link href="/permit-requests/create">
                            <Button>{locked ? '+ Ajukan Pameran' : '+ Ajukan Atas Nama Tenant'}</Button>
                        </Link>
                    )}
                </div>

                {myTurnCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <p className="text-sm text-amber-800">
                            Ada <span className="font-semibold">{myTurnCount}</span> permohonan menunggu tindakan kamu.
                        </p>
                    </div>
                )}

                <FilterBar>
                    <div className="w-full space-y-2.5">
                        {!locked && (
                            <>
                                <div className="hidden lg:flex flex-wrap items-center gap-2" role="group" aria-label="Filter jenis izin">
                                    {categoryFilters.map((category) => {
                                        const active = activeCategory === category.key;
                                        const CategoryIcon = category.icon;

                                        return (
                                            <button
                                                key={category.key || 'all'}
                                                type="button"
                                                onClick={() => updateFilter('category', active ? '' : category.key)}
                                                aria-pressed={active}
                                                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    active
                                                        ? 'border-[#0F1E36] bg-[#0F1E36]/5 text-[#0F1E36] ring-1 ring-[#0F1E36]'
                                                        : 'border-[#E2E5EA] bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {CategoryIcon && <CategoryIcon className={`h-4 w-4 shrink-0 ${category.tint}`} aria-hidden="true" />}
                                                <span>{category.label}</span>
                                                <span className={`text-xs tabular-nums ${active ? 'text-[#0F1E36]/70' : 'text-gray-500'}`}>{category.value}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="lg:hidden">
                                    <SelectInput
                                        value={activeCategory}
                                        onChange={(e) => updateFilter('category', e.target.value)}
                                        className="!rounded-xl"
                                        aria-label="Filter jenis izin"
                                    >
                                        <option value="">Semua jenis ({summary.total ?? 0})</option>
                                        {categoryFilters.filter((category) => category.key).map((category) => (
                                            <option key={category.key} value={category.key}>
                                                {category.label} ({category.value})
                                            </option>
                                        ))}
                                    </SelectInput>
                                </div>
                            </>
                        )}

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

                            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                                <div className="min-w-[132px] flex-1 lg:w-44 lg:flex-none">
                                    <SelectInput
                                        value={filters.status ?? ''}
                                        onChange={(e) => updateFilter('status', e.target.value)}
                                        className="!rounded-xl"
                                        aria-label="Filter status"
                                    >
                                        <option value="">Semua Status</option>
                                        {Object.entries(PERMIT_STATUS_META).map(([value, meta]) => (
                                            <option key={value} value={value}>{meta.label}</option>
                                        ))}
                                    </SelectInput>
                                </div>

                                {!locked && (
                                    <button
                                        type="button"
                                        onClick={() => setAdvancedOpen((open) => !open)}
                                        aria-expanded={advancedOpen}
                                        aria-controls="permit-activity-filter"
                                        className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                            advancedFilterCount > 0
                                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
                                        </svg>
                                        <span>Filter</span>
                                        {advancedFilterCount > 0 && (
                                            <span className="rounded-full bg-[#0F1E36] px-1.5 text-[10px] font-semibold leading-4 text-white">{advancedFilterCount}</span>
                                        )}
                                        <IconChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    </button>
                                )}

                                {hasFilter && <FilterReset onClick={resetFilters} />}
                            </div>
                        </div>

                        {!locked && filters.activity_type && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Filter aktif:</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateFilter('activity_type', '');
                                        setAdvancedOpen(false);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#E2E5EA] bg-gray-50 px-2.5 py-1 font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    Aktivitas: {activeActivityLabel ?? filters.activity_type}
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {!locked && advancedOpen && (
                            <div id="permit-activity-filter" className="border-t border-[#E2E5EA] pt-2.5">
                                <SelectInput
                                    value={filters.activity_type ?? ''}
                                    onChange={(e) => {
                                        updateFilter('activity_type', e.target.value);
                                        if (!e.target.value) setAdvancedOpen(false);
                                    }}
                                    className="!rounded-xl lg:max-w-xs"
                                    aria-label="Filter tipe aktivitas"
                                >
                                    <option value="">Semua Aktivitas</option>
                                    {activityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </SelectInput>
                            </div>
                        )}
                    </div>
                </FilterBar>

                <div className="hidden sm:block">
                <DataTable columns={columns} footer={<Pagination meta={permits} links={permits.links} />}>
                    {rows.map((p) => {
                        const cat = PERMIT_CATEGORY_META[p.category] ?? PERMIT_CATEGORY_META.vendor;
                        const src = PERMIT_SOURCE_META[p.source] ?? PERMIT_SOURCE_META.staff;
                        const CatIcon = CATEGORY_ICON[cat.icon] ?? IconBuilding;
                        const extraActivities = (p.activity_labels ?? []).length - 1;
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
                                        <span className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 bg-[#0F1E36]/5 text-[#0F1E36]">
                                            {codeOf(p, cat)}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-gray-900 truncate">{p.permit_number}</span>
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
                                    <span className="flex items-center gap-1.5">
                                        <CatIcon className={`w-4 h-4 shrink-0 ${cat.tint}`} aria-hidden="true" />
                                        <span className="text-sm text-gray-900">{cat.label}</span>
                                    </span>
                                    <span className="block text-[11px] text-gray-400 mt-0.5">
                                        via {src.label}{extraActivities > 0 ? ` · +${extraActivities} aktivitas` : ''}
                                    </span>
                                </td>
                                )}
                                {locked && (
                                <td className="px-5 py-3.5">
                                    <Badge color="gray" size="sm">{src.label}</Badge>
                                </td>
                                )}
                                <td className="px-5 py-3.5">
                                    <span className="block text-sm text-gray-900 truncate max-w-52" title={p.store_name_snapshot}>{p.store_name_snapshot}</span>
                                    <span className="block text-xs text-gray-400 truncate max-w-52" title={(p.activity_labels ?? []).join(' · ') || '—'}>{(p.activity_labels ?? []).join(' · ') || '—'}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="text-sm text-gray-600" title={formatDateID(p.request_date)}>{formatRelativeID(p.request_date)}</span>
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
                                            <Badge color={PERMIT_STATUS_META[p.status]?.color ?? 'gray'}>{PERMIT_STATUS_META[p.status]?.label ?? p.status}</Badge>
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
                            <td colSpan={6} className="px-5 py-12 text-center">
                                <p className="text-sm font-medium text-gray-700">{locked ? 'Belum ada pengajuan pameran.' : 'Belum ada surat izin ditemukan.'}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {hasFilter
                                        ? 'Coba ubah kata kunci atau reset filter.'
                                        : canCreate
                                            ? (locked ? 'Klik Ajukan Pameran untuk pengajuan pertama.' : 'Klik Ajukan Atas Nama Tenant untuk pengajuan pertama.')
                                            : 'Belum ada data untuk ditampilkan.'}
                                </p>
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
                    {rows.map((p) => {
                        const cat = PERMIT_CATEGORY_META[p.category] ?? PERMIT_CATEGORY_META.vendor;
                        const CatIcon = CATEGORY_ICON[cat.icon] ?? IconBuilding;
                        return (
                            <div
                                key={p.id}
                                onClick={() => router.visit(`/permit-requests/${p.id}`)}
                                className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{p.permit_number}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.store_name_snapshot} · {formatRelativeID(p.request_date)}</p>
                                    </div>
                                    {p.status === 'pending' && p.current_step_label ? (
                                        <Badge color="yellow" size="sm">Menunggu {p.current_step_label.replace('Approval ', '')}</Badge>
                                    ) : (
                                        <Badge color={PERMIT_STATUS_META[p.status]?.color ?? 'gray'} size="sm">{PERMIT_STATUS_META[p.status]?.label ?? p.status}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold rounded px-1.5 py-0.5 bg-[#0F1E36]/5 text-[#0F1E36]">
                                        <CatIcon className={`w-3 h-3 ${cat.tint}`} aria-hidden="true" />
                                        {codeOf(p, cat)}
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
                            <p className={`text-xs text-gray-400 mt-1 ${hasFilter || canCreate ? 'mb-4' : ''}`}>
                                {hasFilter
                                    ? 'Coba ubah kata kunci atau reset filter.'
                                    : canCreate
                                        ? (locked ? 'Klik Ajukan Pameran untuk pengajuan pertama.' : 'Klik Ajukan Atas Nama Tenant untuk pengajuan pertama.')
                                        : 'Belum ada data untuk ditampilkan.'}
                            </p>
                            {hasFilter ? (
                                <button onClick={resetFilters} className="text-sm text-[#0F1E36] font-medium hover:underline rounded">Reset filter</button>
                            ) : canCreate ? (
                                <Link href="/permit-requests/create">
                                    <Button className="justify-center !py-3 min-h-[48px]">{locked ? '+ Ajukan Pameran' : '+ Ajukan Atas Nama Tenant'}</Button>
                                </Link>
                            ) : null}
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
