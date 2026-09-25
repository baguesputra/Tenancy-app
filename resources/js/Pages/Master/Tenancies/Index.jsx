import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import SearchableSelect from '@/Components/Form/SearchableSelect';
import DateInput from '@/Components/Form/DateInput';
import NumberInput from '@/Components/Form/NumberInput';
import FileInput from '@/Components/Form/FileInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatFilter from '@/Components/StatFilter';
import FilterBar, { FilterReset } from '@/Components/FilterBar';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';
import { formatDateID } from '@/utils/format';

const statusColor = { draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red' };
const statusLabel = { draft: 'Draft', active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri' };

export default function Index({ tenancies, summary = { total: 0, active: 0, draft: 0, ended: 0, terminated: 0 }, filters = {}, units, tenants }) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingTenancy, setEditingTenancy] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [showFinancial, setShowFinancial] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        unit_id: '', tenant_id: '', contract_number: '', contract_document: null,
        start_date: '', end_date: '', signed_date: '', status: 'draft',
        rent_value: '', rent_period: '', service_charge: '', deposit_value: '', payment_term: '',
        percentage_rent_rate: '', percentage_rent_breakpoint: '', notes: '',
    });

    const openCreate = () => {
        setEditingTenancy(null);
        reset();
        clearErrors();
        setPanelOpen(true);
    };

    const openEdit = (tenancy) => {
        setEditingTenancy(tenancy);
        setData({
            unit_id: tenancy.unit_id, tenant_id: tenancy.tenant_id,
            contract_number: tenancy.contract_number ?? '', contract_document: null,
            start_date: tenancy.start_date, end_date: tenancy.end_date ?? '', signed_date: tenancy.signed_date ?? '',
            status: tenancy.status,
            rent_value: tenancy.rent_value ?? '', rent_period: tenancy.rent_period ?? '',
            service_charge: tenancy.service_charge ?? '', deposit_value: tenancy.deposit_value ?? '',
            payment_term: tenancy.payment_term ?? '',
            percentage_rent_rate: tenancy.percentage_rent_rate ?? '', percentage_rent_breakpoint: tenancy.percentage_rent_breakpoint ?? '',
            notes: tenancy.notes ?? '',
        });
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setEditingTenancy(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { forceFormData: true, preserveScroll: true, onSuccess: closePanel };

        if (editingTenancy) {
            post(`/tenancies/${editingTenancy.id}`, { ...options, data: { ...data, _method: 'put' } });
        } else {
            post('/tenancies', options);
        }
    };

    const askDelete = (tenancy) => setConfirmDelete(tenancy);

    const confirmDeleteTenancy = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/tenancies/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
            },
        });
    };

    const updateFilter = (key, value) => {
        router.get('/tenancies', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasFilter = filters.search || filters.status;
    const resetFilters = () => {
        setSearchText('');
        router.get('/tenancies', {}, { preserveScroll: true, replace: true });
    };

    const stats = [
        { key: '', label: 'Total Kontrak', value: summary.total, dot: 'bg-[#0F1E36]' },
        { key: 'active', label: 'Aktif', value: summary.active, dot: 'bg-emerald-500' },
        { key: 'draft', label: 'Draft', value: summary.draft, dot: 'bg-gray-400' },
        { key: 'ended', label: 'Berakhir', value: summary.ended, dot: 'bg-amber-500' },
        { key: 'terminated', label: 'Diakhiri', value: summary.terminated, dot: 'bg-red-500' },
    ];

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'unit', label: 'Unit' },
        { key: 'period', label: 'Periode' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'w-20' },
    ];

    const periodLabel = (t) => `${formatDateID(t.start_date)} s/d ${t.end_date ? formatDateID(t.end_date) : 'sekarang'}`;

    const renderActions = (t) => (
        <div className="flex gap-1 justify-end">
            <button
                onClick={(e) => { e.stopPropagation(); askDelete(t); }}
                aria-label={`Hapus tenancy ${t.tenant?.name}`}
                title="Hapus"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-500"
            >
                <IconTrash className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Kontrak / Tenancy</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{summary.total} kontrak tercatat · {summary.active} aktif</p>
                    </div>
                    <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />} className="!py-2.5 min-h-[44px]">Tambah Tenancy</Button>
                </div>

                <StatFilter stats={stats} activeKey={filters.status ?? ''} onSelect={(key) => updateFilter('status', key)} columns="grid-cols-2 sm:grid-cols-5" />

                <FilterBar>
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            <TextInput
                                placeholder="Cari tenant / unit / nomor kontrak…"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari tenancy"
                            />
                        </div>
                        {hasFilter && <FilterReset onClick={resetFilters} />}
                </FilterBar>

                <div className="hidden sm:block">
                    <DataTable columns={columns} footer={<Pagination meta={tenancies} links={tenancies.links} />}>
                        {tenancies.data.map((t) => (
                            <tr
                                key={t.id}
                                onClick={() => openEdit(t)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(t); } }}
                                tabIndex={0}
                                className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    editingTenancy?.id === t.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
                                }`}
                            >
                                <td className="px-5 py-3.5">
                                    <p className="font-medium text-gray-900 whitespace-nowrap">{t.tenant?.name}</p>
                                    {t.contract_number && <p className="text-xs text-gray-400 mt-0.5">{t.contract_number}</p>}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">{t.unit?.unit_code}</td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">{periodLabel(t)}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <Badge color={statusColor[t.status]}>{statusLabel[t.status] ?? t.status}</Badge>
                                </td>
                                <td className="px-5 py-3.5">{renderActions(t)}</td>
                            </tr>
                        ))}
                        {tenancies.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center">
                                    <p className="text-sm font-medium text-gray-700">Belum ada tenancy ditemukan.</p>
                                    <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah Tenancy untuk data pertama.'}</p>
                                    {hasFilter && (
                                        <button onClick={resetFilters} className="mt-3 text-sm text-[#0F1E36] font-medium hover:underline rounded">
                                            Reset filter
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {tenancies.data.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => openEdit(t)}
                            className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="text-sm font-semibold text-gray-900">{t.tenant?.name}</p>
                                <Badge color={statusColor[t.status]} size="sm">{statusLabel[t.status] ?? t.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                                {t.unit?.unit_code}
                                {t.contract_number ? ` · ${t.contract_number}` : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{periodLabel(t)}</p>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                                    className="py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); askDelete(t); }}
                                    className="py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-red-600 bg-red-50 active:bg-red-100 transition-colors"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                    {tenancies.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">Belum ada tenancy ditemukan.</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah Tenancy untuk data pertama.'}</p>
                            <Button onClick={openCreate} className="justify-center !py-3 min-h-[48px]">Tambah Tenancy</Button>
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-[#E2E5EA]">
                        <Pagination meta={tenancies} links={tenancies.links} />
                    </div>
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingTenancy ? 'Edit Tenancy' : 'Tambah Tenancy'}
                subtitle={editingTenancy ? `${editingTenancy.tenant?.name} · ${editingTenancy.unit?.unit_code}` : 'Lengkapi unit, tenant, dan kontrak'}
                icon={editingTenancy ? <IconEdit className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="tenancy-form" loading={processing} className="flex-1 justify-center">
                            {editingTenancy ? 'Simpan Perubahan' : 'Tambah Tenancy'}
                        </Button>
                    </div>
                }
            >
                <form id="tenancy-form" onSubmit={submit}>
                    <FormSection variant="drawer" title="Unit & Tenant" description="Unit yang disewa dan tenant penyewa">
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Unit" error={errors.unit_id} required>
                                <SearchableSelect
                                    value={data.unit_id}
                                    onChange={(e) => setData('unit_id', e.target.value)}
                                    options={units.map((u) => ({ value: u.id, label: u.unit_code }))}
                                    placeholder="Cari unit..."
                                    error={errors.unit_id}
                                />
                            </FormField>
                            <FormField compact label="Tenant" error={errors.tenant_id} required>
                                <SearchableSelect
                                    value={data.tenant_id}
                                    onChange={(e) => setData('tenant_id', e.target.value)}
                                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                    placeholder="Cari tenant..."
                                    error={errors.tenant_id}
                                />
                            </FormField>
                        </div>
                        <FormField
                            compact label="Status" error={errors.status}
                            hint={data.status === 'active' ? 'Tenancy aktif lain di unit yang sama akan otomatis diakhiri.' : null}
                        >
                            <SelectInput value={data.status} onChange={(e) => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="active">Aktif</option>
                                <option value="ended">Berakhir</option>
                                <option value="terminated">Diakhiri</option>
                            </SelectInput>
                        </FormField>
                    </FormSection>

                    <FormSection variant="drawer" title="Kontrak" description="Nomor, dokumen, dan periode kontrak">
                        <FormField compact label="Nomor Kontrak" error={errors.contract_number}>
                            <TextInput value={data.contract_number} onChange={(e) => setData('contract_number', e.target.value)} />
                        </FormField>
                        <FormField compact label="Dokumen Kontrak" error={errors.contract_document}>
                            <FileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setData('contract_document', e.target.files[0])} />
                            {editingTenancy?.contract_document_path && (
                                <a href={`/storage/${editingTenancy.contract_document_path}`} target="_blank" rel="noreferrer" className="text-xs text-[#2F6FED] underline mt-1.5 inline-block">
                                    Lihat dokumen saat ini
                                </a>
                            )}
                        </FormField>
                        <div className="grid grid-cols-3 gap-2.5">
                            <FormField compact label="Mulai" error={errors.start_date} required>
                                <DateInput value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                            </FormField>
                            <FormField compact label="Berakhir" error={errors.end_date}>
                                <DateInput value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                            </FormField>
                            <FormField compact label="TTD" error={errors.signed_date}>
                                <DateInput value={data.signed_date} onChange={(e) => setData('signed_date', e.target.value)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Finansial" description="Sewa, charge, deposit, dan bagi hasil" collapsible expanded={showFinancial} onToggle={() => setShowFinancial((v) => !v)}>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Nilai Sewa (Rp)" error={errors.rent_value}>
                                <NumberInput value={data.rent_value} onChange={(e) => setData('rent_value', e.target.value)} />
                            </FormField>
                            <FormField compact label="Periode" error={errors.rent_period}>
                                <SelectInput value={data.rent_period} onChange={(e) => setData('rent_period', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    <option value="bulanan">Bulanan</option>
                                    <option value="tahunan">Tahunan</option>
                                </SelectInput>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Service Charge (Rp)" error={errors.service_charge}>
                                <NumberInput value={data.service_charge} onChange={(e) => setData('service_charge', e.target.value)} />
                            </FormField>
                            <FormField compact label="Deposit (Rp)" error={errors.deposit_value}>
                                <NumberInput value={data.deposit_value} onChange={(e) => setData('deposit_value', e.target.value)} />
                            </FormField>
                        </div>
                        <FormField compact label="Termin Pembayaran" error={errors.payment_term}>
                            <TextInput value={data.payment_term} onChange={(e) => setData('payment_term', e.target.value)} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Percentage Rent (%)" error={errors.percentage_rent_rate}>
                                <NumberInput step="0.01" value={data.percentage_rent_rate} onChange={(e) => setData('percentage_rent_rate', e.target.value)} />
                            </FormField>
                            <FormField compact label="Breakpoint (Rp)" error={errors.percentage_rent_breakpoint}>
                                <NumberInput value={data.percentage_rent_breakpoint} onChange={(e) => setData('percentage_rent_breakpoint', e.target.value)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Catatan" description="Catatan tambahan kontrak" collapsible expanded={showFinancial} onToggle={() => setShowFinancial((v) => !v)}>
                        <FormField compact label="Catatan" error={errors.notes}>
                            <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </FormField>
                    </FormSection>
                </form>
            </SlideOver>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteTenancy}
                loading={deleting}
                title="Hapus Tenancy?"
                confirmLabel="Ya, Hapus"
                confirmVariant="danger"
                note={confirmDelete?.status !== 'draft'
                    ? 'Tenancy non-draft ditolak server — ubah status jadi terminated.'
                    : 'Kontrak terhapus permanen dan tidak bisa dibatalkan.'}
            >
                <ConfirmRow label="Tenant" value={confirmDelete?.tenant?.name} />
                <ConfirmRow label="Unit" value={confirmDelete?.unit?.unit_code} />
                <ConfirmRow label="Periode" value={confirmDelete ? periodLabel(confirmDelete) : ''} />
            </ConfirmModal>
        </AppLayout>
    );
}
