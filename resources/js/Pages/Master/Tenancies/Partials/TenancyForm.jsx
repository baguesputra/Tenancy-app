import { useForm } from '@inertiajs/react';

export default function TenancyForm({ tenancy, units, tenants }) {
    const isEdit = !!tenancy;

    const { data, setData, post, put, processing, errors } = useForm({
        unit_id: tenancy?.unit_id ?? '',
        tenant_id: tenancy?.tenant_id ?? '',
        contract_number: tenancy?.contract_number ?? '',
        contract_document: null,
        start_date: tenancy?.start_date ?? '',
        end_date: tenancy?.end_date ?? '',
        signed_date: tenancy?.signed_date ?? '',
        status: tenancy?.status ?? 'draft',
        rent_value: tenancy?.rent_value ?? '',
        rent_period: tenancy?.rent_period ?? '',
        service_charge: tenancy?.service_charge ?? '',
        deposit_value: tenancy?.deposit_value ?? '',
        payment_term: tenancy?.payment_term ?? '',
        percentage_rent_rate: tenancy?.percentage_rent_rate ?? '',
        percentage_rent_breakpoint: tenancy?.percentage_rent_breakpoint ?? '',
        notes: tenancy?.notes ?? '',
    });

    const submit = (e) => {
        e.preventDefault();

        const options = { forceFormData: true };

        if (isEdit) {
            post(`/tenancies/${tenancy.id}`, { ...options, data: { ...data, _method: 'put' } });
        } else {
            post('/tenancies', options);
        }
    };

    return (
        <form onSubmit={submit} className="max-w-2xl space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Unit & Tenant</h2>

                <div className="grid grid-cols-2 gap-4 mb-3">
                    <Field label="Unit" error={errors.unit_id}>
                        <select
                            value={data.unit_id}
                            onChange={(e) => setData('unit_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih unit...</option>
                            {units.map((u) => (
                                <option key={u.id} value={u.id}>{u.unit_code}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Tenant" error={errors.tenant_id}>
                        <select
                            value={data.tenant_id}
                            onChange={(e) => setData('tenant_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih tenant...</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field label="Status" error={errors.status}>
                    <select
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="terminated">Diakhiri Sepihak</option>
                    </select>
                    {data.status === 'active' && (
                        <p className="text-xs text-amber-600 mt-1">
                            Tenancy aktif lain di unit yang sama akan otomatis diakhiri.
                        </p>
                    )}
                </Field>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Kontrak</h2>

                <Field label="Nomor Kontrak" error={errors.contract_number}>
                    <input
                        value={data.contract_number}
                        onChange={(e) => setData('contract_number', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <Field label="Dokumen Kontrak (PDF/Gambar)" error={errors.contract_document}>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setData('contract_document', e.target.files[0])}
                        className="w-full text-sm"
                    />
                    {tenancy?.contract_document_path && (
                        <a
                            href={`/storage/${tenancy.contract_document_path}`}
                            target="_blank"
                            className="text-xs text-blue-600 mt-1 inline-block"
                        >
                            Lihat dokumen saat ini
                        </a>
                    )}
                </Field>

                <div className="grid grid-cols-3 gap-4">
                    <Field label="Tanggal Mulai" error={errors.start_date}>
                        <input
                            type="date"
                            value={data.start_date}
                            onChange={(e) => setData('start_date', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Tanggal Berakhir" error={errors.end_date}>
                        <input
                            type="date"
                            value={data.end_date}
                            onChange={(e) => setData('end_date', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Tanggal TTD" error={errors.signed_date}>
                        <input
                            type="date"
                            value={data.signed_date}
                            onChange={(e) => setData('signed_date', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Finansial</h2>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Nilai Sewa (Rp)" error={errors.rent_value}>
                        <input
                            type="number"
                            value={data.rent_value}
                            onChange={(e) => setData('rent_value', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Periode Sewa" error={errors.rent_period}>
                        <select
                            value={data.rent_period}
                            onChange={(e) => setData('rent_period', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Pilih...</option>
                            <option value="bulanan">Bulanan</option>
                            <option value="tahunan">Tahunan</option>
                        </select>
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Service Charge (Rp)" error={errors.service_charge}>
                        <input
                            type="number"
                            value={data.service_charge}
                            onChange={(e) => setData('service_charge', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Deposit (Rp)" error={errors.deposit_value}>
                        <input
                            type="number"
                            value={data.deposit_value}
                            onChange={(e) => setData('deposit_value', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>

                <Field label="Termin Pembayaran" error={errors.payment_term}>
                    <input
                        value={data.payment_term}
                        onChange={(e) => setData('payment_term', e.target.value)}
                        placeholder="Bulanan, per-3 bulan, dst"
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Percentage Rent (%)" error={errors.percentage_rent_rate}>
                        <input
                            type="number"
                            step="0.01"
                            value={data.percentage_rent_rate}
                            onChange={(e) => setData('percentage_rent_rate', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Breakpoint Omzet (Rp)" error={errors.percentage_rent_breakpoint}>
                        <input
                            type="number"
                            value={data.percentage_rent_breakpoint}
                            onChange={(e) => setData('percentage_rent_breakpoint', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
                <Field label="Catatan" error={errors.notes}>
                    <textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                    />
                </Field>
            </div>

            <button
                type="submit"
                disabled={processing}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
            >
                {isEdit ? 'Simpan Perubahan' : 'Tambah Tenancy'}
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