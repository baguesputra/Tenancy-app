import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import FilterBar, { FilterReset } from '@/Components/FilterBar';
import Pagination from '@/Components/Pagination';
import CapaFindingsPanel from '@/Components/Sidak/CapaFindingsPanel';
import useCan from '@/hooks/useCan';

export default function Index({ findings, summary = {}, filters = {} }) {
    const { can } = useCan();
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                updateFilter('search', search);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateFilter = (key, value) => {
        router.get('/inspection-findings', { ...filters, [key]: value || undefined }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        router.get('/inspection-findings', {}, { preserveScroll: true, replace: true });
    };

    const hasFilter = Boolean(filters.search || filters.status || filters.severity);

    const kpis = [
        { key: '', label: 'Total Temuan', value: summary.total ?? 0 },
        { key: 'open', label: 'Perlu Perbaikan', value: summary.open ?? 0 },
        { key: 'submitted', label: 'Menunggu Verifikasi', value: summary.submitted ?? 0 },
        { key: 'overdue', label: 'Terlambat', value: summary.overdue ?? 0 },
        { key: 'verified', label: 'Terverifikasi', value: summary.verified ?? 0 },
    ];

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-[#0F1E36] sm:text-2xl">Temuan &amp; Tindak Lanjut Sidak</h1>
                        <p className="mt-1 text-sm text-gray-500">Pantau perbaikan temuan sidak (CAPA) lintas tenant</p>
                    </div>

                    <nav className="inline-flex rounded-lg border border-[#E2E5EA] bg-white p-0.5 self-start sm:self-auto" aria-label="Navigasi sidak">
                        <Link
                            href="/inspection-sessions"
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-md transition"
                        >
                            Sesi Sidak
                        </Link>
                        <Link
                            href="/inspection-findings"
                            aria-current="page"
                            className="px-3.5 py-2 text-xs font-semibold bg-[#0F1E36] text-white rounded-md"
                        >
                            Temuan CAPA
                        </Link>
                    </nav>
                </header>

                <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-px overflow-hidden rounded-lg border border-[#E2E5EA] bg-[#E2E5EA]">
                    {kpis.map((k) => {
                        const active = (filters.status ?? '') === k.key;
                        return (
                            <button
                                key={k.key || 'all'}
                                type="button"
                                onClick={() => updateFilter('status', active && k.key !== '' ? '' : k.key)}
                                aria-pressed={active}
                                className={`p-3.5 text-left transition-colors ${active ? 'bg-[#0F1E36]/5' : 'bg-white hover:bg-slate-50'}`}
                            >
                                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</span>
                                <span className="mt-1 block font-mono text-xl font-semibold tabular-nums text-slate-900">{k.value}</span>
                            </button>
                        );
                    })}
                </div>

                <FilterBar>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="min-w-0 flex-1">
                            <TextInput
                                placeholder="Cari tenant, bagian, atau item temuan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Cari temuan"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectInput
                                value={filters.status ?? ''}
                                onChange={(e) => updateFilter('status', e.target.value)}
                                className="sm:w-48"
                                aria-label="Filter status"
                            >
                                <option value="">Semua Status</option>
                                <option value="open">Perlu Perbaikan</option>
                                <option value="submitted">Menunggu Verifikasi</option>
                                <option value="overdue">Terlambat</option>
                                <option value="rejected">Ditolak</option>
                                <option value="verified">Terverifikasi</option>
                            </SelectInput>
                            <SelectInput
                                value={filters.severity ?? ''}
                                onChange={(e) => updateFilter('severity', e.target.value)}
                                className="sm:w-44"
                                aria-label="Filter keparahan"
                            >
                                <option value="">Semua Keparahan</option>
                                <option value="minor">Ringan (Minor)</option>
                                <option value="major">Sedang (Major)</option>
                                <option value="critical">Kritis (Critical)</option>
                            </SelectInput>
                            {hasFilter && <FilterReset onClick={resetFilters} />}
                        </div>
                    </div>
                </FilterBar>

                <div className="bg-white rounded-xl border border-[#E2E5EA] overflow-hidden">
                    <CapaFindingsPanel
                        findings={findings.data ?? []}
                        canManage={can('sidak.manage')}
                        canAnswer={can('sidak.answer')}
                        showTenant
                        emptyTitle={hasFilter ? 'Tidak ada temuan cocok' : 'Belum ada temuan CAPA'}
                        emptyDescription={hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Temuan akan tercatat otomatis saat inspeksi sidak diselesaikan.'}
                    />
                    <Pagination meta={findings} links={findings.links} />
                </div>
            </div>
        </AppLayout>
    );
}
