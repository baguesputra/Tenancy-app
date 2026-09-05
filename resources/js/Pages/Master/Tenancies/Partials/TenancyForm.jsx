import { useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import NumberInput from '@/Components/Form/NumberInput';
import FileInput from '@/Components/Form/FileInput';
import Button from '@/Components/Form/Button';

export default function TenancyForm({ tenancy, units, tenants }) {
    const isEdit = !!tenancy;

    const { data, setData, post, processing, errors } = useForm({
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
        <form onSubmit={submit} className="max-w-2xl">
            <FormSection title="Unit & Tenant">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Unit" error={errors.unit_id} required>
                        <SelectInput value={data.unit_id} onChange={(e) => setData('unit_id', e.target.value)}>
                            <option value="">Pilih unit...</option>
                            {units.map((u) => <option key={u.id} value={u.id}>{u.unit_code}</option>)}
                        </SelectInput>
                    </FormField>

                    <FormField label="Tenant" error={errors.tenant_id} required>
                        <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                            <option value="">Pilih tenant...</option>
                            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </SelectInput>
                    </FormField>
                </div>

                <FormField
                    label="Status"
                    error={errors.status}
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

                <FormField label="Dokumen Kontrak (PDF/Gambar)" error={errors.contract_document}>
                    <FileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setData('contract_document', e.target.files[0])} />
                    {tenancy?.contract_document_path && (
                        <a href={`/storage/${tenancy.contract_document_path}`} target="_blank" className="text-xs text-[#0F1E36] underline mt-1.5 inline-block">
                            Lihat dokumen saat ini
                        </a>
                    )}
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Tanggal Mulai" error={errors.start_date} required>
                        <DateInput value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                    </FormField>
                    <FormField label="Tanggal Berakhir" error={errors.end_date}>
                        <DateInput value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                    </FormField>
                    <FormField label="Tanggal TTD" error={errors.signed_date}>
                        <DateInput value={data.signed_date} onChange={(e) => setData('signed_date', e.target.value)} />
                    </FormField>
                </div>
            </FormSection>

            <FormSection title="Finansial">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Nilai Sewa (Rp)" error={errors.rent_value}>
                        <NumberInput value={data.rent_value} onChange={(e) => setData('rent_value', e.target.value)} />
                    </FormField>
                    <FormField label="Periode Sewa" error={errors.rent_period}>
                        <SelectInput value={data.rent_period} onChange={(e) => setData('rent_period', e.target.value)}>
                            <option value="">Pilih...</option>
                            <option value="bulanan">Bulanan</option>
                            <option value="tahunan">Tahunan</option>
                        </SelectInput>
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Service Charge (Rp)" error={errors.service_charge}>
                        <NumberInput value={data.service_charge} onChange={(e) => setData('service_charge', e.target.value)} />
                    </FormField>
                    <FormField label="Deposit (Rp)" error={errors.deposit_value}>
                        <NumberInput value={data.deposit_value} onChange={(e) => setData('deposit_value', e.target.value)} />
                    </FormField>
                </div>

                <FormField label="Termin Pembayaran" error={errors.payment_term}>
                    <TextInput value={data.payment_term} onChange={(e) => setData('payment_term', e.target.value)} placeholder="Bulanan, per-3 bulan, dst" />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Percentage Rent (%)" error={errors.percentage_rent_rate}>
                        <NumberInput step="0.01" value={data.percentage_rent_rate} onChange={(e) => setData('percentage_rent_rate', e.target.value)} />
                    </FormField>
                    <FormField label="Breakpoint Omzet (Rp)" error={errors.percentage_rent_breakpoint}>
                        <NumberInput value={data.percentage_rent_breakpoint} onChange={(e) => setData('percentage_rent_breakpoint', e.target.value)} />
                    </FormField>
                </div>
            </FormSection>

            <FormSection>
                <FormField label="Catatan" error={errors.notes}>
                    <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </FormField>
            </FormSection>

            <Button type="submit" disabled={processing}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Tenancy'}
            </Button>
        </form>
    );
}