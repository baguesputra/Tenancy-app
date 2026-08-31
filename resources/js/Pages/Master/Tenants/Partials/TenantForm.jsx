import { useForm } from '@inertiajs/react';

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
        if (isEdit) {
            put(`/tenants/${tenant.id}`);
        } else {
            post('/tenants');
        }
    };

    const updateContact = (idx, field, value) => {
        const next = [...data.contacts];
        next[idx] = { ...next[idx], [field]: value };
        setData('contacts', next);
    };

    const addContact = () => {
        setData('contacts', [...data.contacts, { name: '', position: '', phone: '', email: '', type: '' }]);
    };

    const removeContact = (idx) => {
        setData('contacts', data.contacts.filter((_, i) => i !== idx));
    };

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Identitas Bisnis</h2>

                <Field label="Nama Toko/Brand" error={errors.name}>
                    <input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <Field label="Nama Badan Hukum (PT/CV)" error={errors.legal_entity_name}>
                    <input
                        value={data.legal_entity_name}
                        onChange={(e) => setData('legal_entity_name', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Kategori Tenant" error={errors.tenant_category_id}>
                        <select
                            value={data.tenant_category_id}
                            onChange={(e) => setData('tenant_category_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih...</option>
                            {tenantCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Kategori Produk" error={errors.product_category_id}>
                        <select
                            value={data.product_category_id}
                            onChange={(e) => setData('product_category_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih...</option>
                            {productCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                {canPickBranch && (
                    <Field label="Cabang" error={errors.branch_id}>
                        <select
                            value={data.branch_id}
                            onChange={(e) => setData('branch_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih...</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </Field>
                )}

                <label className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">Tenant aktif</span>
                </label>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Dokumen Legal</h2>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="NPWP" error={errors.npwp_number}>
                        <input
                            value={data.npwp_number}
                            onChange={(e) => setData('npwp_number', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="SIUP / NIB" error={errors.siup_number}>
                        <input
                            value={data.siup_number}
                            onChange={(e) => setData('siup_number', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Telepon Perusahaan" error={errors.company_phone}>
                        <input
                            value={data.company_phone}
                            onChange={(e) => setData('company_phone', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Email Perusahaan" error={errors.company_email}>
                        <input
                            value={data.company_email}
                            onChange={(e) => setData('company_email', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>

                <Field label="Alamat Perusahaan" error={errors.company_address}>
                    <textarea
                        value={data.company_address}
                        onChange={(e) => setData('company_address', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        rows={2}
                    />
                </Field>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-gray-700">PIC / Kontak</h2>
                    <button type="button" onClick={addContact} className="text-sm text-blue-600">
                        + Tambah PIC
                    </button>
                </div>

                {data.contacts.map((contact, idx) => (
                    <div key={idx} className="border rounded p-3 mb-3">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <input
                                placeholder="Nama"
                                value={contact.name}
                                onChange={(e) => updateContact(idx, 'name', e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                            />
                            <input
                                placeholder="Jabatan"
                                value={contact.position ?? ''}
                                onChange={(e) => updateContact(idx, 'position', e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                            />
                            <input
                                placeholder="Telepon"
                                value={contact.phone ?? ''}
                                onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                            />
                            <input
                                placeholder="Email"
                                value={contact.email ?? ''}
                                onChange={(e) => updateContact(idx, 'email', e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <select
                                value={contact.type ?? ''}
                                onChange={(e) => updateContact(idx, 'type', e.target.value)}
                                className="border rounded px-2 py-1 text-xs"
                            >
                                <option value="">Tipe kontak...</option>
                                <option value="operasional">Operasional</option>
                                <option value="legal">Legal</option>
                                <option value="finance">Finance</option>
                            </select>
                            {data.contacts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeContact(idx)}
                                    className="text-xs text-red-500"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="submit"
                disabled={processing}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
            >
                {isEdit ? 'Simpan Perubahan' : 'Tambah Tenant'}
            </button>
        </form>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="mb-3">
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}