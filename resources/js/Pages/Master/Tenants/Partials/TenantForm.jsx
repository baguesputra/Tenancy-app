import { useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';

export default function TenantForm({ tenant, tenantCategories, productCategories, branches, canPickBranch }) {
    const isEdit = !!tenant;

    const { data, setData, post, put, processing, errors } = useForm({
        name: tenant?.name ?? '',
        legal_entity_name: tenant?.legal_entity_name ?? '',
        npwp_number: tenant?.npwp_number ?? '',
        siup_number: tenant?.siup_number ?? '',
        company_phone: tenant?.company_phone ?? '',
        company_email: tenant?.company_email ?? '',
        company_address: tenant?.company_address ?? '',
        tenant_category_id: tenant?.tenant_category_id ?? '',
        product_category_id: tenant?.product_category_id ?? '',
        branch_id: tenant?.branch_id ?? '',
        is_active: tenant?.is_active ?? true,
        contacts: tenant?.contacts?.length
            ? tenant.contacts
            : [{ name: '', position: '', phone: '', email: '', type: '' }],
    });

    const submit = (e) => {
        e.preventDefault();
        isEdit ? put(`/tenants/${tenant.id}`) : post('/tenants');
    };

    const updateContact = (idx, field, value) => {
        const next = [...data.contacts];
        next[idx] = { ...next[idx], [field]: value };
        setData('contacts', next);
    };
    const addContact = () => setData('contacts', [...data.contacts, { name: '', position: '', phone: '', email: '', type: '' }]);
    const removeContact = (idx) => setData('contacts', data.contacts.filter((_, i) => i !== idx));

    return (
        <form onSubmit={submit} className="max-w-2xl">
            <FormSection title="Identitas Bisnis">
                <FormField label="Nama Toko/Brand" error={errors.name} required>
                    <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                </FormField>

                <FormField label="Nama Badan Hukum (PT/CV)" error={errors.legal_entity_name}>
                    <TextInput value={data.legal_entity_name} onChange={(e) => setData('legal_entity_name', e.target.value)} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <Checkbox
                    label="Tenant aktif"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    className="mt-2"
                />
            </FormSection>

            <FormSection title="Dokumen Legal">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="NPWP" error={errors.npwp_number}>
                        <TextInput value={data.npwp_number} onChange={(e) => setData('npwp_number', e.target.value)} />
                    </FormField>
                    <FormField label="SIUP / NIB" error={errors.siup_number}>
                        <TextInput value={data.siup_number} onChange={(e) => setData('siup_number', e.target.value)} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Telepon Perusahaan" error={errors.company_phone}>
                        <TextInput value={data.company_phone} onChange={(e) => setData('company_phone', e.target.value)} />
                    </FormField>
                    <FormField label="Email Perusahaan" error={errors.company_email}>
                        <TextInput value={data.company_email} onChange={(e) => setData('company_email', e.target.value)} />
                    </FormField>
                </div>

                <FormField label="Alamat Perusahaan" error={errors.company_address}>
                    <Textarea value={data.company_address} onChange={(e) => setData('company_address', e.target.value)} rows={2} />
                </FormField>
            </FormSection>

            <FormSection title="PIC / Kontak">
                {data.contacts.map((contact, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-lg p-4 mb-3 bg-gray-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <TextInput placeholder="Nama" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} />
                            <TextInput placeholder="Jabatan" value={contact.position ?? ''} onChange={(e) => updateContact(idx, 'position', e.target.value)} />
                            <TextInput placeholder="Telepon" value={contact.phone ?? ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} />
                            <TextInput placeholder="Email" value={contact.email ?? ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} />
                        </div>
                        <div className="flex justify-between items-center">
                            <SelectInput
                                value={contact.type ?? ''}
                                onChange={(e) => updateContact(idx, 'type', e.target.value)}
                                className="w-40 !py-1.5 text-xs"
                            >
                                <option value="">Tipe kontak...</option>
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
                <Button type="button" variant="secondary" onClick={addContact} className="text-xs">
                    + Tambah PIC
                </Button>
            </FormSection>

            <Button type="submit" disabled={processing}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Tenant'}
            </Button>
        </form>
    );
}