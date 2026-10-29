import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import EmptyState from '@/Components/EmptyState';
import { IconClipboard, IconAlert } from '@/Components/Icons';
import initials from '@/utils/initials';

export default function Index({
    tenants,
    filters = {},
    productCategories = [],
    summary = { total: 0, active: 0, inactive: 0, pending_permits: 0 },
}) {
    const [searchText, setSearchText] = useState(filters.search ?? '');

    const updateFilter = (key, value) => {
        router.get(
            '/tenant-profiles',
            { ...filters, [key]: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) {
                updateFilter('search', searchText);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasFilter = Boolean(filters.search || filters.product_category_id || filters.status);

    const resetFilters = () => {
        setSearchText('');
        router.get('/tenant-profiles', {}, { preserveScroll: true, replace: true });
    };

    const stats = [
        {
            key: '',
            label: 'Total Tenant',
            value: summary.total ?? tenants.total ?? 0,
            dot: 'bg-[#0F1E36]',
        },
        {
            key: 'active',
            label: 'Tenant Aktif',
            value: summary.active ?? 0,
            dot: 'bg-emerald-500',
        },
        {
            key: 'inactive',
            label: 'Nonaktif',
            value: summary.inactive ?? 0,
            dot: 'bg-slate-400',
        },
        {
            key: 'has_pending_permit',
            label: 'Antrean Izin Kerja',
            value: summary.pending_permits ?? 0,
            dot: (summary.pending_permits ?? 0) > 0 ? 'bg-amber-500' : 'bg-slate-300',
        },
    ];

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'category', label: 'Kategori' },
        { key: 'unit', label: 'Unit Aktif' },
        { key: 'operations', label: 'Operasional' },
        { key: 'status', label: 'Status' },
        { key: 'action', label: '', className: 'text-right w-16' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-5 sm:py-7 flex-1 max-w-7xl w-full mx-auto space-y-5">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Master Data</p>
                        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                            Profil Tenant
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Direktori profil operasional, status unit aktif, riwayat sidak berkala, dan antrean izin kerja tenant.
                        </p>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                        Menampilkan <span className="text-slate-900 font-semibold">{tenants.data.length}</span> dari{' '}
                        <span className="text-slate-900 font-semibold">{tenants.total ?? summary.total}</span> tenant
                    </div>
                </div>

                {/* KPI Summary / Quick Filter */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-lg border border-[#E2E5EA] bg-[#E2E5EA]">
                    {stats.map((stat) => {
                        const isActive = (filters.status ?? '') === stat.key;

                        return (
                            <button
                                key={stat.key || 'total'}
                                type="button"
                                onClick={() => updateFilter('status', filters.status === stat.key ? '' : stat.key)}
                                aria-pressed={isActive}
                                className={`bg-white px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${stat.dot}`} aria-hidden="true" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        {stat.label}
                                    </span>
                                </div>
                                <span className={`mt-2 block font-mono text-xl font-semibold tabular-nums ${isActive ? 'text-[#0F1E36]' : 'text-slate-900'}`}>
                                    {stat.value}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter Toolbar */}
                <div className="bg-white rounded-lg border border-[#E2E5EA] p-3.5">
                    <div className="flex flex-col lg:flex-row gap-2.5">
                        <div className="relative min-w-0 flex-1">
                            <svg
                                 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                                />
                            </svg>
                            <TextInput
                                placeholder="Cari nama tenant / badan usaha / unit / telepon..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9 min-h-[42px]"
                                aria-label="Cari tenant"
                            />
                            {searchText && (
                                <button
                                    onClick={() => setSearchText('')}
                                     className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
                                    aria-label="Hapus kata kunci"
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row items-center">
                            <SelectInput
                                value={filters.product_category_id ?? ''}
                                onChange={(e) => updateFilter('product_category_id', e.target.value)}
                                className="lg:w-52 min-h-[42px]"
                                aria-label="Filter kategori produk"
                            >
                                <option value="">Semua Kategori Produk</option>
                                {productCategories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectInput>

                            <SelectInput
                                value={filters.status ?? ''}
                                onChange={(e) => updateFilter('status', e.target.value)}
                                className="lg:w-48 min-h-[42px]"
                                aria-label="Filter status tenant"
                            >
                                <option value="">Semua Status Operasional</option>
                                <option value="active">Tenant Aktif</option>
                                <option value="inactive">Tenant Nonaktif</option>
                                <option value="has_pending_permit">Ada Antrean Izin Kerja</option>
                            </SelectInput>

                            {hasFilter && (
                                <button
                                    onClick={resetFilters}
                                     className="col-span-2 lg:col-span-1 px-3.5 py-2 min-h-[42px] text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop Data Table */}
                <div className="hidden sm:block">
                    <DataTable
                        columns={columns}
                        footer={<Pagination meta={tenants} links={tenants.links} />}
                    >
                        {tenants.data.map((t) => {
                            const activeUnit = t.active_tenancy?.unit ?? t.activeTenancy?.unit;
                            const completedSidak = t.inspections_completed_count ?? 0;
                            const pendingPermits = t.permits_pending_count ?? 0;
                            const categoryName = t.product_category?.name ?? t.productCategory?.name;
                            const tenantType = t.tenant_category?.name ?? t.tenantCategory?.name;

                            return (
                                <tr
                                    key={t.id}
                                    onClick={() => router.visit(`/tenant-profiles/${t.id}/detail`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            router.visit(`/tenant-profiles/${t.id}/detail`);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="link"
                                    aria-label={`Buka detail profil ${t.name}`}
                                    className="cursor-pointer hover:bg-slate-50/90 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] group"
                                >
                                    {/* Tenant Info */}
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {t.logo_url ? (
                                                <img
                                                    src={t.logo_url}
                                                    alt={`Logo ${t.name}`}
                                                    className="w-10 h-10 rounded-xl object-contain bg-white border border-[#E2E5EA] p-0.5 shrink-0 shadow-2xs"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span
                                                    className="w-10 h-10 rounded-xl bg-[#0F1E36] text-white text-xs font-bold flex items-center justify-center shrink-0 tracking-wider shadow-2xs"
                                                    aria-hidden="true"
                                                >
                                                    {initials(t.name)}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                 <span className="block font-semibold text-slate-900 group-hover:text-[#0F1E36] transition-colors truncate text-sm">
                                                    {t.name}
                                                </span>
                                                 <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5">
                                                    {t.legal_entity_name ? (
                                                        <span>{t.legal_entity_name}</span>
                                                    ) : t.branch?.name ? (
                                                        <span>{t.branch.name}</span>
                                                    ) : t.company_phone ? (
                                                        <span>{t.company_phone}</span>
                                                    ) : (
                                                         <span className="text-slate-400">Profil terdaftar</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Kategori */}
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            {categoryName || 'Tanpa Kategori'}
                                        </span>
                                        {tenantType && tenantType !== categoryName && (
                                             <span className="block text-[11px] text-slate-400 mt-0.5">
                                                {tenantType}
                                            </span>
                                        )}
                                    </td>

                                    {/* Unit Aktif */}
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {activeUnit ? (
                                            <div>
                                                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#0F1E36]/5 text-[#0F1E36] border border-[#0F1E36]/15">
                                                    {activeUnit.unit_code}
                                                </span>
                                                {activeUnit.floor && (
                                                     <span className="block text-[11px] text-slate-400 mt-0.5">
                                                        Lantai {activeUnit.floor}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                             <span className="text-xs text-slate-400 italic">
                                                Tanpa unit aktif
                                            </span>
                                        )}
                                    </td>

                                    {/* Operasional: Sidak & Izin */}
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                                    completedSidak > 0
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                         : 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                                title={`${completedSidak} sidak selesai`}
                                            >
                                                <IconClipboard className="w-3.5 h-3.5 shrink-0" />
                                                <span>{completedSidak} Sidak</span>
                                            </span>

                                            {pendingPermits > 0 ? (
                                                <span
                                                     className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300"
                                                    title={`${pendingPermits} surat izin menunggu persetujuan`}
                                                >
                                                    <IconAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                                    <span>{pendingPermits} Izin Antre</span>
                                                </span>
                                            ) : (
                                                <span
                                                     className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-400 border border-transparent"
                                                    title="Tidak ada antrean izin kerja"
                                                >
                                                    0 Antre
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <Badge color={t.is_active ? 'green' : 'gray'}>
                                            {t.is_active ? 'Aktif' : 'Nonaktif'}
                                        </Badge>
                                    </td>

                                    {/* Direct Action Indicator */}
                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                         <span className="inline-flex items-center text-xs font-semibold text-slate-400 group-hover:text-[#0F1E36] group-hover:translate-x-0.5 transition-all">
                                            Detail
                                            <svg
                                                className="w-4 h-4 ml-0.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}

                        {tenants.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-8">
                                    <EmptyState
                                        variant={hasFilter ? 'search' : 'empty'}
                                        size="md"
                                        title={hasFilter ? 'Tenant Tidak Ditemukan' : 'Belum Ada Profil Tenant'}
                                        description={
                                            hasFilter
                                                ? 'Coba ubah kata kunci atau reset filter pencarian.'
                                                : 'Belum ada data profil tenant yang terdaftar dalam sistem.'
                                        }
                                        action={
                                            hasFilter && (
                                                <button
                                                    onClick={resetFilters}
                                                    className="px-4 py-2 text-xs font-semibold text-[#0F1E36] bg-[#0F1E36]/10 hover:bg-[#0F1E36]/15 rounded-lg transition-colors"
                                                >
                                                    Reset Pencarian
                                                </button>
                                            )
                                        }
                                    />
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                {/* Mobile View: High-Density Touch Cards */}
                <div className="sm:hidden space-y-3">
                    {tenants.data.map((t) => {
                        const activeUnit = t.active_tenancy?.unit ?? t.activeTenancy?.unit;
                        const completedSidak = t.inspections_completed_count ?? 0;
                        const pendingPermits = t.permits_pending_count ?? 0;
                        const categoryName = t.product_category?.name ?? t.productCategory?.name;

                        return (
                            <Link
                                key={t.id}
                                href={`/tenant-profiles/${t.id}/detail`}
                                 className="block bg-white rounded-lg border border-[#E2E5EA] p-4 hover:border-[#0F1E36]/40 active:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <div className="flex items-center gap-3">
                                    {t.logo_url ? (
                                        <img
                                            src={t.logo_url}
                                            alt={`Logo ${t.name}`}
                                            className="w-11 h-11 rounded-xl object-contain bg-white border border-[#E2E5EA] p-0.5 shrink-0"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span
                                            className="w-11 h-11 rounded-xl bg-[#0F1E36] text-white text-xs font-bold flex items-center justify-center shrink-0 tracking-wider"
                                            aria-hidden="true"
                                        >
                                            {initials(t.name)}
                                        </span>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5">
                                             <p className="text-sm font-bold text-slate-900 truncate">
                                                {t.name}
                                            </p>
                                            <Badge color={t.is_active ? 'green' : 'gray'} size="sm">
                                                {t.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                         <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {categoryName || 'Tanpa Kategori'}
                                        </p>
                                    </div>
                                </div>

                                 <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        {activeUnit ? (
                                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                                {activeUnit.unit_code}
                                            </span>
                                        ) : (
                                             <span className="text-slate-400 italic text-[11px]">
                                                Tanpa unit
                                            </span>
                                        )}
                                         <span className="text-slate-300">·</span>
                                         <span className="text-slate-600 font-medium">
                                            {completedSidak} sidak
                                        </span>
                                        {pendingPermits > 0 && (
                                            <>
                                                 <span className="text-slate-300">·</span>
                                                <span className="text-amber-700 font-bold">
                                                    {pendingPermits} izin antre
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <span className="text-[#0F1E36] font-semibold flex items-center gap-0.5 text-xs">
                                        Detail →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    {tenants.data.length === 0 && (
                         <div className="bg-white rounded-lg border border-[#E2E5EA] p-6">
                            <EmptyState
                                variant={hasFilter ? 'search' : 'empty'}
                                size="sm"
                                title={hasFilter ? 'Tenant Tidak Ditemukan' : 'Belum Ada Profil'}
                                description={
                                    hasFilter
                                        ? 'Coba ubah kata kunci atau reset filter pencarian.'
                                        : 'Belum ada data tenant.'
                                }
                            />
                        </div>
                    )}

                     <div className="bg-white rounded-lg border border-[#E2E5EA]">
                        <Pagination meta={tenants} links={tenants.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
