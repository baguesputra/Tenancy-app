import { useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';

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

        // Deskripsi & Lokasi Fisik
        description: tenant?.description ?? '',
        floor_map: tenant?.floor_map ?? '',
        location_map: tenant?.location_map ?? '',
        ownership_status: tenant?.ownership_status ?? '',
        owner_name: tenant?.owner_name ?? '',
        owner_address: tenant?.owner_address ?? '',
        owner_phone: tenant?.owner_phone ?? '',
        owner_fax: tenant?.owner_fax ?? '',
        owner_email: tenant?.owner_email ?? '',

        // PIC FitOut
        fitout_pic_name: tenant?.fitout_pic_name ?? '',
        fitout_pic_phone: tenant?.fitout_pic_phone ?? '',
        fitout_pic_email: tenant?.fitout_pic_email ?? '',

        // PIC Legal
        legal_pic_name: tenant?.legal_pic_name ?? '',
        legal_pic_phone: tenant?.legal_pic_phone ?? '',
        legal_pic_email: tenant?.legal_pic_email ?? '',

        // PIC Accounting
        accounting_pic_name: tenant?.accounting_pic_name ?? '',
        accounting_pic_phone: tenant?.accounting_pic_phone ?? '',
        accounting_pic_email: tenant?.accounting_pic_email ?? '',

        // SIUP (lanjutan)
        siup_expired_date: tenant?.siup_expired_date ?? '',
        siup_file_path: tenant?.siup_file_path ?? '',

        // TDP
        tdp_number: tenant?.tdp_number ?? '',
        tdp_expired_date: tenant?.tdp_expired_date ?? '',
        tdp_file_path: tenant?.tdp_file_path ?? '',

        // NPWP & KTP
        npwp_file_path: tenant?.npwp_file_path ?? '',
        ktp_number: tenant?.ktp_number ?? '',
        ktp_file_path: tenant?.ktp_file_path ?? '',

        // Akte Pendirian
        akta_number: tenant?.akta_number ?? '',
        akta_date: tenant?.akta_date ?? '',
        akta_kemenkeh_number: tenant?.akta_kemenkeh_number ?? '',
        akta_file_path: tenant?.akta_file_path ?? '',
        power_of_attorney_file_path: tenant?.power_of_attorney_file_path ?? '',

        // Domisili
        domisili_number: tenant?.domisili_number ?? '',
        domisili_expired_date: tenant?.domisili_expired_date ?? '',
        domisili_file_path: tenant?.domisili_file_path ?? '',

        // Dokumen Tambahan
        fitout_drawing_file_path: tenant?.fitout_drawing_file_path ?? '',
        bapur_file_path: tenant?.bapur_file_path ?? '',
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

            <FormSection title="Informasi Tenant Tambahan">
                <FormField label="Deskripsi Tenant" error={errors.description}>
                    <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Lantai (MAP)" error={errors.floor_map}>
                        <TextInput value={data.floor_map} onChange={(e) => setData('floor_map', e.target.value)} />
                    </FormField>
                    <FormField label="Lokasi (MAP)" error={errors.location_map}>
                        <TextInput value={data.location_map} onChange={(e) => setData('location_map', e.target.value)} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Status Kepemilikan" error={errors.ownership_status}>
                        <SelectInput value={data.ownership_status} onChange={(e) => setData('ownership_status', e.target.value)}>
                            <option value="">Pilih...</option>
                            <option value="sewa">Sewa</option>
                            <option value="kontrak">Kontrak</option>
                            <option value="milik">Milik Sendiri</option>
                        </SelectInput>
                    </FormField>
                </div>

                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 mt-4">Owner Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Nama Pemilik" error={errors.owner_name}>
                            <TextInput value={data.owner_name} onChange={(e) => setData('owner_name', e.target.value)} />
                        </FormField>
                        <FormField label="Telepon" error={errors.owner_phone}>
                            <TextInput value={data.owner_phone} onChange={(e) => setData('owner_phone', e.target.value)} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Fax" error={errors.owner_fax}>
                            <TextInput value={data.owner_fax} onChange={(e) => setData('owner_fax', e.target.value)} />
                        </FormField>
                        <FormField label="Email" error={errors.owner_email}>
                            <TextInput value={data.owner_email} onChange={(e) => setData('owner_email', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Alamat">
                        <Textarea value={data.owner_address} onChange={(e) => setData('owner_address', e.target.value)} rows={2} />
                    </FormField>
            </FormSection>

            <FormSection title="PIC LOO">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">PIC FitOut</h3>
                        <div className="space-y-3">
                            <FormField label="Nama" error={errors.fitout_pic_name}>
                                <TextInput value={data.fitout_pic_name} onChange={(e) => setData('fitout_pic_name', e.target.value)} />
                            </FormField>
                            <FormField label="Telp" error={errors.fitout_pic_phone}>
                                <TextInput value={data.fitout_pic_phone} onChange={(e) => setData('fitout_pic_phone', e.target.value)} />
                            </FormField>
                            <FormField label="Email" error={errors.fitout_pic_email}>
                                <TextInput value={data.fitout_pic_email} onChange={(e) => setData('fitout_pic_email', e.target.value)} />
                            </FormField>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">PIC Legal</h3>
                        <div className="space-y-3">
                            <FormField label="Nama" error={errors.legal_pic_name}>
                                <TextInput value={data.legal_pic_name} onChange={(e) => setData('legal_pic_name', e.target.value)} />
                            </FormField>
                            <FormField label="Telp" error={errors.legal_pic_phone}>
                                <TextInput value={data.legal_pic_phone} onChange={(e) => setData('legal_pic_phone', e.target.value)} />
                            </FormField>
                            <FormField label="Email" error={errors.legal_pic_email}>
                                <TextInput value={data.legal_pic_email} onChange={(e) => setData('legal_pic_email', e.target.value)} />
                            </FormField>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">PIC Accounting</h3>
                        <div className="space-y-3">
                            <FormField label="Nama" error={errors.accounting_pic_name}>
                                <TextInput value={data.accounting_pic_name} onChange={(e) => setData('accounting_pic_name', e.target.value)} />
                            </FormField>
                            <FormField label="Telp" error={errors.accounting_pic_phone}>
                                <TextInput value={data.accounting_pic_phone} onChange={(e) => setData('accounting_pic_phone', e.target.value)} />
                            </FormField>
                            <FormField label="Email" error={errors.accounting_pic_email}>
                                <TextInput value={data.accounting_pic_email} onChange={(e) => setData('accounting_pic_email', e.target.value)} />
                            </FormField>
                        </div>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Dokumen Legal Tambahan">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No SIUP" error={errors.siup_number}>
                        <TextInput value={data.siup_number} onChange={(e) => setData('siup_number', e.target.value)} />
                    </FormField>
                    <FormField label="Tgl Expired SIUP" error={errors.siup_expired_date}>
                        <TextInput type="date" value={data.siup_expired_date} onChange={(e) => setData('siup_expired_date', e.target.value)} />
                    </FormField>
                </div>
                <FormField label="File SIUP" error={errors.siup_file_path}>
                    <TextInput value={data.siup_file_path} onChange={(e) => setData('siup_file_path', e.target.value)} placeholder="Path file..." />
                </FormField>
                <input type="file" name="siup_file" onChange={(e) => setData('siup_file', e.target.files[0] ?? null)} className="hidden" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No TDP" error={errors.tdp_number}>
                        <TextInput value={data.tdp_number} onChange={(e) => setData('tdp_number', e.target.value)} />
                    </FormField>
                    <FormField label="Tgl Expired TDP" error={errors.tdp_expired_date}>
                        <TextInput type="date" value={data.tdp_expired_date} onChange={(e) => setData('tdp_expired_date', e.target.value)} />
                    </FormField>
                </div>
                <FormField label="File TDP" error={errors.tdp_file_path}>
                    <TextInput value={data.tdp_file_path} onChange={(e) => setData('tdp_file_path', e.target.value)} placeholder="Path file..." />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No NPWP" error={errors.npwp_number}>
                        <TextInput value={data.npwp_number} onChange={(e) => setData('npwp_number', e.target.value)} />
                    </FormField>
                    <FormField label="No KTP" error={errors.ktp_number}>
                        <TextInput value={data.ktp_number} onChange={(e) => setData('ktp_number', e.target.value)} />
                    </FormField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="File NPWP" error={errors.npwp_file_path}>
                        <TextInput value={data.npwp_file_path} onChange={(e) => setData('npwp_file_path', e.target.value)} placeholder="Path file..." />
                    </FormField>
                    <FormField label="File KTP" error={errors.ktp_file_path}>
                        <TextInput value={data.ktp_file_path} onChange={(e) => setData('ktp_file_path', e.target.value)} placeholder="Path file..." />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No Akte" error={errors.akta_number}>
                        <TextInput value={data.akta_number} onChange={(e) => setData('akta_number', e.target.value)} />
                    </FormField>
                    <FormField label="Tgl Akte" error={errors.akta_date}>
                        <TextInput type="date" value={data.akta_date} onChange={(e) => setData('akta_date', e.target.value)} />
                    </FormField>
                </div>
                <FormField label="No Kemenkeh" error={errors.akta_kemenkeh_number}>
                    <TextInput value={data.akta_kemenkeh_number} onChange={(e) => setData('akta_kemenkeh_number', e.target.value)} />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="File Akte" error={errors.akta_file_path}>
                        <TextInput value={data.akta_file_path} onChange={(e) => setData('akta_file_path', e.target.value)} placeholder="Path file..." />
                    </FormField>
                    <FormField label="File Surat Kuasa" error={errors.power_of_attorney_file_path}>
                        <TextInput value={data.power_of_attorney_file_path} onChange={(e) => setData('power_of_attorney_file_path', e.target.value)} placeholder="Path file..." />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="No Domisili" error={errors.domisili_number}>
                        <TextInput value={data.domisili_number} onChange={(e) => setData('domisili_number', e.target.value)} />
                    </FormField>
                    <FormField label="Tgl Expired Domisili" error={errors.domisili_expired_date}>
                        <TextInput type="date" value={data.domisili_expired_date} onChange={(e) => setData('domisili_expired_date', e.target.value)} />
                    </FormField>
                </div>
                <FormField label="File Domisili" error={errors.domisili_file_path}>
                    <TextInput value={data.domisili_file_path} onChange={(e) => setData('domisili_file_path', e.target.value)} placeholder="Path file..." />
                </FormField>

                <FormField label="File Denah FitOut" error={errors.fitout_drawing_file_path}>
                    <TextInput value={data.fitout_drawing_file_path} onChange={(e) => setData('fitout_drawing_file_path', e.target.value)} placeholder="Path file..." />
                </FormField>
                <FormField label="File BAPUR" error={errors.bapur_file_path}>
                    <TextInput value={data.bapur_file_path} onChange={(e) => setData('bapur_file_path', e.target.value)} placeholder="Path file..." />
                </FormField>
            </FormSection>

            <Button type="submit" disabled={processing}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Tenant'}
            </Button>
        </form>
    );
}