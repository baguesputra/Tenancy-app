import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import NumberInput from '@/Components/Form/NumberInput';
import FileInput from '@/Components/Form/FileInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

const statusColor = { draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red' };
const statusLabel = { draft: 'Draft', active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri' };

export default function Index({ tenancies, filters, units, tenants }) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingTenancy, setEditingTenancy] = useState(null);

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

    const closePanel = () => { setPanelOpen(false); reset(); };

    const submit = (e) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: closePanel };

        if (editingTenancy) {
            post(`/tenancies/${editingTenancy.id}`, { ...options, data: { ...data, _method: 'put' } });
        } else {
            post('/tenancies', options);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Hapus tenancy ini?')) router.delete(`/tenancies/${id}`, { preserveScroll: true });
    };

    const updateFilter = (key, value) => router.get('/tenancies', { ...filters, [key]: value }, { preserveState: true });

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'unit', label: 'Unit' },
        { key: 'period', label: 'Periode' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'w-10' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Kontrak / Tenancy</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenancies.total} kontrak tercatat</p>
                    </div>
                    <Button onClick={openCreate}>+ Tambah Tenancy</Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1 max-w-sm"
                    />
                    <SelectInput
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="terminated">Diakhiri</option>
                    </SelectInput>
                </div>

                <DataTable columns={columns}>
                    {tenancies.data.map((t) => (
                        <tr key={t.id} onClick={() => openEdit(t)} className="group cursor-pointer hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-gray-900">{t.tenant.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">{t.unit.unit_code}</td>
                            <td className="px-5 py-3.5 text-gray-500">{t.start_date} s/d {t.end_date ?? 'sekarang'}</td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={statusColor[t.status]}>{statusLabel[t.status]}</Badge>
                            </td>
                            <td className="px-5 py-3.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <IconTrash />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {tenancies.data.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">Belum ada data tenancy.</td></tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={tenancies} links={tenancies.links} />
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingTenancy ? 'Edit Tenancy' : 'Tambah Tenancy'}
                icon={editingTenancy ? <IconEdit /> : <IconPlus />}
            >
                <form onSubmit={submit}>
                    <FormSection title="Unit & Tenant">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Unit" error={errors.unit_id} required>
                                <SelectInput value={data.unit_id} onChange={(e) => setData('unit_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {units.map((u) => <option key={u.id} value={u.id}>{u.unit_code}</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField label="Tenant" error={errors.tenant_id} required>
                                <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>
                        <FormField
                            label="Status" error={errors.status}
                            hint={data.status === 'active' ? 'Tenancy aktif lain di unit yang sama akan otomatis diakhiri.' : null}
                        >
                            <SelectInput value={data.status} onChange={(e) => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="active">Aktif</option>
                                <option value="ended">Berakhir</option>
                                <option value="terminated">Diakhiri Sepihak</option>
                            </SelectInput>
                        </FormField>
                    </FormSection>

                    <FormSection title="Kontrak">
                        <FormField label="Nomor Kontrak" error={errors.contract_number}>
                            <TextInput value={data.contract_number} onChange={(e) => setData('contract_number', e.target.value)} />
                        </FormField>
                        <FormField label="Dokumen Kontrak" error={errors.contract_document}>
                            <FileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setData('contract_document', e.target.files[0])} />
                            {editingTenancy?.contract_document_path && (
                                <a href={`/storage/${editingTenancy.contract_document_path}`} target="_blank" className="text-xs text-[#2F6FED] underline mt-1.5 inline-block">
                                    Lihat dokumen saat ini
                                </a>
                            )}
                        </FormField>
                        <div className="grid grid-cols-3 gap-2.5">
                            <FormField label="Mulai" error={errors.start_date} required>
                                <DateInput value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                            </FormField>
                            <FormField label="Berakhir" error={errors.end_date}>
                                <DateInput value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                            </FormField>
                            <FormField label="TTD" error={errors.signed_date}>
                                <DateInput value={data.signed_date} onChange={(e) => setData('signed_date', e.target.value)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection title="Finansial">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Nilai Sewa (Rp)" error={errors.rent_value}>
                                <NumberInput value={data.rent_value} onChange={(e) => setData('rent_value', e.target.value)} />
                            </FormField>
                            <FormField label="Periode" error={errors.rent_period}>
                                <SelectInput value={data.rent_period} onChange={(e) => setData('rent_period', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    <option value="bulanan">Bulanan</option>
                                    <option value="tahunan">Tahunan</option>
                                </SelectInput>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Service Charge (Rp)" error={errors.service_charge}>
                                <NumberInput value={data.service_charge} onChange={(e) => setData('service_charge', e.target.value)} />
                            </FormField>
                            <FormField label="Deposit (Rp)" error={errors.deposit_value}>
                                <NumberInput value={data.deposit_value} onChange={(e) => setData('deposit_value', e.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Termin Pembayaran" error={errors.payment_term}>
                            <TextInput value={data.payment_term} onChange={(e) => setData('payment_term', e.target.value)} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Percentage Rent (%)" error={errors.percentage_rent_rate}>
                                <NumberInput step="0.01" value={data.percentage_rent_rate} onChange={(e) => setData('percentage_rent_rate', e.target.value)} />
                            </FormField>
                            <FormField label="Breakpoint (Rp)" error={errors.percentage_rent_breakpoint}>
                                <NumberInput value={data.percentage_rent_breakpoint} onChange={(e) => setData('percentage_rent_breakpoint', e.target.value)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection>
                        <FormField label="Catatan" error={errors.notes}>
                            <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                        </FormField>
                    </FormSection>

                    <div className="flex gap-2 sticky bottom-0 bg-white pt-3 -mx-5 px-5 -mb-5 pb-5 border-t border-[#E2E5EA] mt-5">
                        <Button type="submit" disabled={processing} className="flex-1 justify-center">
                            {editingTenancy ? 'Simpan Perubahan' : 'Tambah Tenancy'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={closePanel}>Batal</Button>
                    </div>
                </form>
            </SlideOver>
        </AppLayout>
    );
}