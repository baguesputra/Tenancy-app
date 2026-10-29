import AppLayout from '@/Layouts/AppLayout';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ACTIVITY_TYPES, KEGIATAN_TYPES } from '@/Constants/permitActivityTypes';
import FormSection from '@/Components/Form/FormSection';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SearchableSelect from '@/Components/Form/SearchableSelect';
import DateInput from '@/Components/Form/DateInput';
import TimeInput from '@/Components/Form/TimeInput';
import Checkbox from '@/Components/Form/Checkbox';
import MultiSelect from '@/Components/Form/MultiSelect';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import StepIndicator from '@/Components/StepIndicator';
import StepPanel from '@/Components/StepPanel';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { formatDateRange, formatTimeRange, maxPermitEndDate } from '@/utils/format';

const STEPS = ['Detail & Kategori', 'Jadwal', 'Pekerja & Barang', 'Pelengkap', 'Review'];
const KEGIATAN_STEPS = ['Tenant & Kegiatan', 'Jadwal', 'Review'];
const MARKETING_STEPS = ['Tenant & Stand', 'Jadwal Pameran', 'Barang Pameran', 'Penanggung Jawab', 'Review'];
const PARKIR_STEPS = ['Tenant & Kendaraan', 'Pemohon', 'Review'];
const CUSTOMER_STEPS = ['Identitas Customer', 'PIC & Tagihan', 'Review'];

const ACTIVITY_GROUPS = [
    { label: 'Pekerjaan', values: ['kerja', 'lembur'] },
    { label: 'Barang', values: ['masuk_barang', 'keluar_barang'] },
    { label: 'Alat Kerja / Properti', values: ['masuk_alat', 'keluar_alat'] },
    { label: 'Proyek', values: ['fit_out', 'pull_out', 'renovasi'] },
    { label: 'Event', values: ['pameran'] },
].map((g) => ({ label: g.label, items: ACTIVITY_TYPES.filter((t) => g.values.includes(t.value)) }));

const EXCLUSIVE_ACTIVITY_TYPES = ['fit_out', 'pull_out'];

