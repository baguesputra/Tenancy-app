import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import DateInput from '@/Components/Form/DateInput';
import TimeInput from '@/Components/Form/TimeInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';

export default function PermitFormFields({ data, setData, errors, departments = [], hideVendorSection = false }) {
    const toggleActivityType = (value) => {
        const current = data.activity_types || [];
        setData('activity_types', current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value]);
    };

    const updateWorker = (idx, value) => {
        const next = [...data.workers];
        next[idx] = { name: value };
        setData('workers', next);
    };
    const addWorker = () => setData('workers', [...data.workers, { name: '' }]);
    const removeWorker = (idx) => setData('workers', data.workers.filter((_, i) => i !== idx));

    const updateGood = (idx, field, value) => {
        const next = [...data.goods];
        next[idx] = { ...next[idx], [field]: value };
        setData('goods', next);
    };
    const addGood = () => setData('goods', [...data.goods, { description: '', quantity_note: '' }]);
    const removeGood = (idx) => setData('goods', data.goods.filter((_, i) => i !== idx));

    const toggleDept = (id) => {
        const current = data.accompanying_department_ids || [];
        setData('accompanying_department_ids', current.includes(id)
            ? current.filter((d) => d !== id)
            : [...current, id]);
    };

    return (
        <>
            <FormSection title="Informasi Umum">
                <FormField label="Nomor Surat" error={errors.permit_number} required>
                    <TextInput
                        value={data.permit_number}
                        onChange={(e) => setData('permit_number', e.target.value)}
                        placeholder="307/TC/VIII/26"
                    />
                </FormField>

                <FormField label="Jenis Kegiatan" error={errors.activity_types} required>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                        {ACTIVITY_TYPES.map((type) => (
                            <Checkbox
                                key={type.value}
                                label={type.label}
                                checked={data.activity_types?.includes(type.value)}
                                onChange={() => toggleActivityType(type.value)}
                            />
                        ))}
                    </div>
                </FormField>

                <FormField label="Tanggal Pengajuan" error={errors.request_date} required>
                    <DateInput
                        value={data.request_date}
                        onChange={(e) => setData('request_date', e.target.value)}
                    />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Nama Penanggung Jawab" error={errors.pic_name}>
                        <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} />
                    </FormField>
                    <FormField label="Telepon PIC" error={errors.pic_phone}>
                        <TextInput value={data.pic_phone} onChange={(e) => setData('pic_phone', e.target.value)} />
                    </FormField>
                </div>
            </FormSection>

            {!hideVendorSection && (
            <FormSection title="Vendor / Kontraktor Eksternal">
                <Checkbox
                    label="Melibatkan vendor/kontraktor eksternal"
                    checked={data.is_external}
                    onChange={(e) => setData('is_external', e.target.checked)}
                    className="mb-4"
                />

                {data.is_external && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Nama Perusahaan" error={errors.contractor_company}>
                                <TextInput value={data.contractor_company} onChange={(e) => setData('contractor_company', e.target.value)} />
                            </FormField>
                            <FormField label="Penanggung Jawab" error={errors.contractor_pic}>
                                <TextInput value={data.contractor_pic} onChange={(e) => setData('contractor_pic', e.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Alamat" error={errors.contractor_address}>
                            <Textarea value={data.contractor_address} onChange={(e) => setData('contractor_address', e.target.value)} rows={2} />
                        </FormField>
                        <FormField label="Telp/HP/Fax" error={errors.contractor_phone}>
                            <TextInput value={data.contractor_phone} onChange={(e) => setData('contractor_phone', e.target.value)} />
                        </FormField>
                    </>
                )}
            </FormSection>
            )}

              {departments.length > 0 && (
                <FormSection title="Departemen Pendampingan" description="Pilih divisi yang perlu ikut mendampingi kegiatan ini">
                    <div className="flex flex-wrap gap-3">
                        {departments.map((d) => (
                            <Checkbox
                                key={d.id}
                                label={d.name}
                                checked={(data.accompanying_department_ids || []).includes(d.id)}
                                onChange={() => toggleDept(d.id)}
                            />
                        ))}
                    </div>
                </FormSection>
            )}

            {/* Daftar Pekerja & Daftar Barang digabung — 2 kolom dalam 1 card, hemat ruang */}
            <FormSection title="Pekerja & Barang">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                            Daftar Pekerja
                        </h3>
                        {data.workers.map((worker, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <TextInput
                                    value={worker.name}
                                    onChange={(e) => updateWorker(idx, e.target.value)}
                                    placeholder={`Nama pekerja ${idx + 1}`}
                                />
                                {data.workers.length > 1 && (
                                    <button type="button" onClick={() => removeWorker(idx)} className="text-red-500 text-sm shrink-0 px-2">
                                        Hapus
                                    </button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addWorker} className="text-xs mt-1">
                            + Tambah Pekerja
                        </Button>
                    </div>

                    <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                            Daftar Barang / Peralatan
                        </h3>
                        {data.goods.map((good, idx) => (
                            <div key={idx} className="flex flex-col gap-2 mb-2">
                                <div className="flex gap-2">
                                    <TextInput
                                        value={good.description}
                                        onChange={(e) => updateGood(idx, 'description', e.target.value)}
                                        placeholder="Nama barang"
                                        className="flex-[3]"
                                    />
                                    <TextInput
                                        value={good.quantity_note}
                                        onChange={(e) => updateGood(idx, 'quantity_note', e.target.value)}
                                        placeholder="Jumlah"
                                        className="flex-1"
                                    />
                                    {data.goods.length > 1 && (
                                        <button type="button" onClick={() => removeGood(idx)} className="text-red-500 text-sm shrink-0">
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addGood} className="text-xs mt-1">
                            + Tambah Barang
                        </Button>
                    </div>
                </div>
            </FormSection>

            <FormSection title="Detail Pekerjaan">
                <FormField label="Jenis Pekerjaan" error={errors.job_type}>
                    <TextInput value={data.job_type} onChange={(e) => setData('job_type', e.target.value)} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tanggal Mulai" error={errors.work_start_date}>
                        <DateInput value={data.work_start_date} onChange={(e) => setData('work_start_date', e.target.value)} />
                    </FormField>
                    <FormField label="Tanggal Selesai" error={errors.work_end_date}>
                        <DateInput value={data.work_end_date} onChange={(e) => setData('work_end_date', e.target.value)} />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Jam Mulai" error={errors.work_start_time}>
                        <TimeInput value={data.work_start_time} onChange={(e) => setData('work_start_time', e.target.value)} />
                    </FormField>
                    <FormField label="Jam Selesai" error={errors.work_end_time}>
                        <TimeInput value={data.work_end_time} onChange={(e) => setData('work_end_time', e.target.value)} />
                    </FormField>
                </div>

                <FormField label="Akses Masuk/Keluar" error={errors.access_route}>
                    <Textarea value={data.access_route} onChange={(e) => setData('access_route', e.target.value)} rows={2} />
                </FormField>

                <FormField label="Keterangan" error={errors.notes}>
                    <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                </FormField>
            </FormSection>
        </>
    );
}