import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import EmptyState from '@/Components/EmptyState';

const STATUS_COLORS = {
    draft: 'gray',
    legal_review: 'blue',
    accounting_review: 'blue',
    tenant_mgmt_review: 'blue',
    measurement: 'purple',
    ba_handover: 'cyan',
    fitout: 'green',
    pre_handover: 'indigo',
    completed: 'green',
    cancelled: 'red',
};

// Tahap review tiga divisi tampil sebagai satu fase "Pengisian Divisi"
// (pengisian paralel, bukan antrean berjenjang).
const STATUS_LABELS = {
    draft: 'Draft',
    legal_review: 'Pengisian Divisi',
    accounting_review: 'Pengisian Divisi',
    tenant_mgmt_review: 'Pengisian Divisi',
    measurement: 'Measurement',
    ba_handover: 'BA Handover',
    fitout: 'Fitout',
    pre_handover: 'Pre-Handover',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STAGE_LABELS = {
    marketing: 'Marketing',
    legal: 'Legal',
    accounting: 'Accounting',
    tenant_mgmt: 'Tenant Mgmt',
    measurement: 'Measurement',
    ba_handover: 'BA Handover',
    fitout: 'Fitout',
    pre_handover: 'Pre-Handover',
};

// Label singkat untuk opsi filter status review.
const REVIEW_SHORT = {
    legal_review: 'Legal',
    accounting_review: 'Accounting',
    tenant_mgmt_review: 'Tenant Mgmt',
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

    // Kartu ringkasan: tiga status review digabung jadi satu fase pengisian.
    const num = (v) => Number(v ?? 0);
    const pengisianCount = num(summary.legal_review) + num(summary.accounting_review) + num(summary.tenant_mgmt_review);
    const summaryCards = [
        { key: 'draft', label: 'Draft', count: num(summary.draft), filterValue: 'draft' },
        { key: 'pengisian', label: 'Pengisian Divisi', count: pengisianCount, filterValue: '' },
        { key: 'measurement', label: 'Measurement', count: num(summary.measurement), filterValue: 'measurement' },
        { key: 'fitout', label: 'Fitout', count: num(summary.fitout), filterValue: 'fitout' },
        { key: 'completed', label: 'Completed', count: num(summary.completed), filterValue: 'completed' },
        { key: 'cancelled', label: 'Dibatalkan', count: num(summary.cancelled), filterValue: 'cancelled' },
    ];

    const statusOptionLabel = (s) => REVIEW_SHORT[s.value] ? `Pengisian – ${REVIEW_SHORT[s.value]}` : s.label;

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
                    {summaryCards.map((s) => s.filterValue === '' ? (
                        <div
                            key={s.key}
                            className="text-left bg-white rounded-xl border border-[#E2E5EA] px-4 py-3"
                            title="Gabungan Legal, Accounting, Tenant Mgmt"
                        >
                            <span className="text-xs text-gray-500">{s.label}</span>
                            <span className="block text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">{s.count}</span>
                        </div>
                    ) : (
                        <button
                            key={s.key}
                            onClick={() => updateFilter('status', filters.status === s.filterValue ? '' : s.filterValue)}
                            className={`text-left bg-white rounded-xl border px-4 py-3 transition-all ${(filters.status ?? '') === s.filterValue ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300'}`}
                        >
                            <span className="text-xs text-gray-500">{s.label}</span>
                            <span className="block text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">{s.count}</span>
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
                        {statusOptions.map((s) => <option key={s.value} value={s.value}>{statusOptionLabel(s)}</option>)}
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
                                <td className="px-5 py-3.5 text-gray-500 text-sm">{STAGE_LABELS[loo.current_stage] ?? loo.current_stage}</td>
                                <td className="px-5 py-3.5 text-gray-500">{loo.branch?.name ?? '—'}</td>
                            </tr>
                        ))}
                        {loos.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-6">
                                    <EmptyState
                                        variant="data"
                                        size="md"
                                        title="Belum Ada Dokumen LOO"
                                        description="Data Letter of Offer (LOO) belum tersedia pada cabang ini."
                                    />
                                </td>
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
                    {loos.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm">
                            <EmptyState
                                variant="data"
                                size="sm"
                                title="Belum Ada Dokumen LOO"
                                description="Data Letter of Offer (LOO) belum tersedia."
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}