export default function Create({ tenants, departments, isMarketingLocked = false, formMode = 'kerja', canChooseMode = false, canCreatePameran = false }) {
    const isKegiatan = !isMarketingLocked && formMode === 'kegiatan';
    const isParkir = !isMarketingLocked && formMode === 'parkir';
    const isCustomer = !isMarketingLocked && formMode === 'customer';
    const [step, setStep] = useState(1);
    const [unlocked, setUnlocked] = useState(isMarketingLocked);
    const [locationType, setLocationType] = useState(isMarketingLocked ? 'exhibition' : 'tenant');
    const [clientErrors, setClientErrors] = useState({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const activityGroups = canCreatePameran
        ? ACTIVITY_GROUPS
        : ACTIVITY_GROUPS
            .map((group) => ({ ...group, items: group.items.filter((type) => type.value !== 'pameran') }))
            .filter((group) => group.items.length > 0);

    const { data, setData, post, processing, errors } = useForm({
        form_mode: isMarketingLocked ? 'pameran' : formMode,
        tenant_id: '',
        store_name_snapshot: '',
        stand_name: '',
        floor_snapshot: '',
        block_snapshot: '',
        unit_number_snapshot: '',
        activity_types: isMarketingLocked ? ['pameran'] : isParkir ? ['langganan_parkir'] : isCustomer ? ['customer_form'] : [],
        kegiatan_type: '',
        event_name: '',
        event_area: '',
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
        worker_count: '',
        needs_manager_approval: false,
        vehicle_plate: '',
        vehicle_type: '',
        applicant_name: '',
        applicant_position: '',
        goods: [{ description: '', quantity_note: '', unit: '' }],
        goods_light: [{ description: '', quantity_note: '', unit: '' }],
        goods_heavy: [{ description: '', quantity_note: '', unit: '' }],
        accompanying_department_ids: [],
        customer_company_name: '',
        customer_invoice_address: '',
        customer_company_phone: '',
        customer_npwp_number: '',
        customer_npwp_name: '',
        customer_npwp_address: '',
        customer_pic_name: '',
        customer_pic_position: '',
        customer_pic_ktp: '',
        customer_pic_phone: '',
        customer_pic_email: '',
        customer_tenant_relation: '',
        customer_billing_description: '',
        customer_amount: '',
        customer_city: 'Banjarmasin',
        customer_notes: '',
        customer_request_date: new Date().toISOString().slice(0, 10),
    });

    const selectLocationType = (type) => {
        setLocationType(type);
        if (type === 'vendor') setData((prev) => ({ ...prev, tenant_id: '', is_external: true }));
        else setData((prev) => ({ ...prev, is_external: false }));
    };

    const toggleActivityType = (value) => {
        const current = data.activity_types || [];
        if (EXCLUSIVE_ACTIVITY_TYPES.includes(value)) {
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current.filter((v) => !EXCLUSIVE_ACTIVITY_TYPES.includes(v)), value];
            setData('activity_types', next);
            return;
        }
        setData('activity_types', current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const updateGood = (idx, field, value) => {
        const next = [...data.goods];
        next[idx] = { ...next[idx], [field]: value };
        setData('goods', next);
    };
    const addGood = () => setData('goods', [...data.goods, { description: '', quantity_note: '', unit: '' }]);
    const removeGood = (idx) => setData('goods', data.goods.filter((_, i) => i !== idx));

    const updateExhibitionGood = (key, idx, field, value) => {
        const next = [...data[key]];
        next[idx] = { ...next[idx], [field]: value };
        setData(key, next);
    };
    const addExhibitionGood = (key) => setData(key, [...data[key], { description: '', quantity_note: '', unit: '' }]);
    const removeExhibitionGood = (key, idx) => setData(key, data[key].filter((_, i) => i !== idx));

    // Form umum/kerja: izin dibatasi 7 hari kalender. End date auto-isi 1 minggu bila kosong, sisanya di-clamp.
    const handleWorkStartDateChange = (value) => {
        setData((prev) => {
            let end = prev.work_end_date;
            if (!end) {
                end = maxPermitEndDate(value) ?? '';
            } else {
                const max = maxPermitEndDate(value);
                if (end > max) end = max;
                else if (end < value) end = value;
            }
            return { ...prev, work_start_date: value, work_end_date: end };
        });
        setClientErrors((prev) => ({ ...prev, work_start_date: undefined, work_end_date: undefined }));
    };

    const getStepErrors = (s) => {
        const errs = {};
        if (isMarketingLocked) return getMarketingStepErrors(s, errs);
        if (isKegiatan) return getKegiatanStepErrors(s, errs);
        if (isParkir) return getParkirStepErrors(s, errs);
        if (isCustomer) {
            if (s === 1) {
                if (!data.customer_company_name.trim()) errs.customer_company_name = 'Nama perusahaan wajib diisi.';
                if (!data.customer_invoice_address.trim()) errs.customer_invoice_address = 'Alamat invoice wajib diisi.';
                if (!data.customer_company_phone.trim()) errs.customer_company_phone = 'Telepon perusahaan wajib diisi.';
            }
            if (s === 2) {
                for (const field of ['customer_pic_name', 'customer_pic_position', 'customer_pic_ktp', 'customer_pic_phone', 'customer_pic_email', 'customer_billing_description', 'customer_city', 'customer_request_date']) {
                    if (!String(data[field] ?? '').trim()) errs[field] = 'Wajib diisi.';
                }
                if (data.customer_pic_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_pic_email)) errs.customer_pic_email = 'Format email tidak valid.';
                if (data.customer_amount === '' || Number(data.customer_amount) < 0) errs.customer_amount = 'Nominal tagihan wajib diisi.';
            }
            return errs;
        }
        if (s === 1) {
            if (locationType === 'tenant' && !data.tenant_id) errs.tenant_id = 'Pilih tenant terlebih dahulu.';
            if (locationType === 'vendor') {
                if (!data.contractor_company) errs.contractor_company = 'Nama perusahaan wajib diisi.';
                if (!data.contractor_pic) errs.contractor_pic = 'Penanggung jawab wajib diisi.';
                if (!data.contractor_phone) errs.contractor_phone = 'Telepon wajib diisi.';
            }
        }
        if (s === 2) {
            const hasBothProjectTypes = EXCLUSIVE_ACTIVITY_TYPES.every((value) => data.activity_types.includes(value));
            if (data.activity_types.length === 0) errs.activity_types = 'Pilih minimal 1 jenis kegiatan.';
            else if (hasBothProjectTypes) errs.activity_types = 'Fit Out dan Pull Out hanya bisa dipilih salah satu.';
            if (!data.work_start_date) errs.work_start_date = 'Tanggal mulai wajib diisi.';
            if (!data.work_end_date) errs.work_end_date = 'Tanggal selesai wajib diisi.';
            else if (data.work_start_date && data.work_end_date < data.work_start_date) errs.work_end_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
            else if (data.work_start_date && data.work_end_date > maxPermitEndDate(data.work_start_date)) errs.work_end_date = 'Tanggal selesai maksimal 7 hari setelah tanggal mulai.';
        }
        if (s === 3) {
            const n = parseInt(data.worker_count, 10);
            if (!n || n < 1) errs.worker_count = 'Jumlah pekerja wajib diisi (minimal 1 orang).';
        }
        return errs;
    };

    const getMarketingStepErrors = (s, errs) => {
        if (s === 1) {
            if (!data.tenant_id) errs.tenant_id = 'Pilih tenant Open Counter terlebih dahulu.';
            if (!data.stand_name.trim()) errs.stand_name = 'Nama stand wajib diisi.';
        }
        if (s === 2) {
            if (!data.work_start_date) errs.work_start_date = 'Periode mulai wajib diisi.';
            if (!data.work_end_date) errs.work_end_date = 'Periode selesai wajib diisi.';
        }
        if (s === 4) {
            if (!data.pic_name.trim()) errs.pic_name = 'Nama penanggung jawab wajib diisi.';
            if (!data.pic_phone.trim()) errs.pic_phone = 'No telepon wajib diisi.';
        }
        return errs;
    };

    const getParkirStepErrors = (s, errs) => {
        if (s === 1) {
            if (!data.tenant_id) errs.tenant_id = 'Pilih tenant terlebih dahulu.';
            if (!data.vehicle_plate.trim()) errs.vehicle_plate = 'NOPOL wajib diisi.';
            if (!data.vehicle_type) errs.vehicle_type = 'Pilih jenis kendaraan.';
        }
        if (s === 2) {
            if (!data.pic_name.trim() || data.pic_name.trim().length < 3) errs.pic_name = 'Nama penanggung jawab wajib diisi (min. 3 karakter).';
            if (!data.applicant_name.trim() || data.applicant_name.trim().length < 3) errs.applicant_name = 'Nama pemohon wajib diisi (min. 3 karakter).';
            if (!data.applicant_position.trim() || data.applicant_position.trim().length < 3) errs.applicant_position = 'Jabatan pemohon wajib diisi (min. 3 karakter).';
            if (!data.request_date) errs.request_date = 'Tanggal pengajuan wajib diisi.';
        }
        return errs;
    };

    const getKegiatanStepErrors = (s, errs) => {
        if (s === 1) {
            if (!data.tenant_id) errs.tenant_id = 'Pilih tenant terlebih dahulu.';
            if (!data.kegiatan_type) errs.kegiatan_type = 'Pilih jenis kegiatan.';
            if (!data.event_name.trim() || data.event_name.trim().length < 3) errs.event_name = 'Nama kegiatan wajib diisi (min. 3 karakter).';
        }
        if (s === 2) {
            if (!data.work_start_date) errs.work_start_date = 'Tanggal mulai wajib diisi.';
            if (!data.work_end_date) errs.work_end_date = 'Tanggal selesai wajib diisi.';
            if (data.work_start_date && data.work_end_date && data.work_end_date < data.work_start_date) errs.work_end_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
            if (!data.event_area.trim()) errs.event_area = 'Area event wajib diisi.';
            if (!data.pic_name.trim() || data.pic_name.trim().length < 3) errs.pic_name = 'Penanggung jawab wajib diisi (min. 3 karakter).';
        }
        return errs;
    };

    const validateStep = (s) => {
        const errs = getStepErrors(s);
        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const stepCount = (isMarketingLocked ? MARKETING_STEPS : isKegiatan ? KEGIATAN_STEPS : isParkir ? PARKIR_STEPS : isCustomer ? CUSTOMER_STEPS : STEPS).length;

    const validateAll = () => {
        const all = {};
        for (let s = 1; s < stepCount; s++) Object.assign(all, getStepErrors(s));
        setClientErrors(all);
        if (Object.keys(all).length === 0) return true;
        for (let s = 1; s < stepCount; s++) {
            if (Object.keys(getStepErrors(s)).length > 0) { setStep(s); break; }
        }
        return false;
    };

    const goNext = () => {
        if (!validateStep(step)) return;
        // Kunci wizard: navigasi bebas (maju-mundur) baru terbuka setelah step 1 valid.
        if (step === 1) setUnlocked(true);
        setStep((s) => Math.min(s + 1, stepCount));
    };
    const goBack = () => {
        setClientErrors({});
        setStep((s) => Math.max(s - 1, 1));
    };
    const goToStep = (s) => {
        if (!unlocked) return;
        setClientErrors({});
        setStep(s);
    };

    const submit = (e) => {
        e.preventDefault();
        goNext();
    };

    const handleAjukan = () => {
        if (!validateAll()) return;
        setConfirmOpen(true);
    };

    const confirmAjukan = () => {
        setConfirmOpen(false);
        post('/permit-requests');
    };

    const activityLabels = data.activity_types.map((v) => ACTIVITY_TYPES.find((t) => t.value === v)?.label ?? v);
    const selectedTenant = tenants.find((t) => t.id == data.tenant_id) ?? null;
    const tenantName = selectedTenant?.name ?? null;
    const tenantUnit = selectedTenant
        ? [selectedTenant.floor, selectedTenant.block, selectedTenant.unit_number].filter(Boolean).join(' / ') || null
        : null;
    const kegiatanMeta = KEGIATAN_TYPES.find((t) => t.value === data.kegiatan_type) ?? null;
    const categoryLabel = isMarketingLocked
        ? 'Pameran / Open Counter'
        : isKegiatan ? 'Kegiatan' : isParkir ? 'Parkir' : isCustomer ? 'Customer Isi Form' : locationType === 'tenant' ? 'Tenant' : 'Vendor';
    const locationDetail = isMarketingLocked
        ? [tenantName, data.stand_name].filter(Boolean).join(' — ') || '—'
        : (isKegiatan || isParkir || isCustomer)
        ? [tenantName, tenantUnit].filter(Boolean).join(' — ') || '—'
        : locationType === 'tenant'
        ? tenantName ?? '—'
        : data.contractor_company || '—';
    const nomorHint = isMarketingLocked
        ? 'kode E&P'
        : (isKegiatan || isParkir || isCustomer)
        ? (isKegiatan && kegiatanMeta ? `kode ${kegiatanMeta.code}` : 'kode TC')
        : (data.activity_types.includes('pameran') ? 'kode E&P' : 'kode TC');
    const workerCount = parseInt(data.worker_count, 10) || 0;
    const fmtGood = (g) => [(g.description ?? '').trim(), [(g.quantity_note ?? '').trim(), (g.unit ?? '').trim()].filter(Boolean).join(' ')].filter(Boolean).join(' — ');
    const lightNames = data.goods_light.map(fmtGood).filter(Boolean);
    const heavyNames = data.goods_heavy.map(fmtGood).filter(Boolean);
    const goodNames = isMarketingLocked ? [...lightNames, ...heavyNames] : data.goods.map(fmtGood).filter(Boolean);
    const deptNames = departments.filter((d) => data.accompanying_department_ids.includes(d.id)).map((d) => d.name);
    const steps = isMarketingLocked ? MARKETING_STEPS : isKegiatan ? KEGIATAN_STEPS : isParkir ? PARKIR_STEPS : isCustomer ? CUSTOMER_STEPS : STEPS;
    const formTitle = isMarketingLocked ? 'Ajukan Izin Pameran / Open Counter' : isKegiatan ? 'Ajukan Surat Izin Kegiatan' : isParkir ? 'Ajukan Surat Langganan Parkir' : isCustomer ? 'Customer Isi Form' : 'Ajukan Surat Izin Kerja';
    const formSubtitle = isMarketingLocked
        ? (canChooseMode ? 'Mode pameran — nomor E&P otomatis, approval Marketing › Keuangan › BS › Security' : 'Form khusus Marketing — nomor E&P otomatis, approval Marketing › Keuangan › BS › Security')
        : isKegiatan
        ? 'Mode kegiatan — nomor EVT/MTG/STO otomatis, approval Tenancy › Manager Tenant'
        : isParkir
        ? 'Mode parkir — nomor TC otomatis, approval Supervisor Tenant › Manager Cabang'
        : isCustomer
        ? 'Mode Customer Isi Form — nomor TC otomatis, approval Tenancy'
        : 'Mode kerja — nomor TC otomatis, approval Tenancy › Building Service › Security';

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-[#E2E5EA] pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-gray-900">{formTitle}</h1>
                        <p className="mt-0.5 text-sm text-gray-500">{formSubtitle}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => router.visit('/permit-requests')} className="shrink-0">
                        Batal
                    </Button>
                </div>

                {canChooseMode && (
                    <div className="mb-5">
                        <p id="mode-switcher-label" className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                            Jenis pengajuan
                        </p>
                        <div
                            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
                            role="group"
                            aria-labelledby="mode-switcher-label"
                        >
                            {[
                            { value: 'kerja', label: 'Kerja', desc: 'Tenant/vendor' },
                            { value: 'kegiatan', label: 'Kegiatan', desc: 'Event/meeting/stock' },
                            { value: 'pameran', label: 'Pameran', desc: 'Open counter' },
                            { value: 'parkir', label: 'Parkir', desc: 'Langganan bulanan' },
                            { value: 'customer', label: 'Customer', desc: 'Form diisi customer' },
                        ].filter((opt) => opt.value !== 'pameran' || canCreatePameran).map((opt) => {
                            const active = isMarketingLocked ? opt.value === 'pameran' : formMode === opt.value;
                            return (
                            <button
                                key={opt.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => { if (!active) router.get('/permit-requests/create', { mode: opt.value }); }}
                                className={`flex flex-col items-start gap-0.5 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    active
                                        ? 'border-[#0F1E36] bg-[#0F1E36] text-white'
                                        : 'border-[#C9D0D9] hover:border-[#0F1E36]/50 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{opt.label}</span>
                                <span className={`text-[11px] ${active ? 'text-white/70' : 'text-slate-500'}`}>{opt.desc}</span>
                            </button>
                            );
                        })}
                        </div>
                    </div>
                )}

                <form onSubmit={submit}>
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        {/* Kolom kiri — stepper */}
                        <div className="min-w-0">
                            <StepIndicator steps={steps} currentStep={step} onSelect={unlocked ? goToStep : null} />
                            {!unlocked && !isMarketingLocked && (
                                <p className="mb-4 text-xs text-gray-500">Isi langkah 1 sampai valid untuk membuka navigasi maju-mundur.</p>
                            )}

                                {Object.keys(errors).length > 0 && (
                                <ErrorSummary errors={errors} onJump={goToStep} isMarketingLocked={isMarketingLocked} isKegiatan={isKegiatan} isParkir={isParkir} isCustomer={isCustomer} />
                            )}

                            <StepPanel stepKey={step}>
                                {isMarketingLocked && step === 1 && (
                                    <FormSection title="Tenant & Stand" description="Khusus penyewa umum Open Counter">
                                        <div className="mb-4">
                                            <Badge color="blue">Pameran / Open Counter — terkunci</Badge>
                                        </div>
                                        <FormField label="Pilih Tenant Open Counter" error={clientErrors.tenant_id || errors.tenant_id} required>
                                            <SearchableSelect
                                                value={data.tenant_id}
                                                onChange={(e) => setData('tenant_id', e.target.value)}
                                                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                placeholder="Ketik untuk cari tenant Open Counter..."
                                                error={clientErrors.tenant_id || errors.tenant_id}
                                            />
                                        </FormField>
                                        <FormField label="Nama Stand" error={clientErrors.stand_name || errors.stand_name} required>
                                            <TextInput value={data.stand_name} onChange={(e) => setData('stand_name', e.target.value)} placeholder="cth. Stand UMKM Kopi" />
                                        </FormField>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <FormField label="Lokasi Stand" error={errors.floor_snapshot}>
                                                <TextInput value={data.floor_snapshot} onChange={(e) => setData('floor_snapshot', e.target.value)} placeholder="Lantai / area" />
                                            </FormField>
                                            <FormField label="Blok" error={errors.block_snapshot}>
                                                <TextInput value={data.block_snapshot} onChange={(e) => setData('block_snapshot', e.target.value)} placeholder="Blok" />
                                            </FormField>
                                            <FormField label="No. Stand" error={errors.unit_number_snapshot}>
                                                <TextInput value={data.unit_number_snapshot} onChange={(e) => setData('unit_number_snapshot', e.target.value)} placeholder="No." />
                                            </FormField>
                                        </div>
                                    </FormSection>
                                )}
                                {isParkir && step === 1 && (
                                    <FormSection title="Tenant & Kendaraan" description="Unit terisi otomatis dari tenancy aktif">
                                        <div className="mb-4">
                                            <Badge color="blue">Langganan Parkir</Badge>
                                        </div>
                                        <FormField label="Pilih Tenant" error={clientErrors.tenant_id || errors.tenant_id} required>
                                            <SearchableSelect
                                                value={data.tenant_id}
                                                onChange={(e) => setData('tenant_id', e.target.value)}
                                                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                placeholder="Ketik untuk cari tenant..."
                                                error={clientErrors.tenant_id || errors.tenant_id}
                                            />
                                        </FormField>
                                        <FormField label="Unit (otomatis dari master)">
                                            <TextInput value={tenantUnit ?? ''} placeholder="Pilih tenant untuk melihat unit" readOnly disabled />
                                        </FormField>
                                        <FormField label="NOPOL" error={clientErrors.vehicle_plate || errors.vehicle_plate} required hint="cth. DA 1234 AB">
                                            <TextInput
                                                value={data.vehicle_plate}
                                                onChange={(e) => setData('vehicle_plate', e.target.value.toUpperCase())}
                                                placeholder="Nomor polisi kendaraan"
                                                className="uppercase"
                                            />
                                        </FormField>
                                        <FormField label="Jenis Kendaraan" error={clientErrors.vehicle_type || errors.vehicle_type} required>
                                            <div className="grid grid-cols-2 gap-2.5 mt-1">
                                                {[
                                                    { value: 'mobil', label: 'MOBIL (R4)' },
                                                    { value: 'motor', label: 'MOTOR (R2)' },
                                                ].map((type) => (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setData('vehicle_type', type.value)}
                                                        aria-pressed={data.vehicle_type === type.value}
                                                        className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                            data.vehicle_type === type.value
                                                                ? 'border-[#0F1E36] bg-[#0F1E36]/5 text-[#0F1E36] shadow-sm'
                                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormField>
                                    </FormSection>
                                )}
                                {isCustomer && step === 1 && (
                                    <FormSection title="Identitas Perusahaan" description="Isi sesuai data resmi perusahaan untuk kebutuhan invoice dan faktur pajak.">
                                        <FormField label="Nama Perusahaan PT/CV" error={clientErrors.customer_company_name || errors.customer_company_name} required>
                                            <TextInput value={data.customer_company_name} onChange={(e) => setData('customer_company_name', e.target.value)} placeholder="Nama perusahaan sesuai dokumen legal" />
                                        </FormField>
                                        <FormField label="Alamat Pengiriman Invoice" error={clientErrors.customer_invoice_address || errors.customer_invoice_address} required>
                                            <Textarea value={data.customer_invoice_address} onChange={(e) => setData('customer_invoice_address', e.target.value)} rows={3} />
                                        </FormField>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="No. Telp/HP Perusahaan" error={clientErrors.customer_company_phone || errors.customer_company_phone} required>
                                                <TextInput value={data.customer_company_phone} onChange={(e) => setData('customer_company_phone', e.target.value)} />
                                            </FormField>
                                            <FormField label="Hubungan Tenant" error={errors.customer_tenant_relation}>
                                                <SearchableSelect
                                                    value={data.tenant_id}
                                                    onChange={(e) => {
                                                        const tenant = tenants.find((item) => String(item.id) === e.target.value);
                                                        setData((prev) => ({ ...prev, tenant_id: e.target.value, customer_tenant_relation: tenant?.name ?? '' }));
                                                    }}
                                                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                    placeholder="Opsional — pilih tenant terkait"
                                                />
                                            </FormField>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormField label="No. NPWP Perusahaan" error={errors.customer_npwp_number}>
                                                <TextInput value={data.customer_npwp_number} onChange={(e) => setData('customer_npwp_number', e.target.value)} />
                                            </FormField>
                                            <FormField label="Nama di NPWP" error={errors.customer_npwp_name}>
                                                <TextInput value={data.customer_npwp_name} onChange={(e) => setData('customer_npwp_name', e.target.value)} />
                                            </FormField>
                                            <FormField label="Alamat di NPWP" error={errors.customer_npwp_address}>
                                                <TextInput value={data.customer_npwp_address} onChange={(e) => setData('customer_npwp_address', e.target.value)} />
                                            </FormField>
                                        </div>
                                    </FormSection>
                                )}
                                {isCustomer && step === 2 && (
                                    <>
                                        <FormSection title="Data PIC" description="Penanggung jawab yang dapat dihubungi terkait tagihan.">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField label="Nama PIC" error={clientErrors.customer_pic_name || errors.customer_pic_name} required>
                                                    <TextInput value={data.customer_pic_name} onChange={(e) => setData('customer_pic_name', e.target.value)} />
                                                </FormField>
                                                <FormField label="Jabatan" error={clientErrors.customer_pic_position || errors.customer_pic_position} required>
                                                    <TextInput value={data.customer_pic_position} onChange={(e) => setData('customer_pic_position', e.target.value)} />
                                                </FormField>
                                                <FormField label="No. KTP" error={clientErrors.customer_pic_ktp || errors.customer_pic_ktp} required>
                                                    <TextInput value={data.customer_pic_ktp} onChange={(e) => setData('customer_pic_ktp', e.target.value)} />
                                                </FormField>
                                                <FormField label="No. Telp/HP" error={clientErrors.customer_pic_phone || errors.customer_pic_phone} required>
                                                    <TextInput value={data.customer_pic_phone} onChange={(e) => setData('customer_pic_phone', e.target.value)} />
                                                </FormField>
                                                <FormField label="E-mail" error={clientErrors.customer_pic_email || errors.customer_pic_email} required>
                                                    <TextInput type="email" value={data.customer_pic_email} onChange={(e) => setData('customer_pic_email', e.target.value)} />
                                                </FormField>
                                            </div>
                                        </FormSection>
                                        <FormSection title="Rincian Tagihan & Administrasi">
                                            <FormField label="Keterangan Tagihan" error={clientErrors.customer_billing_description || errors.customer_billing_description} required>
                                                <Textarea value={data.customer_billing_description} onChange={(e) => setData('customer_billing_description', e.target.value)} rows={2} />
                                            </FormField>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField label="Nominal (di luar PPN)" error={clientErrors.customer_amount || errors.customer_amount} required>
                                                    <TextInput type="number" min="0" step="0.01" value={data.customer_amount} onChange={(e) => setData('customer_amount', e.target.value)} />
                                                </FormField>
                                                <FormField label="Kota" error={clientErrors.customer_city || errors.customer_city} required>
                                                    <TextInput value={data.customer_city} onChange={(e) => setData('customer_city', e.target.value)} />
                                                </FormField>
                                                <FormField label="Tanggal" error={clientErrors.customer_request_date || errors.customer_request_date} required>
                                                    <DateInput value={data.customer_request_date} onChange={(e) => { setData('customer_request_date', e.target.value); setData('request_date', e.target.value); }} />
                                                </FormField>
                                            </div>
                                            <FormField label="Catatan" error={errors.customer_notes}>
                                                <Textarea value={data.customer_notes} onChange={(e) => setData('customer_notes', e.target.value)} rows={2} />
                                            </FormField>
                                        </FormSection>
                                    </>
                                )}
                                {isCustomer && step === 3 && (
                                    <FormSection title="Review Customer Isi Form" description="Periksa data sebelum mengirimkan kepada Tenancy untuk diperiksa.">
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                            <ReviewRow label="Perusahaan" value={data.customer_company_name} />
                                            <ReviewRow label="PIC" value={data.customer_pic_name} />
                                            <ReviewRow label="Tenant terkait" value={tenantName || '—'} />
                                            <ReviewRow label="Tagihan" value={data.customer_billing_description} />
                                            <ReviewRow label="Nominal di luar PPN" value={Number(data.customer_amount || 0).toLocaleString('id-ID')} />
                                            <ReviewRow label="Tanggal" value={data.customer_request_date} />
                                        </dl>
                                        <p className="text-xs text-gray-500 mt-4">Nomor surat dibuat otomatis. Alur persetujuan: Tenancy.</p>
                                    </FormSection>
                                )}
                                {isParkir && step === 2 && (
                                    <FormSection title="Pemohon" description="Data pemohon dan penanggung jawab">
                                        <FormField label="Tanggal Pengajuan" error={clientErrors.request_date || errors.request_date} required>
                                            <DateInput value={data.request_date} onChange={(e) => setData('request_date', e.target.value)} />
                                        </FormField>
                                        <FormField label="Nama Penanggung Jawab" error={clientErrors.pic_name || errors.pic_name} required>
                                            <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} autoComplete="name" placeholder="Nama lengkap penanggung jawab" />
                                        </FormField>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Nama Pemohon" error={clientErrors.applicant_name || errors.applicant_name} required>
                                                <TextInput value={data.applicant_name} onChange={(e) => setData('applicant_name', e.target.value)} autoComplete="name" placeholder="Nama lengkap pemohon" />
                                            </FormField>
                                            <FormField label="Jabatan" error={clientErrors.applicant_position || errors.applicant_position} required>
                                                <TextInput value={data.applicant_position} onChange={(e) => setData('applicant_position', e.target.value)} placeholder="cth. Store Manager" />
                                            </FormField>
                                        </div>
                                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                                            Nomor surat dibuat otomatis saat diajukan ({nomorHint}). Alur approval: Supervisor Tenant › Manager Cabang.
                                        </p>
                                    </FormSection>
                                )}
                                {isParkir && step === 3 && (
                                    <>
                                        <FormSection title="Tenant & Kendaraan" action={<UbahButton step={1} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Kategori" value={<Badge color="blue">Parkir</Badge>} />
                                                <ReviewRow label="Tenant" value={tenantName ?? '—'} />
                                                <ReviewRow label="Unit" value={tenantUnit ?? '—'} />
                                                <ReviewRow label="NOPOL" value={data.vehicle_plate || '—'} />
                                                <ReviewRow label="Jenis Kendaraan" value={data.vehicle_type === 'motor' ? 'MOTOR (R2)' : data.vehicle_type === 'mobil' ? 'MOBIL (R4)' : '—'} />
                                            </dl>
                                        </FormSection>
                                        <FormSection title="Pemohon" action={<UbahButton step={2} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Nomor Surat" value={`Otomatis saat diajukan (${nomorHint})`} />
                                                <ReviewRow label="Tanggal Pengajuan" value={data.request_date || '—'} />
                                                <ReviewRow label="Penanggung Jawab" value={data.pic_name || '—'} />
                                                <ReviewRow label="Nama Pemohon" value={data.applicant_name || '—'} />
                                                <ReviewRow label="Jabatan" value={data.applicant_position || '—'} />
                                            </dl>
                                            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                                                Periksa kembali data di atas. Setelah diajukan, form parkir diproses Supervisor Tenant › Manager Cabang.
                                            </p>
                                        </FormSection>
                                    </>
                                )}
                                {isKegiatan && step === 1 && (
                                    <FormSection title="Tenant & Kegiatan" description="Unit terisi otomatis dari master tenant">
                                        <div className="mb-4">
                                            <Badge color="green">Kegiatan — terkunci</Badge>
                                        </div>
                                        <FormField label="Pilih Tenant" error={clientErrors.tenant_id || errors.tenant_id} required>
                                            <SearchableSelect
                                                value={data.tenant_id}
                                                onChange={(e) => setData('tenant_id', e.target.value)}
                                                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                placeholder="Ketik untuk cari tenant..."
                                                error={clientErrors.tenant_id || errors.tenant_id}
                                            />
                                        </FormField>
                                        <FormField label="Unit (otomatis dari master)">
                                            <TextInput value={tenantUnit ?? ''} placeholder="Pilih tenant untuk melihat unit" readOnly disabled />
                                        </FormField>
                                        <FormField label="Jenis Kegiatan" error={clientErrors.kegiatan_type || errors.kegiatan_type} required>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
                                                {KEGIATAN_TYPES.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setData('kegiatan_type', type.value)}
                                                        aria-pressed={data.kegiatan_type === type.value}
                                                        className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                            data.kegiatan_type === type.value
                                                                ? 'border-[#0F1E36] bg-[#0F1E36]/5 shadow-sm'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <span className={`text-sm font-semibold ${data.kegiatan_type === type.value ? 'text-[#0F1E36]' : 'text-gray-700'}`}>{type.label}</span>
                                                        <span className="text-[11px] text-gray-400">Nomor otomatis {type.code}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </FormField>
                                        <FormField label={kegiatanMeta?.nameLabel ?? 'Nama Kegiatan'} error={clientErrors.event_name || errors.event_name} required>
                                            <TextInput value={data.event_name} onChange={(e) => setData('event_name', e.target.value)} placeholder={kegiatanMeta?.namePlaceholder ?? 'cth. Nama kegiatan'} />
                                        </FormField>
                                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                                            Nomor surat dibuat otomatis saat diajukan ({nomorHint}).
                                        </p>
                                    </FormSection>
                                )}
                                {isKegiatan && step === 2 && (
                                    <FormSection title="Jadwal & Area" description="Waktu dan lokasi pelaksanaan kegiatan">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Tanggal Mulai" error={clientErrors.work_start_date || errors.work_start_date} required>
                                                <DateInput value={data.work_start_date} onChange={(e) => setData('work_start_date', e.target.value)} />
                                            </FormField>
                                            <FormField label="Tanggal Selesai" error={clientErrors.work_end_date || errors.work_end_date} required>
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
                                        <FormField label="Area Event" error={clientErrors.event_area || errors.event_area} required hint="cth. Atrium utama lantai GF">
                                            <TextInput value={data.event_area} onChange={(e) => setData('event_area', e.target.value)} placeholder="cth. Atrium utama lantai GF" />
                                        </FormField>
                                        <FormField label="Penanggung Jawab" error={clientErrors.pic_name || errors.pic_name} required>
                                            <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} autoComplete="name" placeholder="Nama lengkap penanggung jawab" />
                                        </FormField>
                                        <FormField label="Keterangan" error={errors.notes}>
                                            <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                                        </FormField>
                                    </FormSection>
                                )}
                                {isKegiatan && step === 3 && (
                                    <>
                                        <FormSection title="Tenant & Kegiatan" description="Kategori: Kegiatan" action={<UbahButton step={1} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Kategori" value={<Badge color="green">Kegiatan</Badge>} />
                                                <ReviewRow label="Jenis" value={kegiatanMeta ? `${kegiatanMeta.label} (${kegiatanMeta.code})` : '—'} />
                                                <ReviewRow label="Tenant" value={tenantName ?? '—'} />
                                                <ReviewRow label="Unit" value={tenantUnit ?? '—'} />
                                                <ReviewRow label={kegiatanMeta?.nameLabel ?? 'Nama Kegiatan'} value={data.event_name || '—'} className="sm:col-span-2" />
                                            </dl>
                                        </FormSection>
                                        <FormSection title="Jadwal & Area" action={<UbahButton step={2} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Nomor Surat" value={`Otomatis saat diajukan (${nomorHint})`} />
                                                <ReviewRow label="Tanggal" value={formatDateRange(data.work_start_date, data.work_end_date)} />
                                                <ReviewRow label="Jam" value={formatTimeRange(data.work_start_time, data.work_end_time)} />
                                                <ReviewRow label="Area Event" value={data.event_area || '—'} />
                                                <ReviewRow label="Penanggung Jawab" value={data.pic_name || '—'} />
                                                <ReviewRow label="Keterangan" value={data.notes || '—'} className="sm:col-span-2" />
                                            </dl>
                                            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                                                Periksa kembali data di atas. Setelah diajukan, surat izin kegiatan diproses Tenancy › Manager Tenant.
                                            </p>
                                        </FormSection>
                                    </>
                                )}
                                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && step === 1 && (
                                    <>
                                    <FormSection title="Kategori">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                            {[
                                                {
                                                    value: 'tenant',
                                                    label: 'Tenant',
                                                    desc: 'Izin atas nama tenant terdaftar di mall',
                                                    icon: (
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    ),
                                                },
                                                {
                                                    value: 'vendor',
                                                    label: 'Vendor',
                                                    desc: 'Kontraktor / perusahaan eksternal',
                                                    icon: (
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0M1 7h12v8H1zM13 10h5l3 3v2h-8z" />
                                                    ),
                                                },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => selectLocationType(opt.value)}
                                                    aria-pressed={locationType === opt.value}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                        locationType === opt.value
                                                            ? 'border-[#0F1E36] bg-[#0F1E36]/5 shadow-sm'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${locationType === opt.value ? 'bg-[#0F1E36] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                                            {opt.icon}
                                                        </svg>
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className={`block text-sm font-semibold ${locationType === opt.value ? 'text-[#0F1E36]' : 'text-gray-700'}`}>{opt.label}</span>
                                                        <span className="block text-xs text-gray-400 truncate">{opt.desc}</span>
                                                    </span>
                                                    {locationType === opt.value && (
                                                        <span className="ml-auto w-5 h-5 shrink-0 rounded-full bg-[#1FA24C] text-white flex items-center justify-center" aria-hidden="true">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {locationType === 'tenant' && (
                                            <FormField label="Pilih Tenant" error={clientErrors.tenant_id} required>
                                                <SearchableSelect
                                                    value={data.tenant_id}
                                                    onChange={(e) => setData('tenant_id', e.target.value)}
                                                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                    placeholder="Ketik untuk cari tenant..."
                                                    error={clientErrors.tenant_id}
                                                />
                                            </FormField>
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
                                    <FormSection title="Detail Permohonan">
                                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
                                            Nomor surat dibuat otomatis saat diajukan ({nomorHint}).
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Nama Penanggung Jawab" error={errors.pic_name}>
                                                <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} autoComplete="name" placeholder="Nama lengkap PIC" />
                                            </FormField>
                                            <FormField label="Telepon PIC" error={errors.pic_phone}>
                                                <TextInput type="tel" value={data.pic_phone} onChange={(e) => setData('pic_phone', e.target.value)} autoComplete="tel" inputMode="tel" placeholder="cth. 0812xxxxxxx" />
                                            </FormField>
                                        </div>
                                    </FormSection>
                                    </>
                                )}

                                {isMarketingLocked && step === 2 && (
                                    <FormSection title="Jadwal Pameran" description="Periode pelaksanaan + jam bongkar muat">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Periode Mulai" error={clientErrors.work_start_date || errors.work_start_date} required>
                                                <DateInput value={data.work_start_date} onChange={(e) => setData('work_start_date', e.target.value)} />
                                            </FormField>
                                            <FormField label="Periode Selesai" error={clientErrors.work_end_date || errors.work_end_date} required>
                                                <DateInput value={data.work_end_date} onChange={(e) => setData('work_end_date', e.target.value)} />
                                            </FormField>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Jam Masuk Barang" error={errors.work_start_time} required>
                                                <TimeInput value={data.work_start_time} onChange={(e) => setData('work_start_time', e.target.value)} />
                                            </FormField>
                                            <FormField label="Jam Keluar Barang" error={errors.work_end_time} required>
                                                <TimeInput value={data.work_end_time} onChange={(e) => setData('work_end_time', e.target.value)} />
                                            </FormField>
                                        </div>
                                        <FormField label="Akses Masuk / Keluar" error={errors.access_route} hint="cth. Loading dock barat via koridor LG">
                                            <Textarea value={data.access_route} onChange={(e) => setData('access_route', e.target.value)} rows={2} />
                                        </FormField>
                                    </FormSection>
                                )}
                                {/* STEP 2 — Jadwal & Kegiatan */}
                                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && step === 2 && (
                                    <FormSection title="Jadwal & Kegiatan">
                                        <FormField label="Jenis Kegiatan" error={clientErrors.activity_types} required>
                                            <div className="space-y-4 mt-1">
                                                {activityGroups.map((group) => {
                                                    const picked = group.items.filter((t) => data.activity_types.includes(t.value)).length;
                                                    return (
                                                        <div key={group.label}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
                                                                {picked > 0 && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#0F1E36]/5 text-[#0F1E36] tabular-nums">
                                                                        {picked} dipilih
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                {group.items.map((type) => (
                                                                    <Checkbox
                                                                        key={type.value}
                                                                        label={type.label}
                                                                        checked={data.activity_types.includes(type.value)}
                                                                        onChange={() => toggleActivityType(type.value)}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {group.label === 'Proyek' && (
                                                                <p className="text-[11px] text-gray-400 mt-2">Fit Out dan Pull Out hanya bisa dipilih salah satu.</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </FormField>

                                        <FormField label="Jenis Pekerjaan" error={errors.job_type}>
                                            <TextInput value={data.job_type} onChange={(e) => setData('job_type', e.target.value)} />
                                        </FormField>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Tanggal Mulai" error={clientErrors.work_start_date} required>
                                                <DateInput value={data.work_start_date} onChange={(e) => handleWorkStartDateChange(e.target.value)} />
                                            </FormField>
                                            <FormField label="Tanggal Selesai" error={clientErrors.work_end_date} hint="Maksimal 7 hari dari tanggal mulai." required>
                                                <DateInput
                                                    value={data.work_end_date}
                                                    minDate={data.work_start_date || undefined}
                                                    maxDate={maxPermitEndDate(data.work_start_date)}
                                                    onChange={(e) => setData('work_end_date', e.target.value)}
                                                />
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

                                {isMarketingLocked && step === 3 && (
                                    <FormSection title="Barang Pameran" description="Pisah berat untuk cek loading dock security">
                                        {[
                                            { key: 'goods_light', title: 'Barang di bawah 100 kg' },
                                            { key: 'goods_heavy', title: 'Barang di atas 100 kg' },
                                        ].map(({ key, title }) => (
                                            <div key={key} className="mb-5 last:mb-0">
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
                                                {data[key].map((good, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2">
                                                        <TextInput
                                                            value={good.description}
                                                            onChange={(e) => updateExhibitionGood(key, idx, 'description', e.target.value)}
                                                            placeholder="Nama barang"
                                                            className="flex-1"
                                                        />
                                                        <div className="flex gap-2">
                                                            <TextInput
                                                                value={good.quantity_note}
                                                                onChange={(e) => updateExhibitionGood(key, idx, 'quantity_note', e.target.value)}
                                                                placeholder="Jumlah"
                                                                className="w-20 flex-1 sm:flex-none"
                                                            />
                                                            <TextInput
                                                                value={good.unit}
                                                                onChange={(e) => updateExhibitionGood(key, idx, 'unit', e.target.value)}
                                                                placeholder="Satuan"
                                                                className="w-20 flex-1 sm:flex-none"
                                                            />
                                                            {data[key].length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeExhibitionGood(key, idx)}
                                                                    aria-label={`Hapus barang ${idx + 1}`}
                                                                    className="w-11 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-400 min-h-[44px] flex items-center justify-center"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-2-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="secondary" onClick={() => addExhibitionGood(key)} className="text-xs mt-1">+ Tambah Barang</Button>
                                            </div>
                                        ))}
                                    </FormSection>
                                )}
                                {/* STEP 3 — Pekerja & Barang */}
                                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && step === 3 && (
                                    <FormSection title="Pekerja & Barang">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pekerja</h3>
                                                <FormField label="Jumlah Orang" error={clientErrors.worker_count} required hint="Cukup jumlahnya — daftar nama tidak perlu. Foto KTP diisi Security saat cek fisik.">
                                                    <div className="flex items-stretch gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setData('worker_count', String(Math.max(0, (parseInt(data.worker_count, 10) || 0) - 1) || ''))}
                                                            aria-label="Kurangi jumlah pekerja"
                                                            className="w-11 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-semibold text-gray-600 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#0F1E36] min-h-[44px]"
                                                        >
                                                            −
                                                        </button>
                                                        <TextInput
                                                            type="number"
                                                            min={1}
                                                            value={data.worker_count}
                                                            onChange={(e) => setData('worker_count', e.target.value)}
                                                            placeholder="cth. 5"
                                                            className="text-center tabular-nums"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setData('worker_count', String((parseInt(data.worker_count, 10) || 0) + 1))}
                                                            aria-label="Tambah jumlah pekerja"
                                                            className="w-11 shrink-0 rounded-lg border border-gray-300 bg-white text-lg font-semibold text-gray-600 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#0F1E36] min-h-[44px]"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </FormField>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Daftar Barang / Peralatan</h3>
                                                {data.goods.map((good, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-2">
                                                        <TextInput
                                                            value={good.description}
                                                            onChange={(e) => updateGood(idx, 'description', e.target.value)}
                                                            placeholder="Nama barang"
                                                            className="flex-1"
                                                        />
                                                        <div className="flex gap-2">
                                                            <TextInput
                                                                value={good.quantity_note}
                                                                onChange={(e) => updateGood(idx, 'quantity_note', e.target.value)}
                                                                placeholder="Jumlah"
                                                                className="w-20 flex-1 sm:flex-none"
                                                            />
                                                            <TextInput
                                                                value={good.unit}
                                                                onChange={(e) => updateGood(idx, 'unit', e.target.value)}
                                                                placeholder="Satuan"
                                                                className="w-20 flex-1 sm:flex-none"
                                                            />
                                                            {data.goods.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeGood(idx)}
                                                                    aria-label={`Hapus barang ${idx + 1}`}
                                                                    className="w-11 shrink-0 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-400 min-h-[44px] flex items-center justify-center"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-2-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="secondary" onClick={addGood} className="text-xs mt-1">+ Tambah Barang</Button>
                                            </div>
                                        </div>
                                    </FormSection>
                                )}

                                {isMarketingLocked && step === 4 && (
                                    <>
                                        <FormSection title="Penanggung Jawab" description="PIC penyewa pameran">
                                            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
                                                Nomor surat dibuat otomatis saat diajukan (kode E&P).
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField label="Nama Penanggung Jawab" error={clientErrors.pic_name || errors.pic_name} required>
                                                    <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} />
                                                </FormField>
                                                <FormField label="No. Telepon" error={clientErrors.pic_phone || errors.pic_phone} required>
                                                    <TextInput value={data.pic_phone} onChange={(e) => setData('pic_phone', e.target.value)} />
                                                </FormField>
                                            </div>
                                        </FormSection>
                                        <FormSection title="Keterangan">
                                            <FormField label="Keterangan Tambahan" error={errors.notes}>
                                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                                            </FormField>
                                        </FormSection>
                                    </>
                                )}
                                {isMarketingLocked && step === 5 && (
                                    <>
                                        <FormSection title="Tenant & Stand" description="Kategori: Pameran / Open Counter" action={<UbahButton step={1} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Kategori" value={<Badge color="blue">Pameran / Open Counter</Badge>} />
                                                <ReviewRow label="Tenant" value={tenantName ?? '—'} />
                                                <ReviewRow label="Nama Stand" value={data.stand_name || '—'} />
                                                <ReviewRow label="Lokasi Stand" value={[data.floor_snapshot, data.block_snapshot, data.unit_number_snapshot].filter(Boolean).join(' / ') || '—'} />
                                            </dl>
                                        </FormSection>
                                        <FormSection title="Jadwal Pameran" action={<UbahButton step={2} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                            <ReviewRow label="Periode Pelaksanaan" value={formatDateRange(data.work_start_date, data.work_end_date)} />
                                                <ReviewRow label="Jam Masuk — Keluar Barang" value={formatTimeRange(data.work_start_time, data.work_end_time)} />
                                                <ReviewRow label="Akses Masuk / Keluar" value={data.access_route || '—'} className="sm:col-span-2" />
                                            </dl>
                                        </FormSection>
                                        <FormSection title={`Barang (${goodNames.length})`} action={<UbahButton step={3} onJump={goToStep} />}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Di bawah 100 kg ({lightNames.length})</h3>
                                                    {lightNames.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1 text-gray-900 font-medium">
                                                            {lightNames.map((n, i) => <li key={`${n}-${i}`} className="truncate">{n}</li>)}
                                                        </ul>
                                                    ) : <p className="text-gray-400">Tidak ada.</p>}
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Di atas 100 kg ({heavyNames.length})</h3>
                                                    {heavyNames.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1 text-gray-900 font-medium">
                                                            {heavyNames.map((n, i) => <li key={`${n}-${i}`} className="truncate">{n}</li>)}
                                                        </ul>
                                                    ) : <p className="text-gray-400">Tidak ada.</p>}
                                                </div>
                                            </div>
                                        </FormSection>
                                        <FormSection title="Penanggung Jawab & Nomor" action={<UbahButton step={4} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Nomor Surat" value="Otomatis saat diajukan (E&P)" />
                                                <ReviewRow label="Penanggung Jawab" value={[data.pic_name, data.pic_phone].filter(Boolean).join(' — ') || '—'} />
                                                <ReviewRow label="Keterangan" value={data.notes || '—'} className="sm:col-span-2" />
                                            </dl>
                                            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                                                Periksa kembali data di atas. Setelah diajukan, izin pameran diproses Marketing › Keuangan › Building Service › cek fisik Security.
                                            </p>
                                        </FormSection>
                                    </>
                                )}
                                {/* STEP 4 — Pelengkap */}
                                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && step === 4 && (
                                    <>
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
                                        <MultiSelect
                                            value={data.accompanying_department_ids}
                                            onChange={(ids) => setData('accompanying_department_ids', ids)}
                                            options={departments.map((d) => ({ value: d.id, label: d.name }))}
                                            placeholder="Pilih departemen pendamping..."
                                        />
                                    </FormSection>

                                    <FormSection title="Persetujuan Manager Tenant">
                                        <button
                                            type="button"
                                            onClick={() => setData('needs_manager_approval', !data.needs_manager_approval)}
                                            aria-pressed={!!data.needs_manager_approval}
                                            className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                data.needs_manager_approval
                                                    ? 'border-[#0F1E36] bg-[#0F1E36]/5 shadow-sm'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors
                                                    ${data.needs_manager_approval ? 'bg-[#0F1E36] border-[#0F1E36] text-white' : 'bg-white border-gray-300'}`}
                                            >
                                                {data.needs_manager_approval && (
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-gray-900">Butuh persetujuan Manager Tenant</span>
                                                <span className="block text-xs text-gray-500 mt-1 leading-relaxed">
                                                    {data.needs_manager_approval
                                                        ? 'Aktif — alur menjadi Tenancy → Manager Tenant → Building Service → Security.'
                                                        : 'Alur standar: Tenancy → Building Service → Security. Ketuk untuk mengaktifkan.'}
                                                </span>
                                            </span>
                                        </button>
                                    </FormSection>

                                    <FormSection title="Catatan">
                                        <FormField label="Keterangan Tambahan" error={errors.notes}>
                                            <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                                        </FormField>
                                    </FormSection>
                                    </>
                                )}

                                {/* STEP 5 — Review */}
                                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && step === 5 && (
                                    <>
                                        <FormSection title="Lokasi" description={`Kategori: ${categoryLabel}`} action={<UbahButton step={1} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Kategori" value={<Badge color="blue">{categoryLabel}</Badge>} />
                                                <ReviewRow label="Lokasi / Nama" value={locationDetail} />
                                                {locationType === 'vendor' && (
                                                    <>
                                                        <ReviewRow label="Penanggung Jawab" value={data.contractor_pic || '—'} />
                                                        <ReviewRow label="Telepon" value={data.contractor_phone || '—'} />
                                                        <ReviewRow label="Alamat" value={data.contractor_address || '—'} className="sm:col-span-2" />
                                                    </>
                                                )}
                                            </dl>
                                        </FormSection>

                                        <FormSection title="Jadwal & Kegiatan" action={<UbahButton step={2} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                            <ReviewRow
                                                label="Jenis Kegiatan"
                                                        value={activityLabels.length > 0
                                                        ? <span className="flex flex-wrap gap-1.5">{activityLabels.map((l) => <Badge key={l} color="blue">{l}</Badge>)}</span>
                                                        : '—'}
                                                    className="sm:col-span-2"
                                                />
                                                <ReviewRow label="Jenis Pekerjaan" value={data.job_type || '—'} className="sm:col-span-2" />
                                                <ReviewRow label="Tanggal" value={formatDateRange(data.work_start_date, data.work_end_date)} />
                                                <ReviewRow label="Jam" value={formatTimeRange(data.work_start_time, data.work_end_time)} />
                                                <ReviewRow label="Akses Masuk/Keluar" value={data.access_route || '—'} className="sm:col-span-2" />
                                            </dl>
                                        </FormSection>

                                        <FormSection title={`Pekerja & Barang (${goodNames.length})`} action={<UbahButton step={3} onJump={goToStep} />}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pekerja</h3>
                                                    {workerCount > 0 ? (
                                                        <p className="text-gray-900 font-medium tabular-nums">{workerCount} orang</p>
                                                    ) : <p className="text-gray-400">Belum diisi.</p>}
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Barang</h3>
                                                    {goodNames.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1 text-gray-900 font-medium">
                                                            {goodNames.map((n, i) => <li key={`${n}-${i}`} className="truncate">{n}</li>)}
                                                        </ul>
                                                    ) : <p className="text-gray-400">Tidak ada barang.</p>}
                                                </div>
                                            </div>
                                        </FormSection>

                                        <FormSection title="Detail Pengajuan" action={<UbahButton step={4} onJump={goToStep} />}>
                                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                <ReviewRow label="Nomor Surat" value="Otomatis saat diajukan" />
                                                <ReviewRow label="Penanggung Jawab" value={[data.pic_name, data.pic_phone].filter(Boolean).join(' — ') || '—'} />
                                                <ReviewRow label="Persetujuan Manager" value={data.needs_manager_approval ? 'Ya — Tenancy → Manager Tenant → BS → Security' : 'Tidak'} />
                                                {locationType !== 'vendor' && data.is_external && (
                                                    <>
                                                        <ReviewRow label="Vendor Eksternal" value={data.contractor_company || 'Ya'} className="sm:col-span-2" />
                                                        <ReviewRow label="PIC Vendor" value={[data.contractor_pic, data.contractor_phone].filter(Boolean).join(' — ') || '—'} />
                                                        <ReviewRow label="Alamat Vendor" value={data.contractor_address || '—'} />
                                                    </>
                                                )}
                                                <ReviewRow
                                                    label="Pendampingan"
                                                    value={deptNames.length > 0
                                                        ? <span className="flex flex-wrap gap-1.5">{deptNames.map((n) => <Badge key={n} color="gray">{n}</Badge>)}</span>
                                                        : 'Tidak ada'}
                                                    className="sm:col-span-2"
                                                />
                                                <ReviewRow label="Catatan" value={data.notes || '—'} className="sm:col-span-2" />
                                            </dl>
                                            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
                                                Periksa kembali data di atas. Setelah diajukan, surat izin akan diproses melalui persetujuan Tenancy, Building Service, dan pengecekan fisik Security.
                                            </p>
                                        </FormSection>
                                    </>
                                )}
                            </StepPanel>

                            {/* Navigasi step */}
                            <div className="sticky bottom-4 z-10 mt-4 rounded-full border border-[#E2E5EA] bg-white/95 py-2 pl-4 pr-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg shadow-gray-900/5 backdrop-blur sm:pl-5 lg:static lg:rounded-xl lg:px-4 lg:shadow-none">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <p className="text-xs tabular-nums text-gray-500">
                                        <span className="font-semibold text-gray-900">{step}</span>
                                        <span aria-hidden="true"> / </span>
                                        <span className="sr-only">dari</span>
                                        {steps.length}
                                    </p>
                                    <span aria-hidden="true" className="h-4 w-px bg-gray-200" />
                                    {step > 1 && (
                                        <Button type="button" variant="ghost" onClick={goBack} className="min-h-[44px] px-4">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span className="hidden sm:inline">Kembali</span>
                                        </Button>
                                    )}
                                    <div className="flex-1" />
                                    {step < steps.length ? (
                                        <Button type="button" onClick={goNext} className="min-h-[44px] rounded-full lg:rounded-lg">
                                            Lanjut
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Button>
                                    ) : (
                                        <Button type="button" disabled={processing} onClick={handleAjukan} className="min-h-[44px] rounded-full lg:rounded-lg">
                                            {processing ? 'Mengirim...' : 'Ajukan Surat Izin'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Kolom kanan — ringkasan hidup, sticky */}
                        <div className="min-w-0 lg:sticky lg:top-20">
                            <LiveSummary
                                data={data}
                                locationType={locationType}
                                tenants={tenants}
                                currentStep={step}
                                isMarketingLocked={isMarketingLocked}
                                isKegiatan={isKegiatan}
                                isParkir={isParkir}
                                isCustomer={isCustomer}
                                nomorHint={nomorHint}
                                kegiatanMeta={kegiatanMeta}
                            />
                        </div>
                    </div>
                </form>

                <ConfirmModal
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={confirmAjukan}
                    loading={processing}
                >
                    <ConfirmRow label="Kategori" value={categoryLabel} />
                    <ConfirmRow label="Lokasi" value={locationDetail} />
                    {isKegiatan && <ConfirmRow label="Kegiatan" value={kegiatanMeta ? `${kegiatanMeta.label} — ${data.event_name}` : null} />}
                     <ConfirmRow label="Nomor" value={isMarketingLocked ? 'Otomatis (E&P)' : isKegiatan ? `Otomatis (${nomorHint})` : (isParkir || isCustomer) ? 'Otomatis (kode TC)' : 'Otomatis saat diajukan'} />
                    {isCustomer ? (
                        <>
                            <ConfirmRow label="Perusahaan" value={data.customer_company_name} />
                            <ConfirmRow label="PIC" value={data.customer_pic_name} />
                            <ConfirmRow label="Keterangan Tagihan" value={data.customer_billing_description} />
                            <ConfirmRow label="Nominal di luar PPN" value={data.customer_amount} />
                        </>
                    ) : isParkir ? (
                        <>
                            <ConfirmRow label="NOPOL" value={data.vehicle_plate || null} />
                            <ConfirmRow label="Kendaraan" value={data.vehicle_type === 'motor' ? 'Motor (R2)' : data.vehicle_type === 'mobil' ? 'Mobil (R4)' : null} />
                            <ConfirmRow label="Pemohon" value={data.applicant_name || null} />
                            <ConfirmRow label="Jabatan" value={data.applicant_position || null} />
                            <ConfirmRow label="Penanggung Jawab" value={data.pic_name || null} />
                            <ConfirmRow label="Tanggal" value={data.request_date || null} />
                        </>
                    ) : (
                        <>
                            <ConfirmRow label="Jadwal" value={formatDateRange(data.work_start_date, data.work_end_date)} />
                            <ConfirmRow label="Jam" value={formatTimeRange(data.work_start_time, data.work_end_time)} />
                            {!isMarketingLocked && !isKegiatan && <ConfirmRow label="Pekerja" value={workerCount > 0 ? `${workerCount} orang` : null} />}
                            {!isKegiatan && <ConfirmRow label="Barang" value={goodNames.length > 0 ? `${goodNames.length} item` : null} />}
                            {!isMarketingLocked && !isKegiatan && data.needs_manager_approval && <ConfirmRow label="Manager Tenant" value="Butuh persetujuan" />}
                            {isKegiatan && <ConfirmRow label="Area" value={data.event_area || null} />}
                            {isKegiatan && <ConfirmRow label="Penanggung Jawab" value={data.pic_name || null} />}
                        </>
                    )}
                    <ConfirmRow
                        label="Alur Persetujuan"
                        value={(isMarketingLocked
                            ? ['Marketing', 'Keuangan', 'Building Service', 'Security']
                            : isCustomer
                            ? ['Tenancy']
                            : isParkir
                            ? ['Supervisor Tenant', 'Manager Cabang']
                            : isKegiatan
                            ? ['Tenancy', 'Manager Tenant']
                            : ['Tenancy', ...(data.needs_manager_approval ? ['Manager Tenant'] : []), 'Building Service', 'Security']
                        ).join(' → ')}
                    />
                </ConfirmModal>
            </div>
        </AppLayout>
    );
}

function LiveSummary({ data, locationType, tenants, currentStep, isMarketingLocked = false, isKegiatan = false, isParkir = false, isCustomer = false, nomorHint = 'Otomatis', kegiatanMeta = null }) {
    const selected = tenants.find((t) => t.id == data.tenant_id) ?? null;
    const tenantName = selected?.name ?? null;
    const tenantUnit = selected
        ? [selected.floor, selected.block, selected.unit_number].filter(Boolean).join(' / ') || null
        : null;
    const locationLabel = isMarketingLocked
        ? [tenantName, data.stand_name].filter(Boolean).join(' — ') || null
        : (isKegiatan || isParkir || isCustomer)
        ? [tenantName, tenantUnit].filter(Boolean).join(' — ') || null
        : locationType === 'tenant'
        ? tenantName
        : data.contractor_company ? `Vendor — ${data.contractor_company}` : null;

    const activityCount = data.activity_types.length;
    const workerCount = parseInt(data.worker_count, 10) || 0;
    const goodsCount = isMarketingLocked
        ? [...data.goods_light, ...data.goods_heavy].filter((g) => g.description).length
        : data.goods.filter((g) => g.description).length;
    const deptCount = data.accompanying_department_ids.length;

    return (
        <div className="rounded-xl border border-[#E2E5EA] bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Ringkasan Pengajuan</h2>
                <Badge color="blue" size="sm">Langkah {currentStep}</Badge>
            </div>

            <div className="space-y-2.5">
                <SummaryItem
                    label="Kategori"
                    value={isMarketingLocked ? 'Pameran / Open Counter' : isKegiatan ? 'Kegiatan' : isParkir ? 'Parkir' : isCustomer ? 'Customer Isi Form' : locationType === 'tenant' ? 'Tenant' : 'Vendor'}
                    filled
                />
                <SummaryItem label={isMarketingLocked ? 'Tenant / Stand' : (isKegiatan || isParkir || isCustomer) ? 'Tenant / Unit' : 'Lokasi/Nama'} value={locationLabel} filled={!!locationLabel} />
                {isKegiatan && (
                    <SummaryItem
                        label="Jenis"
                        value={kegiatanMeta ? `${kegiatanMeta.label} (${kegiatanMeta.code})` : null}
                        filled={!!kegiatanMeta}
                    />
                )}
                <SummaryItem
                    label="Nomor Surat"
                    value={isMarketingLocked ? 'Otomatis (E&P)' : (isKegiatan || isParkir || isCustomer) ? `Otomatis (${nomorHint})` : 'Otomatis'}
                    filled
                />
                {isParkir && (
                    <>
                        <SummaryItem label="NOPOL" value={data.vehicle_plate?.trim() || null} filled={!!data.vehicle_plate?.trim()} />
                        <SummaryItem
                            label="Kendaraan"
                            value={data.vehicle_type === 'motor' ? 'Motor (R2)' : data.vehicle_type === 'mobil' ? 'Mobil (R4)' : null}
                            filled={!!data.vehicle_type}
                            dim={currentStep < 1}
                        />
                        <SummaryItem label="Pemohon" value={data.applicant_name?.trim() || null} filled={!!data.applicant_name?.trim()} dim={currentStep < 2} />
                        <SummaryItem label="Jabatan" value={data.applicant_position?.trim() || null} filled={!!data.applicant_position?.trim()} dim={currentStep < 2} />
                        <SummaryItem label="Approval" value="Supervisor Tenant › Manager Cabang" filled />
                    </>
                )}
                {isCustomer && (
                    <>
                        <SummaryItem label="Perusahaan" value={data.customer_company_name} filled={!!data.customer_company_name} dim={currentStep < 1} />
                        <SummaryItem label="PIC" value={data.customer_pic_name} filled={!!data.customer_pic_name} dim={currentStep < 2} />
                        <SummaryItem label="Tanggal" value={data.customer_request_date} filled={!!data.customer_request_date} dim={currentStep < 2} />
                        <SummaryItem label="Approval" value="Tenancy" filled />
                    </>
                )}
                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && (
                    <SummaryItem
                        label="Jenis Kegiatan"
                        value={activityCount > 0 ? `${activityCount} dipilih` : null}
                        filled={activityCount > 0}
                        dim={currentStep < 2}
                    />
                )}
                {!isParkir && !isCustomer && (
                    <SummaryItem
                        label={isMarketingLocked ? 'Periode' : 'Jadwal'}
                        value={data.work_start_date ? formatDateRange(data.work_start_date, data.work_end_date || '') : null}
                        filled={!!data.work_start_date}
                        dim={currentStep < 2}
                    />
                )}
                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && (
                    <SummaryItem
                        label="Pekerja"
                        value={workerCount > 0 ? `${workerCount} orang` : null}
                        filled={workerCount > 0}
                        dim={currentStep < 3}
                    />
                )}
                {!isKegiatan && !isParkir && !isCustomer && (
                <SummaryItem
                    label="Barang"
                    value={goodsCount > 0 ? `${goodsCount} item` : null}
                    filled={goodsCount > 0}
                    dim={currentStep < 3}
                />
                )}
                {isKegiatan && (
                    <SummaryItem
                        label="Area"
                        value={data.event_area?.trim() || null}
                        filled={!!data.event_area?.trim()}
                        dim={currentStep < 2}
                    />
                )}
                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && (
                    <SummaryItem
                        label="Pendampingan"
                        value={deptCount > 0 ? `${deptCount} departemen` : 'Tidak ada'}
                        filled
                        dim={currentStep < 4}
                    />
                )}
                {!isMarketingLocked && !isKegiatan && !isParkir && !isCustomer && (
                    <SummaryItem
                        label="Manager Tenant"
                        value={data.needs_manager_approval ? 'Ya, butuh persetujuan' : 'Tidak perlu'}
                        filled={!!data.needs_manager_approval}
                        dim={currentStep < 4}
                    />
                )}
                {isKegiatan && (
                    <SummaryItem
                        label="Approval"
                        value="Tenancy › Manager Tenant"
                        filled
                    />
                )}
            </div>

            <div className="mt-4 border-t border-[#E2E5EA] pt-3">
                <p className="text-[11px] leading-relaxed text-gray-500">
                    Panel ini otomatis terisi sesuai data yang kamu masukkan di tiap langkah.
                </p>
            </div>
        </div>
    );
}

function SummaryItem({ label, value, filled, dim = false }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
                <span
                    aria-hidden="true"
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${filled ? 'bg-[#0F1E36]/10 text-[#0F1E36]' : 'bg-gray-100 text-transparent'}`}
                >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
                {label}
            </span>
            <span className={`text-right text-xs ${filled ? 'font-medium text-gray-900' : 'text-gray-400 italic'}`}>
                {value || 'Belum diisi'}
            </span>
        </div>
    );
}

const ERROR_STEP_UMUM = {
    tenant_id: 1, store_name_snapshot: 1, contractor_company: 1, contractor_pic: 1,
    contractor_address: 1, contractor_phone: 1, pic_name: 1, pic_phone: 1,
    activity_types: 2, job_type: 2, work_start_date: 2, work_end_date: 2,
    work_start_time: 2, work_end_time: 2, access_route: 2,
    worker_count: 3, workers: 3, goods: 3,
    is_external: 4, accompanying_department_ids: 4, notes: 4, needs_manager_approval: 4,
};

const ERROR_STEP_PAMERAN = {
    tenant_id: 1, stand_name: 1, floor_snapshot: 1, block_snapshot: 1, unit_number_snapshot: 1,
    work_start_date: 2, work_end_date: 2, work_start_time: 2, work_end_time: 2, access_route: 2,
    goods_light: 3, goods_heavy: 3,
    pic_name: 4, pic_phone: 4, notes: 4,
};

const ERROR_STEP_KEGIATAN = {
    tenant_id: 1, kegiatan_type: 1, event_name: 1,
    work_start_date: 2, work_end_date: 2,
    work_start_time: 2, work_end_time: 2, event_area: 2, pic_name: 2, notes: 2,
};

const ERROR_STEP_PARKIR = {
    tenant_id: 1, vehicle_plate: 1, vehicle_type: 1,
    request_date: 2, pic_name: 2, applicant_name: 2, applicant_position: 2,
};

const ERROR_LABEL = {
    tenant_id: 'Tenant', store_name_snapshot: 'Nama lokasi', contractor_company: 'Perusahaan vendor',
    contractor_pic: 'PJ vendor', contractor_address: 'Alamat vendor', contractor_phone: 'Telp vendor',
    pic_name: 'Penanggung jawab', pic_phone: 'Telepon PIC', activity_types: 'Jenis kegiatan',
    job_type: 'Jenis pekerjaan', work_start_date: 'Tanggal mulai', work_end_date: 'Tanggal selesai',
    work_start_time: 'Jam mulai', work_end_time: 'Jam selesai', access_route: 'Akses',
    worker_count: 'Jumlah pekerja', workers: 'Pekerja', goods: 'Barang',
    goods_light: 'Barang ringan', goods_heavy: 'Barang berat', is_external: 'Vendor eksternal',
    accompanying_department_ids: 'Dept pendamping', notes: 'Catatan',
    needs_manager_approval: 'Persetujuan manager', stand_name: 'Nama stand',
    floor_snapshot: 'Lantai', block_snapshot: 'Blok', unit_number_snapshot: 'No. stand',
    kegiatan_type: 'Jenis kegiatan', event_name: 'Nama kegiatan', event_area: 'Area event',
    vehicle_plate: 'NOPOL', vehicle_type: 'Jenis kendaraan', request_date: 'Tanggal pengajuan',
    applicant_name: 'Nama pemohon', applicant_position: 'Jabatan pemohon',
};

function ErrorSummary({ errors, onJump, isMarketingLocked, isKegiatan = false, isParkir = false }) {
    const boxRef = useRef(null);

    useEffect(() => {
        boxRef.current?.focus();
        boxRef.current?.scrollIntoView({ block: 'nearest' });
    }, []);

    const map = isMarketingLocked ? ERROR_STEP_PAMERAN : isKegiatan ? ERROR_STEP_KEGIATAN : isParkir ? ERROR_STEP_PARKIR : ERROR_STEP_UMUM;
    const entries = Object.entries(errors);

    return (
        <div
            ref={boxRef}
            tabIndex={-1}
            role="alert"
            aria-label="Ringkasan kesalahan input"
            className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
            <p className="font-medium mb-1">Ada {entries.length} kesalahan input — ketuk untuk melompat:</p>
            <ul className="list-disc list-inside space-y-0.5">
                {entries.map(([key, message]) => {
                    const base = key.split('.')[0];
                    const step = map[base] ?? null;
                    const label = ERROR_LABEL[base] ?? base;
                    return (
                        <li key={key}>
                            {step ? (
                                <button
                                    type="button"
                                    onClick={() => onJump(step)}
                                    className="underline underline-offset-2 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-red-400 rounded"
                                >
                                    {label} (langkah {step}): {message}
                                </button>
                            ) : (
                                <span>{label}: {message}</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function ReviewRow({ label, value, className = '' }) {
    return (
        <div className={`flex flex-col gap-1 border-b border-gray-50 pb-3 ${className}`}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-gray-900 font-medium break-words">{value || '—'}</dd>
        </div>
    );
}

function UbahButton({ step, onJump }) {
    return (
        <button
            type="button"
            onClick={() => onJump(step)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F1E36] bg-[#0F1E36]/5 hover:bg-[#0F1E36]/10 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Ubah
        </button>
    );
}
