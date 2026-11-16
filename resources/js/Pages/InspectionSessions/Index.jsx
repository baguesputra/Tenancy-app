import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import EmptyState from '@/Components/EmptyState';
import FilterBar, { FilterReset } from '@/Components/FilterBar';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Pagination from '@/Components/Pagination';
import CapaFindingsPanel from '@/Components/Sidak/CapaFindingsPanel';
import { IconDownload } from '@/Components/Icons';
import useCan from '@/hooks/useCan';
import { buildExportUrl } from '@/utils/exportUrl';
import { formatDateTimeShortID, formatDurationID } from '@/utils/format';

export default function Index({
    tab = 'sessions',
    sessions = null,
    findings = null,
    capaSummary = null,
    openCapaCount = 0,
    filters = {},
}) {
    const { can } = useCan();
    const canManage = can('sidak.manage');
    const isCapa = tab === 'capa';

    const [capaSearch, setCapaSearch] = useState(isCapa ? (filters.search ?? '') : '');

    useEffect(() => {
        if (!isCapa) return undefined;
        setCapaSearch(filters.search ?? '');
    }, [isCapa, filters.search]);

    useEffect(() => {
        if (!isCapa) return undefined;
        const timer = setTimeout(() => {
            if (capaSearch !== (filters.search ?? '')) {
                updateCapaFilter('search', capaSearch);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [capaSearch, isCapa]); // eslint-disable-line react-hooks/exhaustive-deps

    const switchTab = (nextTab) => {
        if (nextTab === tab) return;
        router.get(
            '/inspection-sessions',
            nextTab === 'capa' ? { tab: 'capa' } : {},
            { preserveScroll: true }
        );
    };

    const updateSessionFilter = (key, value) => {
        router.get(
            '/inspection-sessions',
            { ...filters, [key]: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const resetSessionFilters = () => {
        router.get('/inspection-sessions', {}, { preserveScroll: true, replace: true });
    };

    const updateCapaFilter = (key, value) => {
        router.get(
            '/inspection-sessions',
            { ...filters, tab: 'capa', [key]: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const resetCapaFilters = () => {
        setCapaSearch('');
        router.get('/inspection-sessions', { tab: 'capa' }, { preserveScroll: true, replace: true });
    };

    const hasSessionFilter = Boolean(!isCapa && (filters.status || filters.date_from || filters.date_to));
    const hasCapaFilter = Boolean(isCapa && (filters.search || filters.status || filters.severity));

    const columns = [
        { key: 'start', label: 'Mulai' },
        { key: 'end', label: 'Selesai' },
        { key: 'duration', label: 'Durasi' },
        { key: 'pic', label: 'PIC' },
        { key: 'branch', label: 'Cabang' },
        { key: 'count', label: 'Jumlah Tenant' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    const capaKpis = [
        { key: '', label: 'Total Temuan', value: capaSummary?.total ?? 0 },
        { key: 'open', label: 'Perlu Perbaikan', value: capaSummary?.open ?? 0 },
        { key: 'submitted', label: 'Menunggu Verifikasi', value: capaSummary?.submitted ?? 0 },
        { key: 'overdue', label: 'Terlambat', value: capaSummary?.overdue ?? 0 },
        { key: 'verified', label: 'Terverifikasi', value: capaSummary?.verified ?? 0 },
    ];

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-[#0F1E36] sm:text-2xl">
                            {isCapa ? 'Temuan & Tindak Lanjut Sidak' : 'Riwayat Sesi Sidak'}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {isCapa
                                ? `${capaSummary?.total ?? 0} temuan tercatat · pantau perbaikan CAPA lintas tenant`
                                : `${sessions?.total ?? 0} sesi tercatat`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            role="tablist"
                            aria-label="Bagian modul sidak"
                            className="inline-flex rounded-lg border border-[#E2E5EA] bg-white p-0.5"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={!isCapa}
                                onClick={() => switchTab('sessions')}
                                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition ${
                                    !isCapa ? 'bg-[#0F1E36] text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                Sesi Sidak
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={isCapa}
                                onClick={() => switchTab('capa')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition ${
                                    isCapa ? 'bg-[#0F1E36] text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span>Temuan CAPA</span>
                                {openCapaCount > 0 && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                                            isCapa ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                                        }`}
                                    >
                                        {openCapaCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <a
                            href={buildExportUrl('/inspection-sessions/export', isCapa ? {} : filters)}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        >
                            <IconDownload className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            <span>Export Excel</span>
                        </a>

                        {canManage && (
                            <Link href="/inspection-sessions/create" className="w-full shrink-0 sm:w-auto">
                                <Button className="min-h-11 w-full justify-center sm:w-auto">Tambah Sesi</Button>
                            </Link>
                        )}
                    </div>
                </header>

                {!isCapa && sessions && (
                    <>
                        <FilterBar>
                            <div className="flex flex-wrap items-center gap-2">
                                <SelectInput
                                    value={filters.status ?? ''}
                                    onChange={(e) => updateSessionFilter('status', e.target.value)}
                                    className="sm:w-44"
                                    aria-label="Filter status sesi"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="in_progress">Berlangsung</option>
                                    <option value="completed">Selesai</option>
                                </SelectInput>
                                <input
                                    type="date"
                                    value={filters.date_from ?? ''}
                                    onChange={(e) => updateSessionFilter('date_from', e.target.value)}
                                    aria-label="Dari tanggal sesi"
                                    className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                                />
                                <input
                                    type="date"
                                    value={filters.date_to ?? ''}
                                    onChange={(e) => updateSessionFilter('date_to', e.target.value)}
                                    aria-label="Sampai tanggal sesi"
                                    className="min-h-[44px] rounded-lg border border-gray-300 px-3 text-sm text-gray-700"
                                />
                                {hasSessionFilter && <FilterReset onClick={resetSessionFilters} />}
                            </div>
                        </FilterBar>

                        <div className="hidden sm:mb-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                            <h2 className="text-base font-semibold text-[#0F1E36]">Semua sesi</h2>
                            <span className="text-sm text-gray-500">Pilih baris untuk membuka detail</span>
                        </div>

                        <div className="hidden sm:block">
                            <DataTable columns={columns} caption="Riwayat sesi sidak" footer={<Pagination meta={sessions} links={sessions.links} />}>
                                {sessions.data.map((session) => (
                                    <tr
                                        key={session.id}
                                        onClick={() => router.visit(`/inspection-sessions/${session.id}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                router.visit(`/inspection-sessions/${session.id}`);
                                            }
                                        }}
                                        tabIndex={0}
                                        className="cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {formatDateTimeShortID(session.started_at)}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                                            {session.ended_at ? formatDateTimeShortID(session.ended_at) : '—'}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                                            {formatDurationID(session.started_at, session.ended_at)}
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">{session.pic_name ?? '—'}</td>
                                        <td className="px-5 py-4 text-gray-600">{session.branch?.name ?? '—'}</td>
                                        <td className="px-5 py-4 text-gray-600">{session.inspections?.length ?? 0}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Badge color={session.status === 'completed' ? 'green' : 'blue'}>
                                                {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {sessions.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8">
                                            <EmptyState
                                                variant="empty"
                                                size="md"
                                                title="Belum Ada Riwayat Sesi Sidak"
                                                description="Mulai sesi inspeksi lapangan pertama Anda untuk merekam data sidak tenant."
                                                action={
                                                    canManage && (
                                                        <Link href="/inspection-sessions/create">
                                                            <Button className="min-h-11 justify-center !py-2.5">Tambah Sesi</Button>
                                                        </Link>
                                                    )
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </DataTable>
                        </div>

                        <div className="space-y-3 sm:hidden">
                            {sessions.data.map((session) => (
                                <Link
                                    key={session.id}
                                    href={`/inspection-sessions/${session.id}`}
                                    className="block min-h-[88px] rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-sm transition-colors active:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatDateTimeShortID(session.started_at)}
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                Selesai: {session.ended_at ? formatDateTimeShortID(session.ended_at) : '—'} · {formatDurationID(session.started_at, session.ended_at)}
                                            </p>
                                            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                                                <div className="truncate"><dt className="sr-only">PIC</dt>PIC: {session.pic_name ?? '—'}</div>
                                                <div className="truncate"><dt className="sr-only">Cabang</dt>{session.branch?.name ?? '—'}</div>
                                                <div><dt className="sr-only">Jumlah tenant</dt>{session.inspections?.length ?? 0} tenant</div>
                                            </dl>
                                        </div>
                                        <Badge color={session.status === 'completed' ? 'green' : 'blue'} size="sm">
                                            {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                            {sessions.data.length === 0 && (
                                <div className="rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-sm">
                                    <EmptyState
                                        variant="empty"
                                        size="sm"
                                        title="Belum Ada Riwayat Sesi"
                                        description="Mulai sesi pertama untuk inspeksi lapangan."
                                        action={
                                            canManage && (
                                                <Link href="/inspection-sessions/create">
                                                    <Button className="min-h-11 w-full justify-center !py-2.5">Tambah Sesi</Button>
                                                </Link>
                                            )
                                        }
                                    />
                                </div>
                            )}
                            <div className="rounded-xl border border-[#E2E5EA] bg-white">
                                <Pagination meta={sessions} links={sessions.links} />
                            </div>
                        </div>
                    </>
                )}

                {isCapa && findings && (
                    <>
                        <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-px overflow-hidden rounded-lg border border-[#E2E5EA] bg-[#E2E5EA]">
                            {capaKpis.map((k) => {
                                const active = (filters.status ?? '') === k.key;
                                return (
                                    <button
                                        key={k.key || 'all'}
                                        type="button"
                                        onClick={() => updateCapaFilter('status', active && k.key !== '' ? '' : k.key)}
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
                                        value={capaSearch}
                                        onChange={(e) => setCapaSearch(e.target.value)}
                                        aria-label="Cari temuan"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <SelectInput
                                        value={filters.status ?? ''}
                                        onChange={(e) => updateCapaFilter('status', e.target.value)}
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
                                        onChange={(e) => updateCapaFilter('severity', e.target.value)}
                                        className="sm:w-44"
                                        aria-label="Filter keparahan"
                                    >
                                        <option value="">Semua Keparahan</option>
                                        <option value="minor">Ringan (Minor)</option>
                                        <option value="major">Sedang (Major)</option>
                                        <option value="critical">Kritis (Critical)</option>
                                    </SelectInput>
                                    {hasCapaFilter && <FilterReset onClick={resetCapaFilters} />}
                                </div>
                            </div>
                        </FilterBar>

                        <div className="bg-white rounded-xl border border-[#E2E5EA] overflow-hidden">
                            <CapaFindingsPanel
                                findings={findings.data ?? []}
                                canManage={can('sidak.manage')}
                                canAnswer={can('sidak.answer')}
                                showTenant
                                emptyTitle={hasCapaFilter ? 'Tidak ada temuan cocok' : 'Belum ada temuan CAPA'}
                                emptyDescription={hasCapaFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Temuan akan tercatat otomatis saat inspeksi sidak diselesaikan.'}
                            />
                            <Pagination meta={findings} links={findings.links} />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
