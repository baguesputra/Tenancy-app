import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Button from '@/Components/Form/Button';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { FilterReset } from '@/Components/FilterBar';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import EmptyState from '@/Components/EmptyState';

const STATUS_LABELS = {
    draft: 'Draft',
    pengisian_divisi: 'Pengisian Divisi',
    pengukuran_ulang: 'Pengukuran Ulang',
    sebelum_fitout: 'Sebelum Fitout',
    setelah_fitout: 'Setelah Fitout',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STAGE_LABELS = {
    marketing: 'Pengisian Divisi',
    pre_handover: 'Pengukuran Ulang',
    ba_handover: 'Sebelum Fitout',
    fitout: 'Setelah Fitout',
    completed: 'Completed',
};

function StatusMark({ status }) {
    return (
        <span className="inline-flex items-center rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}

export default function Index({ loos, summary = {}, filters = {}, statusOptions = [], stageOptions = [] }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const searchTimer = useRef(null);

    useEffect(() => () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
    }, []);

    const { auth } = usePage().props;
    const canCreate = auth.user?.roles?.includes('super_admin')
        || (auth.user?.permissions ?? []).includes('loos.create');

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        router.get('/loos', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasFilter = filters.search || filters.status || filters.current_stage;
    const resetFilters = () => {
        setSearch('');
        router.get('/loos', {}, { preserveScroll: true, replace: true });
    };

    // Strip KPI dihitung client-side dari summary yang sudah difilter backend.
    const num = (v) => Number(v ?? 0);
    const inProgress = num(summary.draft)
        + num(summary.pengisian_divisi)
        + num(summary.pengukuran_ulang)
        + num(summary.sebelum_fitout)
        + num(summary.setelah_fitout);
    const kpis = [
        { key: 'total', label: 'Total', value: num(summary.total), filterValue: '' },
        { key: 'progress', label: 'Dalam Proses', value: inProgress, filterValue: null },
        { key: 'completed', label: 'Selesai', value: num(summary.completed), filterValue: 'completed' },
        { key: 'cancelled', label: 'Dibatalkan', value: num(summary.cancelled), filterValue: 'cancelled' },
    ];
    const activeStatus = filters.status ?? '';

    const statusOptionLabel = (s) => s.label;

    const columns = [
        { key: 'loo_number', label: 'No. LOO' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'status', label: 'Status' },
        { key: 'current_stage', label: 'Stage' },
        { key: 'branch', label: 'Cabang' },
    ];

    const emptyBlock = (
        <EmptyState
            variant={hasFilter ? 'search' : 'empty'}
            size="sm"
            title={hasFilter ? 'Tidak ada LOO yang cocok.' : 'Belum Ada Dokumen LOO'}
            description={hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Data Letter of Offer (LOO) belum tersedia.'}
            action={hasFilter ? (
                <button onClick={resetFilters} className="text-sm font-semibold text-[#0F1E36] hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                    Reset filter
                </button>
            ) : undefined}
        />
    );

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Master Data</p>
                        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">LOO</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{summary.total ?? 0} LOO terdaftar</p>
                    </div>
                    {canCreate && (
                        <Link href="/loos/create">
                            <Button>+ Buat LOO</Button>
                        </Link>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-[#E2E5EA] overflow-hidden mb-4">
                    <div role="group" aria-label="Ringkasan LOO" className="grid grid-cols-2 xl:grid-cols-4 gap-px bg-[#E2E5EA]">
                        {kpis.map((k) => k.filterValue === null ? (
                            <div key={k.key} className="bg-white p-4">
                                <p className="text-[11px] uppercase tracking-wider text-slate-500">{k.label}</p>
                                <p className="mt-1 text-2xl font-mono font-semibold tabular-nums text-slate-900">{k.value}</p>
                            </div>
                        ) : (
                            <div key={k.key} className={`transition-colors ${activeStatus === k.filterValue ? 'bg-[#0F1E36]/5' : 'bg-white'}`}>
                                <button
                                    type="button"
                                    onClick={() => updateFilter('status', activeStatus === k.filterValue ? '' : k.filterValue)}
                                    aria-pressed={activeStatus === k.filterValue}
                                    className="block w-full p-4 text-left hover:bg-slate-50"
                                >
                                    <span className="block text-[11px] uppercase tracking-wider text-slate-500">{k.label}</span>
                                    <span className="mt-1 block text-2xl font-mono font-semibold tabular-nums text-slate-900">{k.value}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E5EA] p-2 mb-4 flex flex-col lg:flex-row gap-2">
                    <div className="min-w-0 flex-1">
                        <TextInput
                            placeholder="Cari no LOO / nama tenant..."
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearch(value);
                                if (searchTimer.current) clearTimeout(searchTimer.current);
                                searchTimer.current = setTimeout(() => {
                                    if (value !== (filters.search ?? '')) updateFilter('search', value);
                                }, 500);
                            }}
                            aria-label="Cari LOO"
                        />
                    </div>
                    <SelectInput value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className="lg:w-48" aria-label="Filter status">
                        <option value="">Semua Status</option>
                        {statusOptions.map((s) => <option key={s.value} value={s.value}>{statusOptionLabel(s)}</option>)}
                    </SelectInput>
                    <SelectInput value={filters.current_stage ?? ''} onChange={(e) => updateFilter('current_stage', e.target.value)} className="lg:w-48" aria-label="Filter stage">
                        <option value="">Semua Stage</option>
                        {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </SelectInput>
                    {hasFilter && <FilterReset onClick={resetFilters} />}
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns} footer={<Pagination meta={loos} links={loos.links} />}>
                        {loos.data.map((loo) => (
                            <tr
                                key={loo.id}
                                onClick={() => router.visit(`/loos/${loo.id}`)}
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-5 py-3.5 font-mono font-semibold tabular-nums text-slate-900">{loo.loo_number}</td>
                                <td className="px-5 py-3.5 text-slate-600">{loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'}</td>
                                <td className="px-5 py-3.5">
                                    <StatusMark status={loo.status} />
                                    {loo.status_detail && <span className="block text-xs text-slate-500 mt-1 max-w-[18rem]">{loo.status_detail}</span>}
                                </td>
                                <td className="px-5 py-3.5 text-slate-400 text-xs">{STAGE_LABELS[loo.current_stage] ?? loo.current_stage}</td>
                                <td className="px-5 py-3.5 text-slate-500">{loo.branch?.name ?? '—'}</td>
                            </tr>
                        ))}
                        {loos.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-6">
                                    {emptyBlock}
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {loos.data.map((loo) => (
                        <Link key={loo.id} href={`/loos/${loo.id}`} className="block bg-white rounded-lg border border-[#E2E5EA] p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-mono font-semibold tabular-nums text-slate-900">{loo.loo_number}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'}</p>
                                    {loo.status_detail && <p className="text-xs text-slate-500 mt-1">{loo.status_detail}</p>}
                                    <p className="text-[11px] text-slate-400 mt-1 truncate">{STAGE_LABELS[loo.current_stage] ?? loo.current_stage} · {loo.branch?.name ?? '—'}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <StatusMark status={loo.status} />
                                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {loos.data.length === 0 && (
                        <div className="bg-white rounded-lg border border-[#E2E5EA]">
                            {emptyBlock}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
