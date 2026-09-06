import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

const emptyContact = { name: '', position: '', phone: '', email: '', type: '' };

export default function Index({ tenants, tenantCategories, productCategories, filters, branches, canPickBranch }) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '', legal_entity_name: '', npwp_number: '', siup_number: '',
        company_phone: '', company_email: '', company_address: '',
        tenant_category_id: '', product_category_id: '', branch_id: '', is_active: true,
        contacts: [emptyContact],
    });

    const openCreate = () => {
        setEditingTenant(null);
        reset();
        clearErrors();
        setPanelOpen(true);
    };

    const openEdit = (tenant) => {
        setEditingTenant(tenant);
        setData({
            name: tenant.name,
            legal_entity_name: tenant.legal_entity_name ?? '',
            npwp_number: tenant.npwp_number ?? '',
            siup_number: tenant.siup_number ?? '',
            company_phone: tenant.company_phone ?? '',
            company_email: tenant.company_email ?? '',
            company_address: tenant.company_address ?? '',
            tenant_category_id: tenant.tenant_category_id,
            product_category_id: tenant.product_category_id,
            branch_id: tenant.branch_id,
            is_active: tenant.is_active,
            contacts: tenant.contacts?.length ? tenant.contacts : [emptyContact],
        });
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => { setPanelOpen(false); reset(); };

    const submit = (e) => {
        e.preventDefault();
        const options = { onSuccess: closePanel };
        editingTenant ? put(`/tenants/${editingTenant.id}`, options) : post('/tenants', options);
    };

    const handleDelete = (id) => {
        if (confirm('Hapus tenant ini?')) router.delete(`/tenants/${id}`, { preserveScroll: true });
    };

    const updateContact = (idx, field, value) => {
        const next = [...data.contacts];
        next[idx] = { ...next[idx], [field]: value };
        setData('contacts', next);
    };
    const addContact = () => setData('contacts', [...data.contacts, emptyContact]);
    const removeContact = (idx) => setData('contacts', data.contacts.filter((_, i) => i !== idx));

    const updateFilter = (key, value) => {
        router.get('/tenants', { ...filters, [key]: value }, { preserveState: true });
    };

    const columns = [
        { key: 'name', label: 'Nama Tenant' },
        { key: 'category', label: 'Kategori' },
        { key: 'branch', label: 'Cabang' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'w-10' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Master Tenant</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenants.total} tenant terdaftar</p>
                    </div>
                    <Button onClick={openCreate}>+ Tambah Tenant</Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1 max-w-sm"
                    />
                    <SelectInput
                        defaultValue={filters.tenant_category_id ?? ''}
                        onChange={(e) => updateFilter('tenant_category_id', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Kategori Tenant</option>
                        {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                    <SelectInput
                        defaultValue={filters.product_category_id ?? ''}
                        onChange={(e) => updateFilter('product_category_id', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Kategori Produk</option>
                        {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                </div>

                <DataTable columns={columns}>
                    {tenants.data.map((tenant) => (
                        <tr key={tenant.id} onClick={() => openEdit(tenant)} className="group cursor-pointer hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-gray-900">{tenant.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">
                                {tenant.tenant_category.name} · {tenant.product_category.name}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{tenant.branch.name}</td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={tenant.is_active ? 'green' : 'gray'}>
                                    {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <IconTrash />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {tenants.data.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">Belum ada tenant.</td></tr>
                    )}
                </DataTable>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingTenant ? 'Edit Tenant' : 'Tambah Tenant'}
                icon={editingTenant ? <IconEdit /> : <IconPlus />}
            >
                <form onSubmit={submit}>
                    <FormSection title="Identitas Bisnis">
                        <FormField label="Nama Toko/Brand" error={errors.name} required>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </FormField>
                        <FormField label="Nama Badan Hukum (PT/CV)" error={errors.legal_entity_name}>
                            <TextInput value={data.legal_entity_name} onChange={(e) => setData('legal_entity_name', e.target.value)} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Kategori Tenant" error={errors.tenant_category_id} required>
                                <SelectInput value={data.tenant_category_id} onChange={(e) => setData('tenant_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField label="Kategori Produk" error={errors.product_category_id} required>
                                <SelectInput value={data.product_category_id} onChange={(e) => setData('product_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>
                        {canPickBranch && (
                            <FormField label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </SelectInput>
                            </FormField>
                        )}
                        <Checkbox label="Tenant aktif" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                    </FormSection>

                    <FormSection title="Dokumen Legal">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="NPWP" error={errors.npwp_number}>
                                <TextInput value={data.npwp_number} onChange={(e) => setData('npwp_number', e.target.value)} />
                            </FormField>
                            <FormField label="SIUP / NIB" error={errors.siup_number}>
                                <TextInput value={data.siup_number} onChange={(e) => setData('siup_number', e.target.value)} />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Telepon" error={errors.company_phone}>
                                <TextInput value={data.company_phone} onChange={(e) => setData('company_phone', e.target.value)} />
                            </FormField>
                            <FormField label="Email" error={errors.company_email}>
                                <TextInput value={data.company_email} onChange={(e) => setData('company_email', e.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Alamat" error={errors.company_address}>
                            <Textarea value={data.company_address} onChange={(e) => setData('company_address', e.target.value)} rows={2} />
                        </FormField>
                    </FormSection>

                    <FormSection title="PIC / Kontak">
                        {data.contacts.map((contact, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3 mb-3 bg-gray-50/50">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <TextInput placeholder="Nama" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} />
                                    <TextInput placeholder="Jabatan" value={contact.position ?? ''} onChange={(e) => updateContact(idx, 'position', e.target.value)} />
                                    <TextInput placeholder="Telepon" value={contact.phone ?? ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} />
                                    <TextInput placeholder="Email" value={contact.email ?? ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <SelectInput value={contact.type ?? ''} onChange={(e) => updateContact(idx, 'type', e.target.value)} className="w-36 !py-1.5 text-xs">
                                        <option value="">Tipe...</option>
                                        <option value="operasional">Operasional</option>
                                        <option value="legal">Legal</option>
                                        <option value="finance">Finance</option>
                                    </SelectInput>
                                    {data.contacts.length > 1 && (
                                        <button type="button" onClick={() => removeContact(idx)} className="text-xs text-red-500">Hapus</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addContact} className="text-xs">+ Tambah PIC</Button>
                    </FormSection>

                    <div className="flex gap-2 sticky bottom-0 bg-white pt-3 -mx-5 px-5 -mb-5 pb-5 border-t border-[#E2E5EA] mt-5">
                        <Button type="submit" disabled={processing} className="flex-1 justify-center">
                            {editingTenant ? 'Simpan Perubahan' : 'Tambah Tenant'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={closePanel}>Batal</Button>
                    </div>
                </form>
            </SlideOver>
        </AppLayout>
    );
}