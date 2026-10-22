import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import GoodPhotoCapture from '@/Components/Security/GoodPhotoCapture';
import ReviseModal, { RevisionTimeline } from '@/Components/Permits/ReviseModal';
import FitoutStatementModal from '@/Components/Permits/FitoutStatementModal';
import DropdownMenu from '@/Components/DropdownMenu';
import { formatDateID, formatDateRange, formatDateTimeID, formatTimeRange } from '@/utils/format';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };
const statusColor = { pending: 'yellow', completed: 'green', approved: 'green', rejected: 'red', cancelled: 'gray' };
const statusLabel = { pending: 'Menunggu Persetujuan', completed: 'Selesai', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan' };
const approvalLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

export default function Show({ permit, can_revise, can_cancel, share, docFiles = {}, doc_files = {} }) {
    const activeDocFiles = docFiles && Object.keys(docFiles).length ? docFiles : doc_files;

    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');
    const [reviseOpen, setReviseOpen] = useState(false);
    const [fitoutModal, setFitoutModal] = useState(null);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'pekerja' | 'barang' | 'all'
    const [copied, setCopied] = useState(false);

    const approve = (approvalId) => router.post(`/approvals/${approvalId}/approve`, {}, { preserveScroll: true });

    const reject = (approvalId) => {
        if (!reason.trim()) {
            alert('Silakan cantumkan alasan penolakan secara jelas.');
            return;
        }
        router.post(`/approvals/${approvalId}/reject`, { reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectingId(null); setReason(''); },
        });
    };

    const [verifyingGoodId, setVerifyingGoodId] = useState(null);
    const [expandedGoodId, setExpandedGoodId] = useState(null);
    const [workers, setWorkers] = useState(permit.workers || []);
    const [goods, setGoods] = useState(permit.goods || []);
    const [pendingWorkers, setPendingWorkers] = useState([]);
    const expandedGood = goods.find((g) => g.id === expandedGoodId) ?? null;

    useEffect(() => { setWorkers(permit.workers || []); }, [permit.workers]);
    useEffect(() => {
        setGoods((prev) => (permit.goods || []).map((g) => {
            const local = prev.find((p) => p.id === g.id);
            if (local?.photo_url?.startsWith('blob:') && g.photo_url === local?.server_photo_url) return local;
            return g;
        }));
    }, [permit.goods]);

    const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ block: 'nearest' });

    const toggleWorker = (workerId) => {
        const prev = workers.find((w) => w.id === workerId);
        setWorkers((list) => list.map((w) => w.id === workerId ? { ...w, is_present: !w.is_present } : w));
        setPendingWorkers((list) => [...list, workerId]);
        router.post(`/permit-workers/${workerId}/toggle`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => scrollToId(`worker-${workerId}`),
            onError: () => setWorkers((list) => list.map((w) => w.id === workerId ? { ...w, is_present: prev.is_present } : w)),
            onFinish: () => setPendingWorkers((list) => list.filter((id) => id !== workerId)),
        });
    };

    const verifyGood = (goodId, file, mismatchNote) => {
        const previewUrl = URL.createObjectURL(file);
        const prev = goods.find((g) => g.id === goodId);
        setGoods((list) => list.map((g) => g.id === goodId
            ? { ...g, is_verified: true, photo_url: previewUrl, server_photo_url: prev.photo_url, mismatch_note: mismatchNote ?? g.mismatch_note }
            : g));
        const formData = new FormData();
        formData.append('photo', file);
        if (mismatchNote) formData.append('mismatch_note', mismatchNote);
        setVerifyingGoodId(goodId);
        router.post(`/permit-goods/${goodId}/verify`, formData, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { setExpandedGoodId(null); scrollToId(`good-${goodId}`); },
            onError: () => {
                URL.revokeObjectURL(previewUrl);
                setGoods((list) => list.map((g) => g.id === goodId ? prev : g));
            },
            onFinish: () => setVerifyingGoodId(null),
        });
    };

    const setGoodNote = (goodId, note) => {
        const prev = goods.find((g) => g.id === goodId);
        setGoods((list) => list.map((g) => g.id === goodId ? { ...g, mismatch_note: note } : g));
        setVerifyingGoodId(goodId);
        router.post(`/permit-goods/${goodId}/verify`, { mismatch_note: note }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => scrollToId(`good-${goodId}`),
            onError: () => setGoods((list) => list.map((g) => g.id === goodId ? prev : g)),
            onFinish: () => setVerifyingGoodId(null),
        });
    };

    const completeSecurityCheck = () => {
        router.post(`/permit-requests/${permit.id}/complete-security-check`, {}, { preserveScroll: true });
    };

    const cancelPermit = () => {
        if (!confirm('Apakah Anda yakin ingin membatalkan permohonan izin kerja ini?')) return;
        router.post(`/permit-requests/${permit.id}/cancel`);
    };

    const securityStep = permit.approvals?.find((a) => a.step_key === 'security');
    const canCompleteSecurityCheck = securityStep?.status === 'pending'
        && securityStep?.department_id === permit.currentUserDepartmentId;

    const isLegacyWorkers = workers.length > 0;
    const ktpPhotos = permit.ktp_photos ?? [];
    const ktpTarget = permit.worker_count ?? 0;
    const workersDone = isLegacyWorkers ? workers.filter((w) => w.is_present).length : Math.min(ktpPhotos.length, ktpTarget);
    const workerTotal = isLegacyWorkers ? workers.length : ktpTarget;
    const goodsDone = goods.filter((g) => g.is_verified).length;
    const totalTasks = workerTotal + goods.length;
    const doneTasks = workersDone + goodsDone;
    const allChecked = totalTasks > 0 && doneTasks === totalTasks;
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const [ktpKey, setKtpKey] = useState(0);
    const uploadKtp = (id, file, note) => {
        const formData = new FormData();
        formData.append('photo', file);
        if (note) formData.append('mismatch_note', note);
        router.post(`/permit-requests/${permit.id}/ktp-photos`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setKtpKey((k) => k + 1),
        });
    };
    const deleteKtp = (photoId) => {
        if (!confirm('Hapus berkas foto identitas (KTP) ini?')) return;
        router.delete(`/permit-ktp-photos/${photoId}`, { preserveScroll: true });
    };

    const activityLabels = (permit.activity_types || [])
        .map((val) => ACTIVITY_TYPES.find((t) => t.value === val)?.label ?? val);

    const location = [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot]
        .filter(Boolean).join(' / ') || '—';
    const isKegiatan = (permit.activity_types ?? []).some((v) => ['event', 'meeting_internal', 'stock_opname'].includes(v));
    const isParkir = (permit.activity_types ?? []).includes('langganan_parkir');
    const isFitout = (permit.activity_types ?? []).includes('fit_out');
    const isPullout = (permit.activity_types ?? []).includes('pull_out');
    const fitoutDocVariants = [
        ...(isFitout ? [{ value: 'fit_out', label: 'Fit Out' }] : []),
        ...(isPullout ? [{ value: 'pull_out', label: 'Pull Out' }] : []),
    ];
    const isLembur = (permit.activity_types ?? []).includes('lembur');
    const hasContractor = Boolean(permit.contractor_pic);
    const kegiatanNameLabel = { event: 'Nama Kegiatan / Event', meeting_internal: 'Agenda Rapat Internal', stock_opname: 'Kegiatan Stock Opname' }[permit.activity_types?.[0]] ?? 'Nama Kegiatan';
    const category = (permit.activity_types ?? []).includes('pameran')
        ? { key: 'pameran', label: 'Pameran / Open Counter', color: 'coral' }
        : isKegiatan
        ? { key: 'kegiatan', label: 'Kegiatan Internal', color: 'green' }
        : isParkir
        ? { key: 'parkir', label: 'Parkir Berlangganan', color: 'amber' }
        : permit.tenant_id
        ? { key: 'tenant', label: 'Tenant', color: 'blue' }
        : { key: 'vendor', label: 'Vendor Rekanan', color: 'amber' };
    const vehicleTypeLabel = permit.vehicle_type === 'motor' ? 'Sepeda Motor (R2)' : permit.vehicle_type === 'mobil' ? 'Mobil Penumpang (R4)' : '—';
    const locationTitle = permit.tenant?.name
        ?? permit.contractor_company
        ?? permit.store_name_snapshot
        ?? '—';

    // Cek apakah ada langkah persetujuan yang sedang menunggu giliran user yang login
    const currentStep = permit.approvals?.find((a) => a.status === 'pending');
    const isMyTurn = Boolean(
        currentStep &&
        currentStep.step_key !== 'security' &&
        (
            (currentStep.step_key === 'branch_manager' ? permit.can_approve_branch_manager : currentStep.department_id === permit.currentUserDepartmentId) &&
            (currentStep.step_key !== 'marketing' || permit.can_approve_marketing) &&
            (currentStep.step_key !== 'tenant_manager' || permit.can_approve_tenant_manager)
        )
    );

    const docIcon = (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
    );

    const docSections = [
        ...(isParkir ? [{
            title: 'Surat Izin Resmi',
            items: [
                { label: 'Formulir Langganan Parkir', description: 'Dokumen permohonan resmi & persetujuan', href: `/permit-requests/${permit.id}/pdf`, icon: docIcon, format: 'PDF' },
            ],
        }] : [{
            title: 'Surat Izin Resmi',
            items: [
                { label: 'Surat Izin Kerja (SIK)', description: 'Dokumen otorisasi kerja & persetujuan', href: `/permit-requests/${permit.id}/pdf`, icon: docIcon, format: 'PDF' },
            ],
        }]),
        ...fitoutDocVariants.map(({ value, label }) => ({
            title: `Kelengkapan Dokumen ${label}`,
            items: [
                { label: `Surat Pernyataan Tenant (${label})`, description: 'Pernyataan kesanggupan penyewa', onClick: () => setFitoutModal({ jenis: value }), icon: docIcon, format: 'PDF' },
                ...(hasContractor
                    ? [{ label: `Surat Pernyataan Kontraktor (${label})`, description: 'Pernyataan kepatuhan kontraktor pelaksana', href: `/permit-requests/${permit.id}/pernyataan-kontraktor?jenis=${value}`, icon: docIcon, format: 'PDF' }]
                    : [{ label: `Surat Pernyataan Kontraktor (${label})`, disabled: true, disabledHint: 'Lengkapi identitas kontraktor terlebih dahulu', icon: docIcon, format: 'PDF' }]),
                { label: `Lembar Tempel Unit (${label})`, description: 'Instruksi display fisik di pintu unit', href: `/permit-requests/${permit.id}/fitout-tempel?jenis=${value}`, icon: docIcon, format: 'PDF' },
                { label: `Kartu Identitas Kerja (${label})`, description: 'Tanda pengenal pekerja unit', href: `/permit-requests/${permit.id}/kode-fitout?jenis=${value}`, icon: docIcon, format: 'PDF' },
                { label: `Ketentuan & Regulasi ${label}`, description: `Standar operasional pelaksanaan ${label.toLowerCase()}`, href: `/permit-requests/${permit.id}/peraturan-fitout?jenis=${value}`, icon: docIcon, format: activeDocFiles['peraturan-fitout'] ?? 'PDF' },
            ],
        })),
        ...((permit.activity_types ?? []).some((v) => ['masuk_barang', 'fit_out', 'pull_out'].includes(v)) ? [{
            title: 'Logistik & Penitipan',
            items: fitoutDocVariants.length
                ? fitoutDocVariants.map(({ value, label }) => ({
                    label: `Izin Penitipan Barang (${label})`,
                    description: 'Otorisasi akses loading dock & bongkar muat',
                    href: `/permit-requests/${permit.id}/penitipan-barang?jenis=${value}`,
                    icon: docIcon,
                    format: activeDocFiles['penitipan-barang'] ?? 'PDF',
                }))
                : [{ label: 'Izin Penitipan Barang', description: 'Otorisasi akses loading dock & bongkar muat', href: `/permit-requests/${permit.id}/penitipan-barang`, icon: docIcon, format: activeDocFiles['penitipan-barang'] ?? 'PDF' }],
        }] : []),
        ...(isLembur ? [{
            title: 'Izin Lembur',
            items: [
                { label: 'Regulasi & Tata Tertib Lembur', description: 'Standar keselamatan & jam operasional malam', href: `/permit-requests/${permit.id}/tata-tertib-lembur`, icon: docIcon, format: activeDocFiles['tata-tertib-lembur'] ?? 'PDF' },
            ],
        }] : []),
    ];

    const docsMenuIcon = (
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
    );

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                {/* 1. Header Hero Terpadu & Minimalis */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs mb-5 print:border-none print:shadow-none print:p-0">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                                    {permit.permit_number}
                                </h1>
                                <Badge color={category.color}>{category.label}</Badge>
                                <Badge color={statusColor[permit.status] ?? 'gray'}>
                                    {statusLabel[permit.status] ?? permit.status}
                                </Badge>
                                {permit.is_flagged && (
                                    <Badge color="red">Catatan Ketidaksesuaian</Badge>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">
                                Diajukan pada {formatDateID(permit.request_date)} oleh{' '}
                                <strong className="text-slate-700 font-medium">{permit.requested_by_label}</strong>
                            </p>
                        </div>

                        {/* Aksi Terpadu Sejajar dengan Nomor Surat */}
                        <div className="flex items-center gap-2 flex-wrap print:hidden self-start lg:self-auto">
                            {!isParkir && (
                                <button
                                    type="button"
                                    onClick={() => setQrModalOpen(true)}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                                >
                                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    <span>Kartu Akses QR</span>
                                </button>
                            )}

                            <DropdownMenu label="Unduh Dokumen" icon={docsMenuIcon} sections={docSections} />

                            {can_revise && (
                                <button
                                    type="button"
                                    onClick={() => setReviseOpen(true)}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                >
                                    Ajukan Revisi
                                </button>
                            )}

                            {can_cancel && (
                                <button
                                    type="button"
                                    onClick={cancelPermit}
                                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                                >
                                    Batalkan Permohonan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Baris Sorotan Jenis Kegiatan & Lingkup Pekerjaan di Hero (Sesuai yang disukai user) */}
                    {!isParkir && activityLabels.length > 0 && (
                        <div className="flex items-center gap-2.5 flex-wrap mt-3.5 pt-3.5 border-t border-slate-100">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Jenis Kegiatan:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {activityLabels.map((lbl) => (
                                    <span
                                        key={lbl}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
                                    >
                                        {lbl}
                                    </span>
                                ))}
                            </div>
                            {(permit.job_type || permit.event_name) && (
                                <span className="text-xs text-slate-600 font-medium truncate max-w-xl">
                                    — <strong className="font-semibold text-slate-800">{permit.job_type || permit.event_name}</strong>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Empat Kartu Ringkasan Eksekutif (At-a-Glance Summary) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 print:grid-cols-4">
                    {/* Kartu 1: Tenant & Lokasi */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Tenant &amp; Lokasi Unit
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm truncate" title={locationTitle}>
                                {locationTitle}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate" title={location}>
                                {location}
                            </div>
                        </div>
                    </div>

                    {/* Kartu 2: Periode Pelaksanaan */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            {isParkir ? 'Identitas Kendaraan' : 'Periode Pelaksanaan'}
                        </div>
                        <div>
                            {isParkir ? (
                                <>
                                    <div className="font-bold text-slate-900 text-sm font-mono tracking-wide">
                                        {permit.vehicle_plate || '—'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {vehicleTypeLabel}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="font-bold text-slate-900 text-sm truncate" title={formatDateRange(permit.work_start_date, permit.work_end_date)}>
                                        {formatDateRange(permit.work_start_date, permit.work_end_date)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {formatTimeRange(permit.work_start_time, permit.work_end_time)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Kartu 3: Penanggung Jawab (PIC) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Penanggung Jawab (PIC)
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm truncate" title={permit.pic_name || '—'}>
                                {permit.pic_name || '—'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate">
                                {permit.pic_phone ? (
                                    <a href={`tel:${permit.pic_phone}`} className="text-indigo-600 font-medium hover:underline">
                                        {permit.pic_phone}
                                    </a>
                                ) : (
                                    '—'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Kartu 4: Verifikasi Fisik Lapangan */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Verifikasi Fisik Lapangan
                        </div>
                        <div>
                            {!isKegiatan && !isParkir ? (
                                <>
                                    <div className="font-bold text-slate-900 text-sm">
                                        {workersDone}/{workerTotal} Tenaga Kerja • {goodsDone}/{goods.length} Item
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${allChecked ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">{pct}%</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="font-bold text-slate-900 text-sm truncate">
                                        {isParkir ? permit.applicant_position || 'Staf Pemohon' : permit.event_area || 'Area Gedung'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                                        {isParkir ? permit.applicant_name || 'Pemohon' : permit.event_name || 'Kegiatan'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Banner Pemberitahuan Ketidaksesuaian Fisik */}
                {permit.is_flagged && (
                    <div className="bg-rose-50 border border-rose-200/80 text-rose-900 text-xs font-medium p-3.5 sm:p-4 rounded-2xl mb-5 flex items-start gap-3 shadow-2xs">
                        <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <strong className="font-semibold block mb-0.5">Pemberitahuan Catatan Lapangan</strong>
                            <span className="text-rose-800 leading-relaxed">
                                Petugas keamanan mencatat ketidaksesuaian spesifikasi pada saat pemeriksaan fisik. Harap tinjau catatan pada daftar tenaga kerja / material sebelum memproses permohonan.
                            </span>
                        </div>
                    </div>
                )}

                {/* 3. Tata Letak Dua Kolom: Dokumen Utama (Kiri) & Workflow Approval (Kanan) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-6 items-start">
                    {/* Kolom Kiri: Dokumen Perizinan (Unified Card dengan Tab Navigation Header) */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
                        {/* Tab Switcher jika memiliki pekerja & barang (Terintegrasi Langsung pada Header Card) */}
                        {!isKegiatan && !isParkir && (
                            <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 sm:px-6 print:hidden">
                                <nav className="flex items-center gap-1 sm:gap-3 md:gap-5 overflow-x-auto no-scrollbar -mb-px" aria-label="Tabs">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('detail')}
                                        className={`py-3.5 px-2 text-xs sm:text-sm font-semibold border-b-2 transition inline-flex items-center gap-2 whitespace-nowrap -mb-px ${
                                            activeTab === 'detail'
                                                ? 'border-indigo-600 text-indigo-700 font-bold'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        Informasi Perizinan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('pekerja')}
                                        className={`py-3.5 px-2 text-xs sm:text-sm font-semibold border-b-2 transition inline-flex items-center gap-2 whitespace-nowrap -mb-px ${
                                            activeTab === 'pekerja'
                                                ? 'border-indigo-600 text-indigo-700 font-bold'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>Daftar Tenaga Kerja</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                                            activeTab === 'pekerja'
                                                ? 'bg-indigo-100 text-indigo-700 font-bold'
                                                : 'bg-slate-200/80 text-slate-600 font-medium'
                                        }`}>
                                            {workersDone}/{workerTotal}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('barang')}
                                        className={`py-3.5 px-2 text-xs sm:text-sm font-semibold border-b-2 transition inline-flex items-center gap-2 whitespace-nowrap -mb-px ${
                                            activeTab === 'barang'
                                                ? 'border-indigo-600 text-indigo-700 font-bold'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>Material &amp; Peralatan</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums ${
                                            activeTab === 'barang'
                                                ? 'bg-indigo-100 text-indigo-700 font-bold'
                                                : 'bg-slate-200/80 text-slate-600 font-medium'
                                        }`}>
                                            {goodsDone}/{goods.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('all')}
                                        className={`py-3.5 px-2 text-xs sm:text-sm font-semibold border-b-2 transition inline-flex items-center gap-2 whitespace-nowrap -mb-px ${
                                            activeTab === 'all'
                                                ? 'border-indigo-600 text-indigo-700 font-bold'
                                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        Seluruh Dokumen
                                    </button>
                                </nav>
                            </div>
                        )}

                        {/* Card Body: Konten Bagian Dokumen */}
                        <div className="p-5 sm:p-7 space-y-6">
                            {/* SECTION A: Informasi & Spesifikasi Perizinan */}
                            {(activeTab === 'detail' || activeTab === 'all' || isKegiatan || isParkir) && (
                                <div className="space-y-6">
                                    {(activeTab === 'all' || isKegiatan || isParkir) ? (
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                                {isParkir ? 'Data Permohonan Parkir Berlangganan' : 'Informasi & Spesifikasi Perizinan'}
                                            </h2>
                                            <span className="text-xs text-slate-400 font-medium font-mono">{permit.permit_number}</span>
                                        </div>
                                    ) : (
                                        <div className="hidden print:flex items-center justify-between pb-3 border-b border-slate-100">
                                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                                Informasi &amp; Spesifikasi Perizinan
                                            </h2>
                                            <span className="text-xs text-slate-400 font-medium font-mono">{permit.permit_number}</span>
                                        </div>
                                    )}

                                {/* Informasi Pokok Pekerjaan */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                                    <div>
                                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Lokasi Unit / Area Kerja
                                        </dt>
                                        <dd className="font-semibold text-slate-900">
                                            {permit.store_name_snapshot}
                                        </dd>
                                        <dd className="text-xs text-slate-500 mt-0.5">
                                            {location}
                                        </dd>
                                    </div>

                                    {!isParkir ? (
                                        <div>
                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                Periode &amp; Jadwal Kerja
                                            </dt>
                                            <dd className="font-semibold text-slate-900">
                                                {formatDateRange(permit.work_start_date, permit.work_end_date)}
                                            </dd>
                                            <dd className="text-xs text-slate-500 mt-0.5">
                                                {formatTimeRange(permit.work_start_time, permit.work_end_time)}
                                            </dd>
                                        </div>
                                    ) : (
                                        <div>
                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                Identitas Kendaraan
                                            </dt>
                                            <dd className="font-semibold text-slate-900 font-mono">
                                                {permit.vehicle_plate || '—'} <span className="font-normal text-xs text-slate-500 font-sans">({vehicleTypeLabel})</span>
                                            </dd>
                                        </div>
                                    )}

                                    {!isParkir && (
                                        <>
                                            <div className="sm:col-span-2">
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                    {isKegiatan ? kegiatanNameLabel : 'Lingkup Pekerjaan'}
                                                </dt>
                                                <dd className="text-slate-900 font-medium text-sm leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                                                    {isKegiatan ? (permit.event_name || '—') : (permit.job_type || '—')}
                                                </dd>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                    {isKegiatan ? 'Area Penyelenggaraan' : 'Jalur Akses Logistik'}
                                                </dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {isKegiatan ? (permit.event_area || '—') : (permit.access_route || '—')}
                                                </dd>
                                            </div>
                                        </>
                                    )}

                                    {isParkir && (
                                        <>
                                            <div>
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                    Nama Pemohon / Pengemudi
                                                </dt>
                                                <dd className="font-semibold text-slate-900">
                                                    {permit.applicant_name || '—'}
                                                </dd>
                                                <dd className="text-xs text-slate-500 mt-0.5">
                                                    Jabatan: {permit.applicant_position || '—'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                                    Penanggung Jawab Tenant
                                                </dt>
                                                <dd className="font-semibold text-slate-900">
                                                    {permit.pic_name || '—'}
                                                </dd>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Catatan / Ketentuan Khusus */}
                                {permit.notes && (
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Instruksi &amp; Ketentuan Khusus
                                        </dt>
                                        <dd className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                            {permit.notes}
                                        </dd>
                                    </div>
                                )}

                                {/* Identitas Kontraktor / Vendor Eksternal jika ada */}
                                {!isParkir && (permit.is_external || permit.contractor_company) && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                            {category.key === 'vendor' ? 'Identitas Vendor Pelaksana' : 'Identitas Kontraktor Pelaksana'}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                                            <div>
                                                <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Badan Usaha / Perusahaan</span>
                                                <span className="font-bold text-slate-900">{permit.contractor_company || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Penanggung Jawab Lapangan</span>
                                                <span className="font-semibold text-slate-900">{permit.contractor_pic || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Kontak Telepon</span>
                                                <span className="text-slate-800">{permit.contractor_phone || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Domisili Perusahaan</span>
                                                <span className="text-slate-800 text-xs">{permit.contractor_address || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Departemen Pendamping Teknis jika ada */}
                                {!isParkir && permit.accompanying_departments?.length > 0 && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                            Departemen Pendamping Teknis
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {permit.accompanying_departments.map((d) => (
                                                <Badge key={d.id} color="gray">{d.name}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION B: Daftar Tenaga Kerja & Verifikasi Identitas (KTP) */}
                        {!isKegiatan && !isParkir && (activeTab === 'pekerja' || activeTab === 'all') && (
                            <div id="pekerja" className={`space-y-4 ${activeTab === 'all' ? 'pt-6 border-t border-slate-200/80' : ''}`}>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div>
                                        <h2 className={`text-base font-bold text-slate-900 tracking-tight ${activeTab === 'all' ? 'block' : 'hidden print:block'}`}>
                                            Daftar Tenaga Kerja &amp; Verifikasi Identitas (KTP)
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Kuota Terdaftar: <strong className="text-slate-800">{ktpTarget} orang</strong> • Terverifikasi Hadir: <strong className="text-emerald-700">{workersDone} orang</strong>
                                        </p>
                                    </div>
                                    <Badge color={workersDone >= workerTotal ? 'green' : 'yellow'}>
                                        {workersDone}/{workerTotal} Terverifikasi
                                    </Badge>
                                </div>

                                {isLegacyWorkers ? (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left text-xs uppercase font-semibold">
                                                    <th className="w-12 px-4 py-3">No</th>
                                                    <th className="px-4 py-3">Nama Tenaga Kerja</th>
                                                    <th className="px-4 py-3 text-right">Status Kehadiran Lapangan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {workers.map((w, idx) => (
                                                    <tr key={w.id} id={`worker-${w.id}`} className="hover:bg-slate-50/60 transition">
                                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-semibold text-slate-900">{w.name}</td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                                            {canCompleteSecurityCheck ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleWorker(w.id)}
                                                                    disabled={pendingWorkers.includes(w.id)}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                                                                        w.is_present
                                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {pendingWorkers.includes(w.id) ? 'Menyimpan…' : w.is_present ? 'Hadir' : 'Konfirmasi Hadir'}
                                                                </button>
                                                            ) : (
                                                                <Badge color={w.is_present ? 'green' : 'gray'}>
                                                                    {w.is_present ? 'Hadir' : 'Belum Hadir'}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div>
                                        {/* Security Capture Box untuk Foto KTP */}
                                        {canCompleteSecurityCheck && (
                                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:hidden">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                                        Unggah Dokumentasi Identitas (KTP)
                                                    </p>
                                                </div>
                                                <GoodPhotoCapture
                                                    key={ktpKey}
                                                    good={{ id: 'ktp', description: 'KTP pekerja', is_verified: false, mismatch_note: '' }}
                                                    canEdit={canCompleteSecurityCheck}
                                                    onSubmit={uploadKtp}
                                                    onNoteUpdate={() => {}}
                                                    submitting={false}
                                                />
                                            </div>
                                        )}

                                        {/* Galeri Kartu KTP */}
                                        {ktpPhotos.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {ktpPhotos.map((p, idx) => (
                                                    <div key={p.id} className="group relative bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                                        <img
                                                            src={p.photo_url}
                                                            alt={`KTP Pekerja #${idx + 1}`}
                                                            loading="lazy"
                                                            className="w-full h-32 object-cover"
                                                        />
                                                        <div className="p-2 text-[11px]">
                                                            <div className="font-semibold text-slate-800">Tenaga Kerja #{idx + 1}</div>
                                                            {p.mismatch_note && (
                                                                <p className="text-[10px] text-amber-700 mt-0.5 font-medium">{p.mismatch_note}</p>
                                                            )}
                                                        </div>

                                                        {canCompleteSecurityCheck && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteKtp(p.id)}
                                                                className="print:hidden absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Hapus foto KTP"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                                                Belum ada berkas identitas (KTP) yang diunggah.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION C: Daftar Material, Peralatan & Barang Bawaan */}
                        {!isKegiatan && !isParkir && (activeTab === 'barang' || activeTab === 'all') && (
                            <div id="barang" className={`space-y-4 ${activeTab === 'all' ? 'pt-6 border-t border-slate-200/80' : ''}`}>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div>
                                        <h2 className={`text-base font-bold text-slate-900 tracking-tight ${activeTab === 'all' ? 'block' : 'hidden print:block'}`}>
                                            Daftar Material, Peralatan &amp; Barang Bawaan
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Total Item Terdaftar: <strong className="text-slate-800">{goods.length} item</strong> • Terverifikasi Fisik: <strong className="text-emerald-700">{goodsDone} item</strong>
                                        </p>
                                    </div>
                                    <Badge color={goodsDone >= goods.length ? 'green' : 'yellow'}>
                                        {goodsDone}/{goods.length} Terverifikasi
                                    </Badge>
                                </div>

                                {goods.length > 0 ? (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left text-xs uppercase font-semibold">
                                                    <th className="w-12 px-4 py-3">No</th>
                                                    <th className="px-4 py-3">Deskripsi Material / Barang</th>
                                                    <th className="px-4 py-3">Kuantitas</th>
                                                    <th className="px-4 py-3">Satuan</th>
                                                    <th className="px-4 py-3">Dokumentasi Fisik</th>
                                                    <th className="px-4 py-3 text-right">Status Pemeriksaan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {goods.map((g, idx) => (
                                                    <tr key={g.id} id={`good-${g.id}`} className="hover:bg-slate-50/60 transition">
                                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs align-top">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-semibold text-slate-900 align-top">
                                                            {g.description}
                                                            {g.mismatch_note && (
                                                                <p className="text-xs text-amber-800 mt-1 font-normal bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                                    Catatan Lapangan: {g.mismatch_note}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700 font-bold tabular-nums align-top whitespace-nowrap">
                                                            {g.quantity_note}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 align-top whitespace-nowrap">
                                                            {g.unit ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            {g.photo_url ? (
                                                                <img
                                                                    src={g.photo_url}
                                                                    alt={`Dokumentasi ${g.description}`}
                                                                    loading="lazy"
                                                                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs"
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-slate-300 italic">Belum ada foto</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap align-top">
                                                            <div className="inline-flex items-center gap-2">
                                                                <Badge color={g.is_verified ? 'green' : 'gray'}>
                                                                    {g.is_verified ? 'Terverifikasi' : 'Belum Diverifikasi'}
                                                                </Badge>

                                                                {canCompleteSecurityCheck && !g.is_verified && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setExpandedGoodId(expandedGoodId === g.id ? null : g.id);
                                                                            setTimeout(() => document.getElementById('good-verify')?.scrollIntoView({ block: 'nearest' }), 60);
                                                                        }}
                                                                        className="print:hidden px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold transition"
                                                                    >
                                                                        {expandedGoodId === g.id ? 'Tutup' : 'Verifikasi Fisik'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                                        Tidak ada daftar material atau barang bawaan yang dicatat pada permohonan ini.
                                    </div>
                                )}

                                {/* Form Verifikasi Foto Barang untuk Pos Security */}
                                {canCompleteSecurityCheck && expandedGood && !expandedGood.is_verified && (
                                    <div id="good-verify" className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:hidden scroll-mt-40">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                                Pemeriksaan Fisik Lapangan: {expandedGood.description} ({expandedGood.quantity_note})
                                            </p>
                                        </div>
                                        <GoodPhotoCapture
                                            good={expandedGood}
                                            canEdit={canCompleteSecurityCheck}
                                            onSubmit={verifyGood}
                                            onNoteUpdate={setGoodNote}
                                            submitting={verifyingGoodId === expandedGood.id}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Kolom Kanan: Alur Persetujuan Terpadu (1 Card) */}
                    <div className="space-y-5 lg:sticky lg:top-20">
                        {/* KARTU TERPADU ALUR PERSETUJUAN (WORKFLOW) */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Alur Persetujuan (Workflow)
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                                    {permit.approvals?.filter((a) => a.status === 'approved').length} / {permit.approvals?.length} Selesai
                                </span>
                            </div>

                            {/* Aksi Persetujuan jika giliran user yang login (Terintegrasi di Dalam Card) */}
                            {isMyTurn && (
                                <div className="mb-5 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm print:hidden">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                            Menunggu Tindakan Anda
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                                        Tahap: <strong>{currentStep.label}</strong>. Silakan evaluasi kelengkapan dokumen sebelum memberikan keputusan.
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => approve(currentStep.id)}
                                            className="flex-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Setujui</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRejectingId(rejectingId === currentStep.id ? null : currentStep.id)}
                                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span>Tolak</span>
                                        </button>
                                    </div>

                                    {rejectingId === currentStep.id && (
                                        <div className="mt-3.5 pt-3 border-t border-slate-800">
                                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                                Alasan Penolakan Resmi:
                                            </label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="Tuliskan pertimbangan penolakan secara jelas..."
                                                rows={2}
                                                className="w-full text-xs rounded-xl border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-rose-500 focus:border-rose-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => reject(currentStep.id)}
                                                className="mt-2 w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                            >
                                                Konfirmasi Penolakan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tombol Pengecekan Fisik Selesai untuk Petugas Security */}
                            {canCompleteSecurityCheck && (
                                <div className="mb-5 print:hidden">
                                    <button
                                        type="button"
                                        onClick={completeSecurityCheck}
                                        disabled={!allChecked}
                                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
                                    >
                                        <span>Konfirmasi Selesai Cek Fisik</span>
                                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] tabular-nums">
                                            {doneTasks}/{totalTasks}
                                        </span>
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Alur Persetujuan (Workflow)
                                </h3>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                    {permit.approvals?.filter((a) => a.status === 'approved').length} dari {permit.approvals?.length} selesai
                                </span>
                            </div>

                            <ol className="relative ml-2 border-l-2 border-slate-100 space-y-4">
                                {(permit.approvals || []).map((a) => {
                                    const isPendingHere = a.status === 'pending';
                                    const isApprovedHere = a.status === 'approved';
                                    const isRejectedHere = a.status === 'rejected';

                                    return (
                                        <li key={a.id} className="pl-4 relative">
                                            {/* Dot Indikator */}
                                            <span
                                                className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${
                                                    isApprovedHere
                                                        ? 'bg-emerald-500 ring-4 ring-emerald-50'
                                                        : isRejectedHere
                                                        ? 'bg-rose-500 ring-4 ring-rose-50'
                                                        : 'bg-amber-400 ring-4 ring-amber-50'
                                                }`}
                                            />

                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-slate-800">{a.label}</span>
                                                <Badge color={approvalColor[a.status]} size="sm">
                                                    {approvalLabel[a.status] ?? a.status}
                                                </Badge>
                                            </div>

                                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                                {isApprovedHere
                                                    ? `Disetujui oleh ${a.approved_by?.name ?? '—'} • ${formatDateTimeID(a.approved_at)}`
                                                    : isRejectedHere
                                                    ? `Ditolak oleh ${a.approved_by?.name ?? '—'} • ${formatDateTimeID(a.approved_at)}`
                                                    : a.department?.name
                                                    ? `Menunggu persetujuan Departemen ${a.department.name}`
                                                    : 'Menunggu persetujuan'}
                                            </p>

                                            {a.notes && (
                                                <div className={`text-xs mt-1.5 p-2 rounded-lg border ${
                                                    isRejectedHere ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-slate-700 bg-slate-50 border-slate-200'
                                                }`}>
                                                    {a.notes}
                                                </div>
                                            )}

                                            {a.step_key === 'security' && isPendingHere && (
                                                <p className="text-[11px] text-slate-400 mt-1 italic">
                                                    Verifikasi fisik tenaga kerja &amp; material di pos pemeriksaan keamanan.
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* 4. RIWAYAT REVISI jika ada */}
                        {(permit.revisions ?? []).length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100">
                                    Riwayat Revisi ({permit.revisions.length})
                                </h3>
                                <RevisionTimeline revisions={permit.revisions} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal-modal */}
            <ReviseModal
                open={reviseOpen}
                onClose={() => setReviseOpen(false)}
                permit={permit}
                postUrl={`/permit-requests/${permit.id}/revise`}
            />
            <FitoutStatementModal
                open={Boolean(fitoutModal)}
                jenis={fitoutModal?.jenis ?? 'fit_out'}
                onClose={() => setFitoutModal(null)}
                permit={permit}
            />

            {/* Modal Kartu Akses QR Digital */}
            {!isParkir && (
                <Modal
                    open={qrModalOpen}
                    onClose={() => setQrModalOpen(false)}
                    title="Kartu Akses Digital (QR Code)"
                    icon={
                        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                    }
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                            <div className="font-mono font-bold text-slate-900">{permit.permit_number}</div>
                            <div className="text-slate-600 mt-0.5 truncate">{locationTitle} • {location}</div>
                        </div>

                        {share ? (
                            <>
                                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                                    <img
                                        src={share.qr}
                                        alt="QR Akses Digital"
                                        className="w-48 h-48 object-contain"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-2 text-center">
                                        Pindai kode QR untuk validasi resmi perizinan di pos pemeriksaan.
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-xl text-xs font-mono text-slate-600 truncate border border-slate-200">
                                        <span className="truncate flex-1 text-[11px] px-1">{share.url}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard?.writeText(share.url);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="shrink-0 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg font-sans font-semibold text-xs border border-slate-200 transition shadow-2xs"
                                        >
                                            {copied ? '✓ Tersalin!' : 'Salin'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <a
                                            href={`/permit-requests/${permit.id}/qr-label`}
                                            className="py-2.5 px-3 text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span>Unduh Label PDF</span>
                                        </a>
                                        <a
                                            href={share.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="py-2.5 px-3 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <span>Buka Halaman</span>
                                        </a>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-6 px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs text-slate-500 leading-relaxed">
                                Kode QR verifikasi digital akan otomatis aktif dan dapat dipindai setelah permohonan disetujui secara lengkap.
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
