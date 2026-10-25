import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';

const STAGE_LABELS = {
    marketing: 'Pengisian Divisi',
    legal: 'Pengisian Divisi',
    accounting: 'Pengisian Divisi',
    tenant_mgmt: 'Pengisian Divisi',
    measurement: 'Measurement',
    ba_handover: 'BA Handover',
    fitout: 'Fitout',
    pre_handover: 'Pengukuran Ulang',
};

const STAGE_COLORS = {
    marketing: 'blue',
    legal: 'blue',
    accounting: 'blue',
    tenant_mgmt: 'blue',
    measurement: 'purple',
    ba_handover: 'cyan',
    fitout: 'green',
    pre_handover: 'indigo',
};

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
        { key: 'stage', label: 'Stage LOO' },
        { key: 'pre_fitout', label: 'Sebelum Fitout' },
        { key: 'post_fitout', label: 'Setelah Fitout' },
        { key: 'pre_handover', label: 'Pengukuran Ulang' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Hub Checklist Operasional</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Pusat pengelolaan & monitoring checklist operasional tenant (Sebelum/Sesudah Fit Out & Handover)
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-white rounded-xl border border-[#E2E5EA] p-4">
                        <span className="text-xs text-gray-500 font-medium">Total Terdaftar</span>
                        <span className="block text-2xl font-bold text-gray-900 mt-1 tabular-nums">{summary.total ?? 0}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E2E5EA] p-4">
                        <span className="text-xs text-blue-600 font-medium">Proses Fit Out</span>
                        <span className="block text-2xl font-bold text-blue-700 mt-1 tabular-nums">{summary.fitout_active ?? 0}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E2E5EA] p-4">
                        <span className="text-xs text-amber-600 font-medium">Menunggu Approval GM</span>
                        <span className="block text-2xl font-bold text-amber-700 mt-1 tabular-nums">{summary.waiting_gm ?? 0}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E2E5EA] p-4">
                        <span className="text-xs text-emerald-600 font-medium">Completed / Handover</span>
                        <span className="block text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{summary.completed ?? 0}</span>
                    </div>
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
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors border-b border-gray-100"
                        >
                            <td className="px-4 py-3 min-w-[200px]">
                                <span className="font-semibold text-[#0F1E36] block truncate">
                                    {row.loo_number}
                                </span>
                                <span className="text-xs text-gray-500 block truncate mt-0.5">{row.tenant_name}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-800">{row.branch?.code ?? '—'}</span>
                                <span className="text-xs text-gray-500 block">Unit: {row.unit_code}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <Badge color={STAGE_COLORS[row.current_stage] ?? 'gray'} size="sm">
                                    {STAGE_LABELS[row.current_stage] ?? row.current_stage}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                {row.checklist_pre.is_submitted ? (
                                    <Badge color="green" size="sm">Disubmit</Badge>
                                ) : row.checklist_pre.exists ? (
                                    <Badge color="amber" size="sm">Draft</Badge>
                                ) : (
                                    <Badge color="gray" size="sm">Belum diisi</Badge>
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="space-y-1">
                                    {row.checklist_post.is_submitted ? (
                                        <Badge color="green" size="sm">Disubmit</Badge>
                                    ) : row.checklist_post.exists ? (
                                        <Badge color="amber" size="sm">Draft</Badge>
                                    ) : (
                                        <Badge color="gray" size="sm">Belum diisi</Badge>
                                    )}
                                    {row.checklist_post.gm_approved && (
                                        <span className="block text-[10px] font-semibold text-emerald-600">✓ GM Approved</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                {row.pre_handover.is_submitted ? (
                                    <Badge color="green" size="sm">Disubmit</Badge>
                                ) : row.pre_handover.exists ? (
                                    <Badge color="amber" size="sm">Draft</Badge>
                                ) : (
                                    <Badge color="gray" size="sm">Belum diisi</Badge>
                                )}
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
