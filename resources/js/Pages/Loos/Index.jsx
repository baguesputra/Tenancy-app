import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';

const STATUS_COLORS = {
    draft: 'gray',
    legal_review: 'blue',
    accounting_review: 'yellow',
    tenant_mgmt_review: 'orange',
    measurement: 'purple',
    ba_handover: 'cyan',
    fitout: 'green',
    pre_handover: 'indigo',
    completed: 'green',
    cancelled: 'red',
};

const STATUS_LABELS = {
    draft: 'Draft',
    legal_review: 'Legal Review',
    accounting_review: 'Accounting Review',
    tenant_mgmt_review: 'Tenant Mgmt Review',
    measurement: 'Measurement',
    ba_handover: 'BA Handover',
    fitout: 'Fitout',
    pre_handover: 'Pre-Handover',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function Index({ loos, summary = {}, filters = {}, statusOptions = [], stageOptions = [] }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const { auth } = usePage().props;
    const canCreate = auth.user?.roles?.includes('super_admin')
        || (auth.user?.permissions ?? []).includes('loos.create');

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        router.get('/loos', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns = [
        { key: 'loo_number', label: 'No. LOO' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'status', label: 'Status' },
        { key: 'current_stage', label: 'Stage' },
        { key: 'branch', label: 'Cabang' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">LOO</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{summary.total ?? 0} LOO terdaftar</p>
                    </div>
                    {canCreate && (
                        <Link href="/loos/create">
                            <Button>+ Buat LOO</Button>
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                    {[
                        { key: 'draft', label: 'Draft' },
                        { key: 'legal_review', label: 'Legal' },
                        { key: 'accounting_review', label: 'Accounting' },
                        { key: 'measurement', label: 'Measurement' },
                        { key: 'fitout', label: 'Fitout' },
                        { key: 'completed', label: 'Completed' },
                    ].map((s) => (
                        <button
                            key={s.key}
                            onClick={() => updateFilter('status', filters.status === s.key ? '' : s.key)}
                            className={`text-left bg-white rounded-xl border px-4 py-3 transition-all ${(filters.status ?? '') === s.key ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300'}`}
                        >
                            <span className="text-xs text-gray-500">{s.label}</span>
                            <span className="block text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">{summary[s.key] ?? 0}</span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-2 mb-4">
                    <div className="flex-1">
                        <TextInput
                            placeholder="Cari no LOO / nama tenant..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setTimeout(() => {
                                    if (search !== (filters.search ?? '')) updateFilter('search', search);
                                }, 400);
                            }}
                            aria-label="Cari LOO"
                        />
                    </div>
                    <SelectInput value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className="lg:w-48" aria-label="Filter status">
                        <option value="">Semua Status</option>
                        {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </SelectInput>
                    <SelectInput value={filters.current_stage ?? ''} onChange={(e) => updateFilter('current_stage', e.target.value)} className="lg:w-48" aria-label="Filter stage">
                        <option value="">Semua Stage</option>
                        {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </SelectInput>
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns} footer={<Pagination meta={loos} links={loos.links} />}>
                        {loos.data.map((loo) => (
                            <tr
                                key={loo.id}
                                onClick={() => router.visit(`/loos/${loo.id}`)}
                                className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                            >
                                <td className="px-5 py-3.5 font-medium text-gray-900">{loo.loo_number}</td>
                                <td className="px-5 py-3.5 text-gray-600">{loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'}</td>
                                <td className="px-5 py-3.5">
                                    <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="sm">{STATUS_LABELS[loo.status] ?? loo.status}</Badge>
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm">{loo.current_stage}</td>
                                <td className="px-5 py-3.5 text-gray-500">{loo.branch?.name ?? '—'}</td>
                            </tr>
                        ))}
                        {loos.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">Belum ada LOO.</td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {loos.data.map((loo) => (
                        <Link key={loo.id} href={`/loos/${loo.id}`} className="block bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{loo.loo_number}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'}</p>
                                </div>
                                <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="sm">{STATUS_LABELS[loo.status] ?? loo.status}</Badge>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}