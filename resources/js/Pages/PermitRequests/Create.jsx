import AppLayout from '@/Layouts/AppLayout';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import FormSection from '@/Components/Form/FormSection';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import TimeInput from '@/Components/Form/TimeInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import StepIndicator from '@/Components/StepIndicator';
import StepPanel from '@/Components/StepPanel';

const STEPS = ['Kategori', 'Jadwal', 'Pekerja & Barang', 'Detail', 'Review'];

export default function Create({ tenants, departments }) {
    const [step, setStep] = useState(1);
    const [locationType, setLocationType] = useState('area');
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors } = useForm({
        tenant_id: '',
        store_name_snapshot: '',
        floor_snapshot: '',
        block_snapshot: '',
        unit_number_snapshot: '',
        permit_number: '',
        activity_types: [],
        request_date: new Date().toISOString().split('T')[0],
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
        if (type === 'vendor') setData((prev) => ({ ...prev, tenant_id: '', is_external: true }));
        else if (type === 'area') setData((prev) => ({ ...prev, tenant_id: '', is_external: false }));
        else setData((prev) => ({ ...prev, is_external: false }));
    };

    const toggleActivityType = (value) => {
        const current = data.activity_types || [];
        setData('activity_types', current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const toggleDept = (id) => {
        const current = data.accompanying_department_ids;
        setData('accompanying_department_ids', current.includes(id) ? current.filter((d) => d !== id) : [...current, id]);
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

    const validateStep = (s) => {
        const errs = {};
        if (s === 1) {
            if (locationType === 'tenant' && !data.tenant_id) errs.tenant_id = 'Pilih tenant terlebih dahulu.';
            if (locationType === 'area' && !data.store_name_snapshot) errs.store_name_snapshot = 'Nama lokasi wajib diisi.';
            if (locationType === 'vendor') {
                if (!data.contractor_company) errs.contractor_company = 'Nama perusahaan wajib diisi.';
                if (!data.contractor_pic) errs.contractor_pic = 'Penanggung jawab wajib diisi.';
                if (!data.contractor_phone) errs.contractor_phone = 'Telepon wajib diisi.';
            }
        }
        if (s === 2) {
            if (data.activity_types.length === 0) errs.activity_types = 'Pilih minimal 1 jenis kegiatan.';
            if (!data.work_start_date) errs.work_start_date = 'Tanggal mulai wajib diisi.';
            if (!data.work_end_date) errs.work_end_date = 'Tanggal selesai wajib diisi.';
        }
        if (s === 3) {
            if (!data.workers.some((w) => w.name.trim())) errs.workers = 'Minimal 1 nama pekerja wajib diisi.';
        }
        if (s === 4) {
            if (!data.permit_number) errs.permit_number = 'Nomor surat wajib diisi.';
        }
        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const goNext = () => {
        if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length));
    };
    const goBack = () => {
        setClientErrors({});
        setStep((s) => Math.max(s - 1, 1));
    };

    const submit = (e) => {
        e.preventDefault();
        if (!validateStep(4)) { setStep(4); return; }
        post('/permit-requests');
    };

    const activityLabels = data.activity_types.map((v) => ACTIVITY_TYPES.find((t) => t.value === v)?.label ?? v);

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Ajukan Surat Izin</h1>
                <p className="text-sm text-gray-500 mb-6">Ikuti langkah di bawah untuk mengajukan izin baru</p>

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                        {/* Kolom kiri — stepper */}
                        <div>
                            <StepIndicator steps={STEPS} currentStep={step} />

                            {Object.keys(errors).length > 0 && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-lg mb-4">
                                    <p className="font-medium mb-1">Ada kesalahan input:</p>
                                    <ul className="list-disc list-inside">
                                        {Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}
                                    </ul>
                                </div>
                            )}

                            <StepPanel stepKey={step}>
                                {/* STEP 1 — Kategori & Lokasi */}
                                {step === 1 && (
                                    <FormSection title="Kategori & Lokasi">
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
                                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                                                        locationType === opt.value
                                                            ? 'border-[#0F1E36] bg-[#0F1E36]/5 text-[#0F1E36] shadow-sm'
                                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {locationType === 'tenant' && (
                                            <FormField label="Pilih Tenant" error={clientErrors.tenant_id} required>
                                                <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                                    <option value="">Pilih tenant...</option>
                                                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </SelectInput>
                                            </FormField>
                                        )}

                                        {locationType === 'area' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <FormField label="Nama Lokasi/Area" error={clientErrors.store_name_snapshot} className="sm:col-span-3" required>
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
                                                <FormField label="Nama Perusahaan" error={clientErrors.contractor_company} required>
                                                    <TextInput value={data.contractor_company} onChange={(e) => setData('contractor_company', e.target.value)} />
                                                </FormField>
                                                <FormField label="Penanggung Jawab" error={clientErrors.contractor_pic} required>
                                                    <TextInput value={data.contractor_pic} onChange={(e) => setData('contractor_pic', e.target.value)} />
                                                </FormField>
                                                <FormField label="Alamat" error={errors.contractor_address} className="sm:col-span-2">
                                                    <Textarea value={data.contractor_address} onChange={(e) => setData('contractor_address', e.target.value)} rows={2} />
                                                </FormField>
                                                <FormField label="Telp/HP/Fax" error={clientErrors.contractor_phone} required>
                                                    <TextInput value={data.contractor_phone} onChange={(e) => setData('contractor_phone', e.target.value)} />
                                                </FormField>
                                            </div>
                                        )}
                                    </FormSection>
                                )}

                                {/* STEP 2 — Jadwal & Kegiatan */}
                                {step === 2 && (
                                    <FormSection title="Jadwal & Kegiatan">
                                        <FormField label="Jenis Kegiatan" error={clientErrors.activity_types} required>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                                                {ACTIVITY_TYPES.map((type) => (
                                                    <Checkbox
                                                        key={type.value}
                                                        label={type.label}
                                                        checked={data.activity_types.includes(type.value)}
                                                        onChange={() => toggleActivityType(type.value)}
                                                    />
                                                ))}
                                            </div>
                                        </FormField>

                                        <FormField label="Jenis Pekerjaan" error={errors.job_type}>
                                            <TextInput value={data.job_type} onChange={(e) => setData('job_type', e.target.value)} />
                                        </FormField>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Tanggal Mulai" error={clientErrors.work_start_date} required>
                                                <DateInput value={data.work_start_date} onChange={(e) => setData('work_start_date', e.target.value)} />
                                            </FormField>
                                            <FormField label="Tanggal Selesai" error={clientErrors.work_end_date} required>
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
                                    </FormSection>
                                )}

                                {/* STEP 3 — Pekerja & Barang */}
                                {step === 3 && (
                                    <FormSection title="Pekerja & Barang">
                                        {clientErrors.workers && (
                                            <p className="text-xs text-red-600 mb-3">⚠ {clientErrors.workers}</p>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Daftar Pekerja</h3>
                                                {data.workers.map((worker, idx) => (
                                                    <div key={idx} className="flex gap-2 mb-2">
                                                        <TextInput
                                                            value={worker.name}
                                                            onChange={(e) => updateWorker(idx, e.target.value)}
                                                            placeholder={`Nama pekerja ${idx + 1}`}
                                                        />
                                                        {data.workers.length > 1 && (
                                                            <button type="button" onClick={() => removeWorker(idx)} className="text-red-500 text-sm shrink-0 px-2">Hapus</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button type="button" variant="secondary" onClick={addWorker} className="text-xs mt-1">+ Tambah Pekerja</Button>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Daftar Barang / Peralatan</h3>
                                                {data.goods.map((good, idx) => (
                                                    <div key={idx} className="flex gap-2 mb-2">
                                                        <TextInput
                                                            value={good.description}
                                                            onChange={(e) => updateGood(idx, 'description', e.target.value)}
                                                            placeholder="Nama barang"
                                                            className="flex-1"
                                                        />
                                                        <TextInput
                                                            value={good.quantity_note}
                                                            onChange={(e) => updateGood(idx, 'quantity_note', e.target.value)}
                                                            placeholder="Jumlah"
                                                            className="w-24"
                                                        />
                                                        {data.goods.length > 1 && (
                                                            <button type="button" onClick={() => removeGood(idx)} className="text-red-500 text-sm shrink-0">Hapus</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button type="button" variant="secondary" onClick={addGood} className="text-xs mt-1">+ Tambah Barang</Button>
                                            </div>
                                        </div>
                                    </FormSection>
                                )}

                                {/* STEP 4 — Detail Tambahan */}
                                {step === 4 && (
                                    <>
                                        <FormSection title="Detail Permohonan">
                                            <FormField label="Nomor Surat" error={clientErrors.permit_number} required>
                                                <TextInput
                                                    value={data.permit_number}
                                                    onChange={(e) => setData('permit_number', e.target.value)}
                                                    placeholder="307/TC/VIII/26"
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

                                        {locationType !== 'vendor' && (
                                            <FormSection title="Vendor / Kontraktor Eksternal">
                                                <Checkbox
                                                    label="Melibatkan vendor/kontraktor eksternal"
                                                    checked={data.is_external}
                                                    onChange={(e) => setData('is_external', e.target.checked)}
                                                    className="mb-4"
                                                />
                                                {data.is_external && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <FormField label="Nama Perusahaan" error={errors.contractor_company}>
                                                            <TextInput value={data.contractor_company} onChange={(e) => setData('contractor_company', e.target.value)} />
                                                        </FormField>
                                                        <FormField label="Penanggung Jawab" error={errors.contractor_pic}>
                                                            <TextInput value={data.contractor_pic} onChange={(e) => setData('contractor_pic', e.target.value)} />
                                                        </FormField>
                                                        <FormField label="Alamat" error={errors.contractor_address} className="sm:col-span-2">
                                                            <Textarea value={data.contractor_address} onChange={(e) => setData('contractor_address', e.target.value)} rows={2} />
                                                        </FormField>
                                                        <FormField label="Telp/HP/Fax" error={errors.contractor_phone}>
                                                            <TextInput value={data.contractor_phone} onChange={(e) => setData('contractor_phone', e.target.value)} />
                                                        </FormField>
                                                    </div>
                                                )}
                                            </FormSection>
                                        )}

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

                                        <FormSection title="Catatan">
                                            <FormField label="Keterangan Tambahan" error={errors.notes}>
                                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                                            </FormField>
                                        </FormSection>
                                    </>
                                )}

                                {/* STEP 5 — Review */}
                                {step === 5 && (
                                    <FormSection title="Review & Kirim">
                                        <div className="space-y-4 text-sm">
                                            <ReviewRow
                                                label="Kategori"
                                                value={
                                                    locationType === 'area'
                                                        ? 'Area Duta Mall'
                                                        : locationType === 'tenant'
                                                        ? tenants.find((t) => t.id == data.tenant_id)?.name
                                                        : data.contractor_company
                                                }
                                            />
                                            <ReviewRow label="Nomor Surat" value={data.permit_number} />
                                            <ReviewRow label="Jenis Kegiatan" value={activityLabels.join(', ') || '—'} />
                                            <ReviewRow label="Tanggal Pelaksanaan" value={`${data.work_start_date} s/d ${data.work_end_date}`} />
                                            <ReviewRow label="Jam" value={`${data.work_start_time || '—'} s/d ${data.work_end_time || '—'}`} />
                                            <ReviewRow label="Pekerja" value={`${data.workers.filter((w) => w.name).length} orang`} />
                                            <ReviewRow label="Barang" value={`${data.goods.filter((g) => g.description).length} item`} />
                                            <ReviewRow
                                                label="Pendampingan"
                                                value={
                                                    departments
                                                        .filter((d) => data.accompanying_department_ids.includes(d.id))
                                                        .map((d) => d.name)
                                                        .join(', ') || 'Tidak ada'
                                                }
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                                            Periksa kembali data di atas. Setelah diajukan, surat izin akan diproses melalui persetujuan Tenancy, Building Service, dan pengecekan fisik Security.
                                        </p>
                                    </FormSection>
                                )}
                            </StepPanel>

                            {/* Navigasi step */}
                            <div className="flex gap-2 mt-2">
                                {step > 1 && (
                                    <Button type="button" variant="secondary" onClick={goBack}>
                                        Kembali
                                    </Button>
                                )}
                                <div className="flex-1" />
                                {step < STEPS.length ? (
                                    <Button type="button" onClick={goNext}>
                                        Lanjut
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={processing} variant="success">
                                        {processing ? 'Mengirim...' : 'Ajukan Surat Izin'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Kolom kanan — ringkasan hidup, sticky */}
                        <div className="lg:sticky lg:top-[72px]">
                            <LiveSummary
                                data={data}
                                locationType={locationType}
                                tenants={tenants}
                                currentStep={step}
                            />
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

function LiveSummary({ data, locationType, tenants, currentStep }) {
    const locationLabel = locationType === 'area'
        ? data.store_name_snapshot || null
        : locationType === 'tenant'
        ? tenants.find((t) => t.id == data.tenant_id)?.name || null
        : data.contractor_company || null;

    const activityCount = data.activity_types.length;
    const workerCount = data.workers.filter((w) => w.name).length;
    const goodsCount = data.goods.filter((g) => g.description).length;
    const deptCount = data.accompanying_department_ids.length;

    return (
        <div className="bg-white rounded-xl border border-[#E2E5EA] p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#1FA24C] animate-pulse" />
                <h2 className="text-sm font-semibold text-gray-800">Ringkasan Pengajuan</h2>
            </div>

            <div className="space-y-3">
                <SummaryItem
                    label="Kategori"
                    value={locationType === 'area' ? 'Area Duta Mall' : locationType === 'tenant' ? 'Tenant' : 'Vendor'}
                    filled
                />
                <SummaryItem label="Lokasi/Nama" value={locationLabel} filled={!!locationLabel} />
                <SummaryItem
                    label="Nomor Surat"
                    value={data.permit_number}
                    filled={!!data.permit_number}
                    dim={currentStep < 4}
                />
                <SummaryItem
                    label="Jenis Kegiatan"
                    value={activityCount > 0 ? `${activityCount} dipilih` : null}
                    filled={activityCount > 0}
                    dim={currentStep < 2}
                />
                <SummaryItem
                    label="Jadwal"
                    value={data.work_start_date ? `${data.work_start_date} s/d ${data.work_end_date || '...'}` : null}
                    filled={!!data.work_start_date}
                    dim={currentStep < 2}
                />
                <SummaryItem
                    label="Pekerja"
                    value={workerCount > 0 ? `${workerCount} orang` : null}
                    filled={workerCount > 0}
                    dim={currentStep < 3}
                />
                <SummaryItem
                    label="Barang"
                    value={goodsCount > 0 ? `${goodsCount} item` : null}
                    filled={goodsCount > 0}
                    dim={currentStep < 3}
                />
                <SummaryItem
                    label="Pendampingan"
                    value={deptCount > 0 ? `${deptCount} departemen` : 'Tidak ada'}
                    filled
                    dim={currentStep < 4}
                />
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 leading-relaxed">
                    Panel ini otomatis terisi sesuai data yang kamu masukkan di tiap langkah.
                </p>
            </div>
        </div>
    );
}

function SummaryItem({ label, value, filled, dim = false }) {
    return (
        <div className={`flex justify-between items-start gap-3 transition-opacity duration-300 ${dim ? 'opacity-40' : 'opacity-100'}`}>
            <span className="text-xs text-gray-500 shrink-0">{label}</span>
            <span className={`text-xs text-right ${filled ? 'text-gray-900 font-medium' : 'text-gray-300 italic'}`}>
                {value || 'Belum diisi'}
            </span>
        </div>
    );
}

function ReviewRow({ label, value }) {
    return (
        <div className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900 font-medium text-right max-w-[60%]">{value || '—'}</dd>
        </div>
    );
}
