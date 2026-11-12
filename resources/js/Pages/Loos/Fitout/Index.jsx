import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '@/Components/Form/Button';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Badge from '@/Components/Badge';
import { LOO_STATUS_COLORS } from '@/Constants/looMeta';

const STATUS_LABELS = {
    draft: 'Draft',
    pengisian_divisi: 'Pengisian Divisi',
    pengukuran_ulang: 'Pengukuran Ulang',
    sebelum_fitout: 'Sebelum Fitout',
    setelah_fitout: 'Setelah Fitout',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

function ChecklistState({ state }) {
    if (!state.unlocked) return <span className="text-sm text-slate-400">Terkunci</span>;
    if (state.is_submitted) return <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Disubmit</span>;
    if (state.exists) return <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />Draft</span>;
    return <span className="text-sm text-slate-400">Belum diisi</span>;
}

export default function Index({ loos, summary = {}, branches = [], filters = {} }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        router.get('/fitout-checklists', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateFilter('search', search);
    };

    const columns = [
        { key: 'loo_number', label: 'No. LOO & Tenant' },
        { key: 'branch', label: 'Cabang / Unit' },
        { key: 'stage', label: 'Status LOO' },
        { key: 'pre_fitout', label: 'Sebelum Fitout' },
        { key: 'post_fitout', label: 'Setelah Fitout' },
        { key: 'pre_handover', label: 'Pengukuran Ulang' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <h1 className="mb-5 text-xl font-semibold tracking-tight text-slate-900">Checklist Operasional</h1>

                {/* Summary Cards */}
                <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#E2E5EA] bg-[#E2E5EA] sm:grid-cols-4">
                    {[
                        ['Total', summary.total ?? 0],
                        ['Proses fit out', summary.fitout_active ?? 0],
                        ['Menunggu GM', summary.waiting_gm ?? 0],
                        ['Selesai', summary.completed ?? 0],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-white px-5 py-3.5.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
                            <span className="mt-2 block font-mono text-xl font-semibold tabular-nums text-slate-900">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Filter Bar */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <TextInput
                            placeholder="Cari no LOO / nama tenant..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <SelectInput
                            value={filters.branch_id ?? ''}
                            onChange={(e) => updateFilter('branch_id', e.target.value)}
                            className="w-full sm:w-48"
                        >
                            <option value="">Semua Cabang</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </SelectInput>
                        <SelectInput
                            value={filters.checklist_stage ?? ''}
                            onChange={(e) => updateFilter('checklist_stage', e.target.value)}
                            className="w-full sm:w-48"
                        >
                            <option value="">Semua Stage Checklist</option>
                            <option value="pre_fitout">Sebelum Fitout</option>
                            <option value="post_fitout">Setelah Fitout</option>
                            <option value="pre_handover">Pengukuran Ulang</option>
                        </SelectInput>
                        <Button type="submit" variant="secondary">Cari</Button>
                    </div>
                </form>

                {/* Data Table */}
                <DataTable columns={columns}>
                    {(loos.data ?? []).map((row) => (
                        <tr
                            key={row.id}
                            onClick={() => router.visit(`/loos/${row.id}/fitout`)}
                            className="cursor-pointer transition-colors hover:bg-slate-50"
                        >
                            <td className="px-5 py-3.5 min-w-[200px]">
                                <span className="font-semibold text-[#0F1E36] block truncate">
                                    {row.loo_number}
                                </span>
                                <span className="text-xs text-gray-500 block truncate mt-0.5">{row.tenant_name}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-800">{row.branch?.code ?? '—'}</span>
                                <span className="text-xs text-gray-500 block">Unit: {row.unit_code}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                                <Badge color={LOO_STATUS_COLORS[row.status] ?? 'gray'} size="sm">
                                    {STATUS_LABELS[row.status] ?? row.status}
                                </Badge>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                                <ChecklistState state={row.checklist_pre} />
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                                <ChecklistState state={row.checklist_post} />
                                {row.checklist_post.unlocked && row.checklist_post.gm_approved && (
                                    <span className="mt-0.5 block text-[11px] text-slate-500">GM menyetujui</span>
                                )}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                                <ChecklistState state={row.pre_handover} />
                            </td>
                        </tr>
                    ))}
                    {(loos.data ?? []).length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada LOO.</td>
                        </tr>
                    )}
                </DataTable>

                <Pagination links={loos.links} />
            </div>
        </AppLayout>
    );
}
