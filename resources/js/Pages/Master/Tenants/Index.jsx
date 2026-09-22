import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import FileInput from '@/Components/Form/FileInput';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

const emptyContact = { name: '', position: '', phone: '', email: '', type: '' };
const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function Index({ tenants, summary = { total: 0, active: 0, inactive: 0 }, tenantCategories = [], productCategories = [], filters = {}, branches = [], canPickBranch }) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '', legal_entity_name: '', npwp_number: '', siup_number: '',
        company_phone: '', company_email: '', company_address: '',
        tenant_category_id: '', product_category_id: '', branch_id: '', is_active: true,
        logo: null,
        contacts: [emptyContact],
    });
    const [logoPreview, setLogoPreview] = useState(null);

    const openCreate = () => {
        setEditingTenant(null);
        reset();
        clearErrors();
        setLogoPreview(null);
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
            logo: null,
            contacts: tenant.contacts?.length ? tenant.contacts : [emptyContact],
        });
        setLogoPreview(tenant.logo_url ?? null);
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => { setPanelOpen(false); setLogoPreview(null); reset(); };

    const onLogoChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        setData('logo', file);
        if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setLogoPreview(file ? URL.createObjectURL(file) : (editingTenant?.logo_url ?? null));
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { forceFormData: true, onSuccess: closePanel };
        editingTenant
            ? post(`/tenants/${editingTenant.id}`, { ...options, data: { ...data, _method: 'put' } })
            : post('/tenants', options);
    };

    const askDelete = (tenant) => setConfirmDelete(tenant);

    const confirmDeleteTenant = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/tenants/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
            },
        });
    };

    const updateContact = (idx, field, value) => {
        const next = [...data.contacts];
        next[idx] = { ...next[idx], [field]: value };
        setData('contacts', next);
    };
    const addContact = () => setData('contacts', [...data.contacts, emptyContact]);
    const removeContact = (idx) => setData('contacts', data.contacts.filter((_, i) => i !== idx));

    const updateFilter = (key, value) => {
        router.get('/tenants', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const hasFilter = filters.search || filters.tenant_category_id || filters.product_category_id || filters.status;
    const resetFilters = () => {
        setSearchText('');
        router.get('/tenants', {}, { preserveScroll: true, replace: true });
    };

    const stats = [
        { key: '', label: 'Total Tenant', value: summary.total, dot: 'bg-[#0F1E36]' },
        { key: 'active', label: 'Aktif', value: summary.active, dot: 'bg-emerald-500' },
        { key: 'inactive', label: 'Nonaktif', value: summary.inactive, dot: 'bg-gray-400' },
    ];

    const columns = [
        { key: 'name', label: 'Nama Tenant' },
        { key: 'category', label: 'Kategori' },
        { key: 'branch', label: 'Cabang' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '', className: 'w-12' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Master Tenant</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{summary.total} tenant terdaftar · {summary.active} aktif</p>
                    </div>
                    <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />}>Tambah Tenant</Button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {stats.map((s) => {
                        const active = (filters.status ?? '') === s.key;
                        return (
                            <button
                                key={s.label}
                                onClick={() => updateFilter('status', s.key)}
                                aria-pressed={active}
                                className={`text-left bg-white rounded-xl border px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${active ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300 hover:shadow-sm'}`}
                            >
                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                                    {s.label}
                                </span>
                                <span className="block text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="flex flex-col lg:flex-row gap-2">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <TextInput
                                placeholder="Cari nama tenant..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari nama tenant"
                            />
                        </div>
                        <SelectInput
                            value={filters.tenant_category_id ?? ''}
                            onChange={(e) => updateFilter('tenant_category_id', e.target.value)}
                            className="lg:w-52"
                            aria-label="Filter kategori tenant"
                        >
                            <option value="">Semua Kategori Tenant</option>
                            {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                        <SelectInput
                            value={filters.product_category_id ?? ''}
                            onChange={(e) => updateFilter('product_category_id', e.target.value)}
                            className="lg:w-52"
                            aria-label="Filter kategori produk"
                        >
                            <option value="">Semua Kategori Produk</option>
                            {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                        {hasFilter && (
                            <button onClick={resetFilters} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0">
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <DataTable columns={columns} footer={<Pagination meta={tenants} links={tenants.links} />}>
                    {tenants.data.map((tenant) => (
                        <tr key={tenant.id} onClick={() => openEdit(tenant)} className="group cursor-pointer hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {tenant.logo_url ? (
                                        <img src={tenant.logo_url} alt={`Logo ${tenant.name}`} className="w-9 h-9 rounded-full object-contain bg-gray-50 border border-[#E2E5EA] p-0.5 shrink-0" loading="lazy" />
                                    ) : (
                                        <span className="w-9 h-9 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(tenant.name)}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block font-medium text-gray-900 truncate">{tenant.name}</span>
                                        <span className="block text-xs text-gray-400 truncate">{tenant.legal_entity_name || tenant.company_email || '—'}</span>
                                    </span>
                                </div>
                            </td>
                            <td className="px-5 py-3.5">
                                <span className="block text-sm text-gray-700">{tenant.tenant_category?.name ?? '—'}</span>
                                <span className="block text-xs text-gray-400">{tenant.product_category?.name ?? '—'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{tenant.branch?.name ?? '—'}</td>
                            <td className="px-5 py-3.5">
                                <Badge color={tenant.is_active ? 'green' : 'gray'}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${tenant.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true" />
                                    {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); askDelete(tenant); }}
                                    aria-label={`Hapus ${tenant.name}`}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all focus-visible:outline-2 focus-visible:outline-red-500"
                                >
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {tenants.data.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-5 py-12 text-center">
                                <p className="text-sm font-medium text-gray-700">Belum ada tenant ditemukan.</p>
                                <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah Tenant untuk data pertama.'}</p>
                                {hasFilter && (
                                    <button onClick={resetFilters} className="mt-3 text-sm text-[#0F1E36] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                                        Reset filter
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                </DataTable>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingTenant ? 'Edit Tenant' : 'Tambah Tenant'}
                subtitle={editingTenant ? editingTenant.name : 'Lengkapi identitas, legal, dan kontak PIC'}
                icon={editingTenant ? <IconEdit className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="tenant-form" loading={processing} className="flex-1 justify-center">
                            {editingTenant ? 'Simpan Perubahan' : 'Tambah Tenant'}
                        </Button>
                    </div>
                }
            >
                <form id="tenant-form" onSubmit={submit}>
                    {(() => {
                        const displayName = (data.name || '').trim() || editingTenant?.name || 'Tenant baru';
                        const tenantCatName = tenantCategories.find((c) => String(c.id) === String(data.tenant_category_id))?.name ?? editingTenant?.tenant_category?.name;
                        const productCatName = productCategories.find((c) => String(c.id) === String(data.product_category_id))?.name ?? editingTenant?.product_category?.name;
                        const branchName = branches.find((b) => String(b.id) === String(data.branch_id))?.name ?? editingTenant?.branch?.name;
                        const meta = [tenantCatName, productCatName, branchName].filter(Boolean).join(' · ');
                        return (
                            <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-3 shadow-sm">
                                <div className="flex items-center gap-4">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt={`Logo ${displayName}`} className="w-20 h-20 rounded-2xl object-contain bg-gray-50 border border-[#E2E5EA] p-1.5 shrink-0" />
                                    ) : (
                                        <span className="w-20 h-20 rounded-2xl bg-[#0F1E36] text-white text-xl font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(displayName)}
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-base font-semibold text-gray-900 truncate">{displayName}</p>
                                        {meta ? (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{meta}</p>
                                        ) : (
                                            <p className="text-xs text-gray-400 mt-0.5">Lengkapi identitas di bawah</p>
                                        )}
                                        <div className="mt-1.5">
                                            <Badge color={data.is_active ? 'green' : 'gray'}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${data.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true" />
                                                {data.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <FormField compact label="Logo Tenant" error={errors.logo}>
                                    <FileInput accept=".jpg,.jpeg,.png,.webp" onChange={onLogoChange} />
                                    {editingTenant?.logo_url && !data.logo && (
                                        <p className="text-xs text-gray-400 mt-1.5">Logo tersimpan. Pilih file baru untuk mengganti.</p>
                                    )}
                                </FormField>
                            </div>
                        );
                    })()}
                    <FormSection variant="drawer" title="Identitas Bisnis" description="Nama tampil, kategori, dan cabang">
                        <FormField compact label="Nama Toko/Brand" error={errors.name} required>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="cth. Kopi Senja" />
                        </FormField>
                        <FormField compact label="Nama Badan Hukum (PT/CV)" error={errors.legal_entity_name}>
                            <TextInput value={data.legal_entity_name} onChange={(e) => setData('legal_entity_name', e.target.value)} placeholder="cth. PT Senja Abadi" />
                        </FormField>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Kategori Tenant" error={errors.tenant_category_id} required>
                                <SelectInput value={data.tenant_category_id} onChange={(e) => setData('tenant_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField compact label="Kategori Produk" error={errors.product_category_id} required>
                                <SelectInput value={data.product_category_id} onChange={(e) => setData('product_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>
                        {canPickBranch && (
                            <FormField compact label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </SelectInput>
                            </FormField>
                        )}
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-gray-700">Status tenant</span>
                            <Checkbox label={data.is_active ? 'Aktif' : 'Nonaktif'} checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Legal & Kontak Perusahaan" description="Dokumen dan kanal resmi tenant">
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="NPWP" error={errors.npwp_number}>
                                <TextInput value={data.npwp_number} onChange={(e) => setData('npwp_number', e.target.value)} placeholder="00.000.000.0-000.000" />
                            </FormField>
                            <FormField compact label="SIUP / NIB" error={errors.siup_number}>
                                <TextInput value={data.siup_number} onChange={(e) => setData('siup_number', e.target.value)} placeholder="No. izin usaha" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Telepon" error={errors.company_phone}>
                                <TextInput value={data.company_phone} onChange={(e) => setData('company_phone', e.target.value)} placeholder="08xx-xxxx-xxxx" />
                            </FormField>
                            <FormField compact label="Email" error={errors.company_email}>
                                <TextInput type="email" value={data.company_email} onChange={(e) => setData('company_email', e.target.value)} placeholder="toko@email.com" />
                            </FormField>
                        </div>
                        <FormField compact label="Alamat" error={errors.company_address}>
                            <Textarea value={data.company_address} onChange={(e) => setData('company_address', e.target.value)} rows={2} placeholder="Alamat lengkap toko/kantor" />
                        </FormField>
                    </FormSection>

                    <FormSection variant="drawer" title={`PIC / Kontak (${data.contacts.length})`} description="Min. 1 penanggung jawab tenant">
                        {data.contacts.map((contact, idx) => (
                            <div key={idx} className="rounded-xl border border-[#E2E5EA] bg-white p-3 mb-2.5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-700">PIC {idx + 1}</span>
                                    {data.contacts.length > 1 && (
                                        <button type="button" onClick={() => removeContact(idx)} className="text-xs text-red-500 hover:text-red-700 rounded focus-visible:outline-2 focus-visible:outline-red-500">Hapus</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <TextInput placeholder="Nama *" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} aria-label={`Nama PIC ${idx + 1}`} />
                                    <TextInput placeholder="Jabatan" value={contact.position ?? ''} onChange={(e) => updateContact(idx, 'position', e.target.value)} aria-label={`Jabatan PIC ${idx + 1}`} />
                                    <TextInput placeholder="Telepon" value={contact.phone ?? ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} aria-label={`Telepon PIC ${idx + 1}`} />
                                    <TextInput placeholder="Email" value={contact.email ?? ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} aria-label={`Email PIC ${idx + 1}`} />
                                </div>
                                <SelectInput value={contact.type ?? ''} onChange={(e) => updateContact(idx, 'type', e.target.value)} className="!py-2 text-xs" aria-label={`Tipe PIC ${idx + 1}`}>
                                    <option value="">Tipe kontak...</option>
                                    <option value="operasional">Operasional</option>
                                    <option value="legal">Legal</option>
                                    <option value="finance">Finance</option>
                                </SelectInput>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addContact} className="text-xs w-full justify-center border-dashed">+ Tambah PIC</Button>
                    </FormSection>
                </form>
            </SlideOver>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteTenant}
                loading={deleting}
                title="Hapus Tenant?"
                confirmLabel="Ya, Hapus"
                confirmVariant="danger"
                note="Tenant terhapus permanen dan tidak bisa dibatalkan. Tenant dengan riwayat kontrak/sidak akan ditolak server — nonaktifkan saja."
            >
                <ConfirmRow label="Nama" value={confirmDelete?.name} />
                <ConfirmRow label="Kategori" value={confirmDelete?.tenant_category?.name} />
                <ConfirmRow label="Cabang" value={confirmDelete?.branch?.name} />
            </ConfirmModal>
        </AppLayout>
    );
}
