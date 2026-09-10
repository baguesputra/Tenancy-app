import AppLayout from '@/Layouts/AppLayout';
import PermitFormFields from '@/Pages/TenantPortal/Permits/Partials/PermitFormFields';
import { useForm } from '@inertiajs/react';
import FormSection from '@/Components/Form/FormSection';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Textarea from '@/Components/Form/Textarea';
import { useState } from 'react';

export default function Create({ tenants, departments }) {
    const [locationType, setLocationType] = useState('area');
    const { data, setData, post, processing, errors } = useForm({
        tenant_id: '',
        store_name_snapshot: '',
        floor_snapshot: '',
        block_snapshot: '',
        unit_number_snapshot: '',
        permit_number: '',
        activity_types: [],
        request_date: '',
        pic_name: '',
        pic_phone: '',
        is_external: false,
        contractor_company: '',
        contractor_pic: '',
        contractor_address: '',
        contractor_phone: '',
        job_type: '',
        work_start_date: '',
        work_end_date: '',
        work_start_time: '',
        work_end_time: '',
        access_route: '',
        notes: '',
        workers: [{ name: '' }],
        goods: [{ description: '', quantity_note: '' }],
        accompanying_department_ids: [],
    });

    const selectLocationType = (type) => {
        setLocationType(type);
        if (type === 'vendor') {
            setData((prev) => ({ ...prev, tenant_id: '', is_external: true }));
        } else if (type === 'area') {
            setData((prev) => ({ ...prev, tenant_id: '', is_external: false }));
        } else {
            setData((prev) => ({ ...prev, is_external: false }));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post('/permit-requests');
    };

    const toggleDept = (id) => {
        const current = data.accompanying_department_ids;
        setData('accompanying_department_ids', current.includes(id)
            ? current.filter((d) => d !== id)
            : [...current, id]);
    };

    return (
    <AppLayout>
        <div className="px-6 sm:px-8 py-6 flex-1">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Ajukan Surat Izin</h1>
            {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-lg mb-4">
                    <p className="font-medium mb-1">Ada kesalahan input:</p>
                    <ul className="list-disc list-inside">
                        {Object.entries(errors).map(([key, message]) => (
                            <li key={key}>{message}</li>
                        ))}
                    </ul>
                </div>
            )}
                        <p className="text-sm text-gray-500 mb-6">Pilih kategori permohonan di bawah</p>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    {/* Kolom kiri — konten form utama */}
                    <div>
                        <FormSection title="Kategori Permohonan">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                                {[
                                    { value: 'area', label: 'Area Duta Mall' },
                                    { value: 'tenant', label: 'Tenant' },
                                    { value: 'vendor', label: 'Vendor' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => selectLocationType(opt.value)}
                                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                                            locationType === opt.value
                                                ? 'border-[#0F1E36] bg-[#0F1E36]/5 text-[#0F1E36]'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {locationType === 'tenant' && (
                                <FormField label="Pilih Tenant" error={errors.tenant_id} required>
                                    <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                        <option value="">Pilih tenant...</option>
                                        {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </SelectInput>
                                </FormField>
                            )}

                            {locationType === 'area' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField label="Nama Lokasi/Area" error={errors.store_name_snapshot} className="sm:col-span-3" required>
                                        <TextInput value={data.store_name_snapshot} onChange={(e) => setData('store_name_snapshot', e.target.value)} />
                                    </FormField>
                                    <FormField label="Lantai" error={errors.floor_snapshot}>
                                        <TextInput value={data.floor_snapshot} onChange={(e) => setData('floor_snapshot', e.target.value)} />
                                    </FormField>
                                    <FormField label="Blok" error={errors.block_snapshot}>
                                        <TextInput value={data.block_snapshot} onChange={(e) => setData('block_snapshot', e.target.value)} />
                                    </FormField>
                                </div>
                            )}

                            {locationType === 'vendor' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label="Nama Perusahaan" error={errors.contractor_company} required>
                                        <TextInput value={data.contractor_company} onChange={(e) => setData('contractor_company', e.target.value)} />
                                    </FormField>
                                    <FormField label="Penanggung Jawab" error={errors.contractor_pic} required>
                                        <TextInput value={data.contractor_pic} onChange={(e) => setData('contractor_pic', e.target.value)} />
                                    </FormField>
                                    <FormField label="Alamat" error={errors.contractor_address} className="sm:col-span-2">
                                        <Textarea value={data.contractor_address} onChange={(e) => setData('contractor_address', e.target.value)} rows={2} />
                                    </FormField>
                                    <FormField label="Telp/HP/Fax" error={errors.contractor_phone} required>
                                        <TextInput value={data.contractor_phone} onChange={(e) => setData('contractor_phone', e.target.value)} />
                                    </FormField>
                                </div>
                            )}
                        </FormSection>

                        <PermitFormFields
                            data={data}
                            setData={setData}
                            errors={errors}
                            hideVendorSection={locationType === 'vendor'}
                        />

                        <FormSection title="Departemen Pendampingan" description="Pilih divisi yang perlu ikut mendampingi kegiatan ini">
                            <div className="flex flex-wrap gap-3">
                                {departments.map((d) => (
                                    <Checkbox
                                        key={d.id}
                                        label={d.name}
                                        checked={data.accompanying_department_ids.includes(d.id)}
                                        onChange={() => toggleDept(d.id)}
                                    />
                                ))}
                            </div>
                        </FormSection>
                    </div>

                    {/* Kolom kanan — sticky, tepat di bawah topbar */}
                    <div className="lg:sticky lg:top-[72px] space-y-4">
                        <FormSection title="Ringkasan">
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Jenis Kegiatan</dt>
                                    <dd className="text-gray-800 font-medium">
                                        {data.activity_types.length || '—'} dipilih
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Pekerja</dt>
                                    <dd className="text-gray-800 font-medium">
                                        {data.workers.filter(w => w.name).length} orang
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Barang</dt>
                                    <dd className="text-gray-800 font-medium">
                                        {data.goods.filter(g => g.description).length} item
                                    </dd>
                                </div>
                            </dl>
                        </FormSection>

                        <div className="bg-white rounded-xl border border-[#E2E5EA] p-5">
                            <Button type="submit" disabled={processing} className="w-full justify-center">
                                {processing ? 'Mengirim...' : 'Ajukan Surat Izin'}
                            </Button>
                            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                                Surat izin akan diproses melalui persetujuan Tenancy, Building Service, dan pengecekan fisik Security sebelum selesai.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </AppLayout>
);
}