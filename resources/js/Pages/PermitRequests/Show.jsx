import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import { PERMIT_CATEGORY_META, PERMIT_STATUS_META } from '@/Constants/permitMeta';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import GoodPhotoCapture from '@/Components/Security/GoodPhotoCapture';
import ReviseModal, { RevisionTimeline } from '@/Components/Permits/ReviseModal';
import FitoutStatementModal from '@/Components/Permits/FitoutStatementModal';
import DropdownMenu from '@/Components/DropdownMenu';
import { IconAlert, IconCheck, IconDocument, IconDownload, IconQr, IconTrash, IconX } from '@/Components/Icons';
import { formatDateID, formatDateRange, formatDateTimeID, formatTimeRange } from '@/utils/format';
import useCan from '@/hooks/useCan';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };
const statusColor = {
    pending: 'yellow',
    completed: 'green',
    approved: 'green',
    rejected: 'red',
    cancelled: PERMIT_STATUS_META.cancelled.color,
};
const statusLabel = { pending: 'Menunggu Persetujuan', completed: 'Selesai', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan' };
const approvalLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

// Box aksi persetujuan + cek fisik: dipakai di kolom kanan (desktop sticky)
// dan di atas dokumen (mobile). Props di-threading dari Show agar satu sumber logika.
function ApprovalActionBox({
    isMyTurn, currentStep, rejectingId, setRejectingId, reason, setReason,
    rejectError, approve, reject, canCompleteSecurityCheck, completeSecurityCheck,
    allChecked, doneTasks, totalTasks, wrapperClassName = '',
}) {
    if (!isMyTurn && !canCompleteSecurityCheck) return null;
    return (
        <div className={wrapperClassName}>
            {/* Aksi Persetujuan jika giliran user yang login */}
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
                            className="flex-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                            <IconCheck className="w-4 h-4" aria-hidden="true" />
                            <span>Setujui</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRejectingId(rejectingId === currentStep.id ? null : currentStep.id)}
                            aria-expanded={rejectingId === currentStep.id}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
                        >
                            <IconX className="w-4 h-4" aria-hidden="true" />
                            <span>Tolak</span>
                        </button>
                    </div>

                    {rejectingId === currentStep.id && (
                        <div className="mt-3.5 pt-3 border-t border-slate-800">
                            <label htmlFor="reject-reason" className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Alasan Penolakan Resmi:
                            </label>
                            <textarea
                                id="reject-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Tuliskan pertimbangan penolakan secara jelas..."
                                rows={2}
                                aria-invalid={Boolean(rejectError)}
                                aria-describedby={rejectError ? 'reject-reason-error' : undefined}
                                className="w-full text-xs rounded-lg border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-rose-500 focus:border-rose-500"
                            />
                            {rejectError && (
                                <p id="reject-reason-error" role="alert" className="text-[11px] text-rose-300 mt-1">
                                    {rejectError}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => reject(currentStep.id)}
                                className="mt-2 w-full px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
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
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
                    >
                        <span>Konfirmasi Selesai Cek Fisik</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] tabular-nums">
                            {doneTasks}/{totalTasks}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Node alur persetujuan: centang untuk tahap selesai, silang untuk ditolak,
// dot biru untuk yang masih menunggu — mengikuti StepNode di kartu status LOO.
function ApprovalStepNode({ status }) {
    if (status === 'approved') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <IconCheck className="h-3 w-3" aria-hidden="true" />
            </span>
        );
    }

    if (status === 'rejected') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <IconX className="h-3 w-3" aria-hidden="true" />
            </span>
        );
    }

    return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
        </span>
    );
}

export default function Show({ permit, can_revise, can_cancel, share, docFiles = {}, doc_files = {} }) {
    const activeDocFiles = docFiles && Object.keys(docFiles).length ? docFiles : doc_files;
    const { can } = useCan();

    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');
    const [reviseOpen, setReviseOpen] = useState(false);
    const [fitoutModal, setFitoutModal] = useState(null);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'pekerja' | 'barang' | 'all'
    const [copied, setCopied] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // 'cancel' | { type: 'ktp', photoId: string }
    const [rejectError, setRejectError] = useState('');

    const approve = (approvalId) => router.post(`/approvals/${approvalId}/approve`, {}, { preserveScroll: true });

    const reject = (approvalId) => {
        if (!reason.trim()) {
            setRejectError('Silakan cantumkan alasan penolakan secara jelas.');
            return;
        }
        setRejectError('');
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
        if (can_cancel) setConfirmAction('cancel');
    };

    const handleConfirmAction = () => {
        if (confirmAction === 'cancel') {
            router.post(`/permit-requests/${permit.id}/cancel`);
        } else if (confirmAction?.type === 'ktp') {
            router.delete(`/permit-ktp-photos/${confirmAction.photoId}`, { preserveScroll: true });
        }
        setConfirmAction(null);
    };

    const securityStep = permit.approvals?.find((a) => a.step_key === 'security');
    const canCompleteSecurityCheck = can('permits.inspect')
        && securityStep?.status === 'pending'
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
        setConfirmAction({ type: 'ktp', photoId });
    };

    const activityLabels = (permit.activity_types || [])
        .map((val) => ACTIVITY_TYPES.find((t) => t.value === val)?.label ?? val);

    const location = [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot]
        .filter(Boolean).join(' / ') || '—';
    const isKegiatan = (permit.activity_types ?? []).some((v) => ['event', 'meeting_internal', 'stock_opname'].includes(v));
    const isParkir = (permit.activity_types ?? []).includes('langganan_parkir');
    const isCustomer = (permit.activity_types ?? []).includes('customer_form');
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
        ? { key: 'pameran', label: 'Pameran / Open Counter', color: PERMIT_CATEGORY_META.pameran.color }
        : isKegiatan
        ? { key: 'kegiatan', label: 'Kegiatan Internal', color: PERMIT_CATEGORY_META.kegiatan.color }
        : isParkir
        ? { key: 'parkir', label: 'Parkir Berlangganan', color: PERMIT_CATEGORY_META.parkir.color }
        : isCustomer
        ? { key: 'customer', label: 'Customer Isi Form', color: PERMIT_CATEGORY_META.customer.color }
        : permit.tenant_id
        ? { key: 'tenant', label: 'Tenant', color: PERMIT_CATEGORY_META.tenant.color }
        : { key: 'vendor', label: 'Vendor Rekanan', color: PERMIT_CATEGORY_META.vendor.color };
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
    // Tombol aksi hanya bila punya permission; indikator tahapan tetap pakai isMyTurn mentah.
    const canTakeApprovalAction = isMyTurn && can('permits.approve');

    const docIcon = (
        <IconDocument className="w-4 h-4 text-slate-400" aria-hidden="true" />
    );

    const docSections = [
        ...(isParkir || isCustomer ? [{
            title: 'Surat Izin Resmi',
            items: [
                { label: isCustomer ? 'Customer Isi Form' : 'Formulir Langganan Parkir', description: 'Dokumen permohonan resmi & persetujuan', href: `/permit-requests/${permit.id}/pdf`, icon: docIcon, format: 'PDF' },
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
        <IconDownload className="w-4 h-4 text-slate-500" aria-hidden="true" />
    );

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-6xl w-full mx-auto">
                {/* 1. Header record */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 font-mono truncate">
                                {permit.permit_number}
                            </h1>
                            <Badge color={category.color} size="sm">{category.label}</Badge>
                            <Badge color={statusColor[permit.status] ?? 'gray'} size="sm">
                                {statusLabel[permit.status] ?? permit.status}
                            </Badge>
                            {permit.is_flagged && (
                                <Badge color="red" size="sm">Catatan Ketidaksesuaian</Badge>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Diajukan pada {formatDateID(permit.request_date)} oleh{' '}
                            <strong className="text-slate-700 font-medium">{permit.requested_by_label}</strong>
                        </p>
                        {!isParkir && activityLabels.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                {activityLabels.map((lbl) => (
                                    <Badge key={lbl} color={category.color} size="sm">{lbl}</Badge>
                                ))}
                                {(permit.job_type || permit.event_name) && (
                                    <span className="text-xs text-slate-600 truncate max-w-xl">
                                        {permit.job_type || permit.event_name}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap print:hidden shrink-0">
                        {!isParkir && (
                            <button
                                type="button"
                                onClick={() => setQrModalOpen(true)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconQr className="w-4 h-4 text-slate-600" aria-hidden="true" />
                                <span>Kartu Akses QR</span>
                            </button>
                        )}

                        <DropdownMenu label="Unduh Dokumen" icon={docsMenuIcon} sections={docSections} />

                        {can_revise && (
                            <button
                                type="button"
                                onClick={() => setReviseOpen(true)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                Ajukan Revisi
                            </button>
                        )}

                        {can_cancel && (
                            <button
                                type="button"
                                onClick={cancelPermit}
                                className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                Batalkan Permohonan
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Strip ringkasan (satu surface hairline, mengikuti detail LOO) */}
                <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E2E5EA] rounded-lg border border-[#E2E5EA] overflow-hidden print:grid-cols-4">
                    <div className="bg-white px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Tenant &amp; Lokasi Unit</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900 truncate" title={locationTitle}>{locationTitle}</dd>
                        <dd className="text-xs text-slate-500 mt-0.5 truncate" title={location}>{location}</dd>
                    </div>

                    <div className="bg-white px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            {isParkir ? 'Identitas Kendaraan' : 'Periode Pelaksanaan'}
                        </dt>
                        {isParkir ? (
                            <>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 font-mono tracking-wide truncate">{permit.vehicle_plate || '—'}</dd>
                                <dd className="text-xs text-slate-500 mt-0.5 truncate">{vehicleTypeLabel}</dd>
                            </>
                        ) : (
                            <>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 truncate" title={formatDateRange(permit.work_start_date, permit.work_end_date)}>
                                    {formatDateRange(permit.work_start_date, permit.work_end_date)}
                                </dd>
                                <dd className="text-xs text-slate-500 mt-0.5 truncate">{formatTimeRange(permit.work_start_time, permit.work_end_time)}</dd>
                            </>
                        )}
                    </div>

                    <div className="bg-white px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Penanggung Jawab (PIC)</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900 truncate" title={permit.pic_name || '—'}>{permit.pic_name || '—'}</dd>
                        <dd className="text-xs text-slate-500 mt-0.5 truncate">{permit.pic_phone || '—'}</dd>
                    </div>

                    <div className="bg-white px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            {!isKegiatan && !isParkir ? 'Verifikasi Fisik Lapangan' : isParkir ? 'Pemohon' : 'Area Kegiatan'}
                        </dt>
                        {!isKegiatan && !isParkir ? (
                            <>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                                    {workersDone}/{workerTotal} tenaga kerja
                                </dd>
                                <dd className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan verifikasi fisik">
                                        <div
                                            className={`h-full ${allChecked ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-500 tabular-nums">{pct}%</span>
                                </dd>
                            </>
                        ) : (
                            <>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                    {isParkir ? permit.applicant_position || 'Staf Pemohon' : permit.event_area || 'Area Gedung'}
                                </dd>
                                <dd className="text-xs text-slate-500 mt-0.5 truncate">
                                    {isParkir ? permit.applicant_name || 'Pemohon' : permit.event_name || 'Kegiatan'}
                                </dd>
                            </>
                        )}
                    </div>
                </dl>

                {/* Banner Pemberitahuan Ketidaksesuaian Fisik */}
                {permit.is_flagged && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium p-3.5 sm:p-4 rounded-lg mt-4 flex items-start gap-3">
                        <IconAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <strong className="font-semibold block mb-0.5">Pemberitahuan Catatan Lapangan</strong>
                            <span className="text-rose-800 leading-relaxed">
                                Petugas keamanan mencatat ketidaksesuaian spesifikasi pada saat pemeriksaan fisik. Harap tinjau catatan pada daftar tenaga kerja / material sebelum memproses permohonan.
                            </span>
                        </div>
                    </div>
                )}

                {/* 3. Tata Letak Dua Kolom: Dokumen Utama (Kiri) & Alur Persetujuan (Kanan) */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_19rem] gap-4 items-start">
                    {/* Box aksi persetujuan untuk mobile: tampil di atas dokumen, sembunyi di desktop */}
                    <div className="lg:hidden print:hidden">
                        <ApprovalActionBox
                            permit={permit}
                            isMyTurn={canTakeApprovalAction}
                            currentStep={currentStep}
                            rejectingId={rejectingId}
                            setRejectingId={setRejectingId}
                            reason={reason}
                            setReason={setReason}
                            rejectError={rejectError}
                            approve={approve}
                            reject={reject}
                            canCompleteSecurityCheck={canCompleteSecurityCheck}
                            completeSecurityCheck={completeSecurityCheck}
                            allChecked={allChecked}
                            doneTasks={doneTasks}
                            totalTasks={totalTasks}
                        />
                    </div>
                    {/* Kolom Kiri: Dokumen Perizinan */}
                    <div className="bg-white rounded-lg border border-slate-200 p-5 print:border-none">
                        {!isKegiatan && !isParkir && !isCustomer && (
                            <div className="inline-flex max-w-full rounded-lg border border-slate-200 p-0.5 overflow-x-auto print:hidden" role="group" aria-label="Bagian dokumen">
                                {[
                                    { key: 'detail', label: 'Informasi Perizinan' },
                                    { key: 'pekerja', label: 'Daftar Tenaga Kerja', count: `${workersDone}/${workerTotal}` },
                                    { key: 'barang', label: 'Material & Peralatan', count: `${goodsDone}/${goods.length}` },
                                    { key: 'all', label: 'Seluruh Dokumen' },
                                ].map((tab) => {
                                    const selected = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setActiveTab(tab.key)}
                                            aria-pressed={selected}
                                            className={`flex items-center gap-2 px-3 min-h-11 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] ${
                                                selected ? 'bg-[#0F1E36] text-white' : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {tab.label}
                                            {tab.count && (
                                                <span className={`text-[11px] font-mono tabular-nums ${selected ? 'text-white/70' : 'text-slate-400'}`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Card Body: Konten Bagian Dokumen */}
                        <div className={`space-y-6 ${!isKegiatan && !isParkir && !isCustomer ? 'mt-5' : ''}`}>
                            {/* SECTION A: Informasi & Spesifikasi Perizinan */}
                            {(activeTab === 'detail' || activeTab === 'all' || isKegiatan || isParkir || isCustomer) && (
                                <div className={`space-y-4 ${activeTab !== 'detail' && !isKegiatan && !isParkir ? 'print:hidden' : ''}`}>
                                    {(activeTab === 'all' || isKegiatan || isParkir || isCustomer) ? (
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                                {isParkir ? 'Data Permohonan Parkir Berlangganan' : isCustomer ? 'Data Customer Isi Form' : 'Informasi & Spesifikasi Perizinan'}
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

                                {/* Informasi Pokok — dokumen datar: judul kecil + garis tipis, tanpa kartu bersarang */}
                                {isCustomer ? (
                                    <>
                                        <InfoGroup title="Perusahaan">
                                            <DetailField label="Nama Perusahaan PT/CV" value={permit.customer_form_data?.customer_company_name} lead />
                                            <DetailField label="No. Telp/HP Perusahaan" value={permit.customer_form_data?.customer_company_phone} />
                                            <DetailField label="No. NPWP Perusahaan" value={permit.customer_form_data?.customer_npwp_number} />
                                            <DetailField label="Nama di NPWP" value={permit.customer_form_data?.customer_npwp_name} />
                                            <DetailField label="Alamat di NPWP" value={permit.customer_form_data?.customer_npwp_address} wide />
                                            <DetailField label="Alamat Pengiriman Invoice" value={permit.customer_form_data?.customer_invoice_address} wide />
                                        </InfoGroup>
                                        <InfoGroup title="Penanggung Jawab (PIC)">
                                            <DetailField label="Nama PIC" value={permit.customer_form_data?.customer_pic_name} lead />
                                            <DetailField label="Jabatan" value={permit.customer_form_data?.customer_pic_position} />
                                            <DetailField label="No. KTP PIC" value={permit.customer_form_data?.customer_pic_ktp} />
                                            <DetailField label="No. Telp/HP PIC" value={permit.customer_form_data?.customer_pic_phone} />
                                            <DetailField label="E-mail PIC" value={permit.customer_form_data?.customer_pic_email} />
                                            <DetailField label="Hubungan Tenant" value={permit.customer_form_data?.customer_tenant_relation || permit.tenant?.name} />
                                        </InfoGroup>
                                        <InfoGroup title="Tagihan">
                                            <DetailField label="Nominal (di luar PPN)" value={`Rp ${Number(permit.customer_form_data?.customer_amount || 0).toLocaleString('id-ID')}`} lead />
                                            <DetailField label="Kota / Tanggal" value={`${permit.customer_form_data?.customer_city || '—'}, ${formatDateID(permit.request_date)}`} />
                                            <DetailField label="Keterangan Tagihan" value={permit.customer_form_data?.customer_billing_description} wide />
                                            <DetailField label="Catatan" value={permit.customer_form_data?.customer_notes} wide />
                                        </InfoGroup>
                                        {permit.notes && (
                                            <InfoGroup title="Instruksi & Ketentuan Khusus">
                                                <dd className="sm:col-span-2 text-sm text-slate-800 leading-relaxed whitespace-pre-line">{permit.notes}</dd>
                                            </InfoGroup>
                                        )}
                                    </>
                                ) : isParkir ? (
                                    <>
                                        <InfoGroup title="Kendaraan & Pemohon" id="info-lokasi">
                                            <DetailField label="Identitas Kendaraan" lead>
                                                <span className="font-mono">{permit.vehicle_plate || '—'}</span>
                                                <span className="ml-1.5 text-sm font-normal text-slate-500">({vehicleTypeLabel})</span>
                                            </DetailField>
                                            <DetailField label="Lokasi Unit / Area Kerja" value={permit.store_name_snapshot} hint={location} />
                                            <DetailField label="Nama Pemohon / Pengemudi" value={permit.applicant_name} hint={permit.applicant_position ? `Jabatan: ${permit.applicant_position}` : null} />
                                            <DetailField label="Penanggung Jawab Tenant" value={permit.pic_name} />
                                        </InfoGroup>
                                        {permit.notes && (
                                            <InfoGroup title="Instruksi & Ketentuan Khusus">
                                                <dd className="sm:col-span-2 text-sm text-slate-800 leading-relaxed whitespace-pre-line">{permit.notes}</dd>
                                            </InfoGroup>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <InfoGroup title="Lokasi & Jadwal" id="info-lokasi">
                                            <DetailField label="Lokasi Unit / Area Kerja" value={permit.store_name_snapshot} hint={location} lead />
                                            <DetailField
                                                label="Periode & Jadwal Kerja"
                                                value={formatDateRange(permit.work_start_date, permit.work_end_date)}
                                                hint={formatTimeRange(permit.work_start_time, permit.work_end_time)}
                                            />
                                        </InfoGroup>
                                        <InfoGroup title="Lingkup">
                                            <DetailField label={isKegiatan ? kegiatanNameLabel : 'Lingkup Pekerjaan'} value={isKegiatan ? permit.event_name : permit.job_type} wide lead />
                                            <DetailField label={isKegiatan ? 'Area Penyelenggaraan' : 'Jalur Akses Logistik'} value={isKegiatan ? permit.event_area : permit.access_route} wide />
                                        </InfoGroup>
                                        {permit.notes && (
                                            <InfoGroup title="Instruksi & Ketentuan Khusus">
                                                <dd className="sm:col-span-2 text-sm text-slate-800 leading-relaxed whitespace-pre-line">{permit.notes}</dd>
                                            </InfoGroup>
                                        )}
                                    </>
                                )}

                                {/* Identitas Kontraktor / Vendor Eksternal jika ada */}
                                {!isParkir && !isCustomer && (permit.is_external || permit.contractor_company) && (
                                    <InfoGroup title={category.key === 'vendor' ? 'Identitas Vendor Pelaksana' : 'Identitas Kontraktor Pelaksana'}>
                                        <DetailField label="Badan Usaha / Perusahaan" value={permit.contractor_company} lead />
                                        <DetailField label="Penanggung Jawab Lapangan" value={permit.contractor_pic} />
                                        <DetailField label="Kontak Telepon" value={permit.contractor_phone} />
                                        <DetailField label="Domisili Perusahaan" value={permit.contractor_address} wide />
                                    </InfoGroup>
                                )}

                                {/* Departemen Pendamping Teknis jika ada */}
                                {!isParkir && !isCustomer && permit.accompanying_departments?.length > 0 && (
                                    <InfoGroup title="Departemen Pendamping Teknis">
                                        <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                                            {permit.accompanying_departments.map((d) => (
                                                <Badge key={d.id} color="gray">{d.name}</Badge>
                                            ))}
                                        </div>
                                    </InfoGroup>
                                )}
                            </div>
                        )}

                        {/* SECTION B: Daftar Tenaga Kerja & Verifikasi Identitas (KTP) */}
                        {!isKegiatan && !isParkir && !isCustomer && (activeTab === 'pekerja' || activeTab === 'all') && (
                            <div id="verifikasi" className={`space-y-4 scroll-mt-24 print:block ${activeTab === 'all' ? 'pt-6 border-t border-slate-200/80' : ''}`}>
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
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="w-full text-sm">
                                            <caption className="sr-only">Daftar tenaga kerja dan status kehadiran lapangan</caption>
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left text-xs uppercase font-semibold">
                                                    <th scope="col" className="w-12 px-4 py-3">No</th>
                                                    <th scope="col" className="px-4 py-3">Nama Tenaga Kerja</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Status Kehadiran Lapangan</th>
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
                                            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 print:hidden">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
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
                                                    <div key={p.id} className="group relative bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
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
                                                                aria-label={`Hapus foto KTP tenaga kerja ${idx + 1}`}
                                                                className="print:hidden absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                            >
                                                                <IconTrash className="w-3.5 h-3.5" aria-hidden="true" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                                                Belum ada berkas identitas (KTP) yang diunggah.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION C: Daftar Material, Peralatan & Barang Bawaan */}
                        {!isKegiatan && !isParkir && (activeTab === 'barang' || activeTab === 'all') && (
                            <div id="barang" className={`space-y-4 print:block ${activeTab === 'all' ? 'pt-6 border-t border-slate-200/80' : ''}`}>
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
                                    <>
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 hidden sm:block">
                                            <table className="w-full text-sm">
                                            <caption className="sr-only">Daftar material, peralatan, dan status pemeriksaan fisik</caption>
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left text-xs uppercase font-semibold">
                                                    <th scope="col" className="w-12 px-4 py-3">No</th>
                                                    <th scope="col" className="px-4 py-3">Deskripsi Material / Barang</th>
                                                    <th scope="col" className="px-4 py-3">Kuantitas</th>
                                                    <th scope="col" className="px-4 py-3">Satuan</th>
                                                    <th scope="col" className="px-4 py-3">Dokumentasi Fisik</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Status Pemeriksaan</th>
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
                                                                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs"
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
                                                                        className="print:hidden px-3 py-1 bg-[#0369A1]/10 hover:bg-[#0369A1]/20 text-[#0F1E36] rounded-full text-xs font-bold transition"
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
                                    {/* Kartu daftar untuk layar kecil: tabel 5 kolom terjepit di 375px */}
                                    <ul className="sm:hidden space-y-3">
                                        {goods.map((g, idx) => (
                                            <li key={g.id} id={`good-${g.id}-card`} className="rounded-lg border border-slate-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-semibold text-slate-900 text-sm">
                                                        <span className="text-slate-400 font-mono text-xs mr-1.5">{idx + 1}</span>
                                                        {g.description}
                                                    </p>
                                                    <Badge color={g.is_verified ? 'green' : 'gray'}>
                                                        {g.is_verified ? 'Terverifikasi' : 'Belum'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                                                    {g.quantity_note}{g.unit ? ` ${g.unit}` : ''}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2.5">
                                                    {g.photo_url ? (
                                                        <img
                                                            src={g.photo_url}
                                                            alt={`Dokumentasi ${g.description}`}
                                                            loading="lazy"
                                                            className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-300 italic">Belum ada foto</span>
                                                    )}
                                                    {canCompleteSecurityCheck && !g.is_verified && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExpandedGoodId(expandedGoodId === g.id ? null : g.id);
                                                                setTimeout(() => document.getElementById('good-verify')?.scrollIntoView({ block: 'nearest' }), 60);
                                                            }}
                                                            aria-expanded={expandedGoodId === g.id}
                                                            className="ml-auto print:hidden px-3 py-1.5 bg-[#0369A1]/10 hover:bg-[#0369A1]/20 text-[#0F1E36] rounded-lg text-xs font-bold transition"
                                                        >
                                                            {expandedGoodId === g.id ? 'Tutup' : 'Verifikasi'}
                                                        </button>
                                                    )}
                                                </div>
                                                {g.mismatch_note && (
                                                    <p className="text-xs text-amber-800 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                        Catatan Lapangan: {g.mismatch_note}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                                        Tidak ada daftar material atau barang bawaan yang dicatat pada permohonan ini.
                                    </div>
                                )}

                                {/* Form Verifikasi Foto Barang untuk Pos Security */}
                                {canCompleteSecurityCheck && expandedGood && !expandedGood.is_verified && (
                                    <div id="good-verify" className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 print:hidden scroll-mt-40">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
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
                    <div className="space-y-5 lg:sticky lg:top-20 order-first lg:order-none print:order-none">
                        {/* KARTU TERPADU ALUR PERSETUJUAN (WORKFLOW) */}
                        <div className="bg-white rounded-lg border border-slate-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Alur Persetujuan
                                </h3>
                                <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                                    {permit.approvals?.filter((a) => a.status === 'approved').length} dari {permit.approvals?.length} selesai
                                </span>
                            </div>

                            {/* Aksi persetujuan + cek fisik: di desktop tampil di sini, di mobile di atas dokumen */}
                            <div className="hidden lg:block">
                                <ApprovalActionBox
                                    isMyTurn={canTakeApprovalAction}
                                    currentStep={currentStep}
                                    rejectingId={rejectingId}
                                    setRejectingId={setRejectingId}
                                    reason={reason}
                                    setReason={setReason}
                                    rejectError={rejectError}
                                    approve={approve}
                                    reject={reject}
                                    canCompleteSecurityCheck={canCompleteSecurityCheck}
                                    completeSecurityCheck={completeSecurityCheck}
                                    allChecked={allChecked}
                                    doneTasks={doneTasks}
                                    totalTasks={totalTasks}
                                />
                            </div>

                            <ol className="mt-1" aria-label="Alur persetujuan">
                                {(permit.approvals || []).map((a, index, all) => {
                                    const isPendingHere = a.status === 'pending';
                                    const isApprovedHere = a.status === 'approved';
                                    const isRejectedHere = a.status === 'rejected';
                                    const isLast = index === all.length - 1;

                                    return (
                                        <li key={a.id} className="relative flex gap-3">
                                            {!isLast && (
                                                <span
                                                    className={`absolute left-2.5 top-6 bottom-0 w-px ${
                                                        isApprovedHere ? 'bg-emerald-200' : 'bg-slate-200'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            )}

                                            <span className="relative z-10 shrink-0 mt-0.5">
                                                <ApprovalStepNode status={a.status} />
                                            </span>

                                            <div className="min-w-0 flex-1 pb-4">
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
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* 4. RIWAYAT REVISI jika ada */}
                        {(permit.revisions ?? []).length > 0 && (
                            <div className="bg-white rounded-lg border border-slate-200 p-5">
                                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
                                    Riwayat Revisi ({permit.revisions.length})
                                </h3>
                                <RevisionTimeline revisions={permit.revisions} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi: batalkan permohonan / hapus foto KTP (pengganti confirm() native) */}
            <Modal
                open={Boolean(confirmAction)}
                onClose={() => setConfirmAction(null)}
                title={confirmAction === 'cancel' ? 'Batalkan Permohonan' : 'Hapus Foto KTP'}
                icon={<IconDocument className="w-5 h-5 text-slate-700" aria-hidden="true" />}
                maxWidth="max-w-sm"
            >
                <p className="text-sm text-slate-600 leading-relaxed">
                    {confirmAction === 'cancel'
                        ? 'Apakah Anda yakin ingin membatalkan permohonan izin kerja ini? Tindakan ini tidak dapat dibatalkan.'
                        : 'Hapus berkas foto identitas (KTP) ini? Berkas yang dihapus tidak dapat dikembalikan.'}
                </p>
                <div className="flex items-center justify-end gap-2 mt-5">
                    <button
                        type="button"
                        onClick={() => setConfirmAction(null)}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                        Kembali
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmAction}
                        className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition"
                    >
                        {confirmAction === 'cancel' ? 'Ya, Batalkan' : 'Ya, Hapus'}
                    </button>
                </div>
            </Modal>

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
            {!isParkir && !isCustomer && (
                <Modal
                    open={qrModalOpen}
                    onClose={() => setQrModalOpen(false)}
                    title="Kartu Akses Digital (QR Code)"
                    icon={
                        <IconQr className="w-5 h-5 text-slate-700" aria-hidden="true" />
                    }
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                            <div className="font-mono font-bold text-slate-900">{permit.permit_number}</div>
                            <div className="text-slate-600 mt-0.5 truncate">{locationTitle} • {location}</div>
                        </div>

                        {share ? (
                            <>
                                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <img
                                        src={share.qr}
                                        alt="QR Akses Digital"
                                        className="w-48 h-48 object-contain"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-2 text-center">
                                        Pindai kode QR untuk validasi resmi perizinan di pos pemeriksaan.
                                    </span>
                                    {share.scan_window && (
                                        <span className="text-[11px] text-amber-600 mt-1 text-center">
                                            QR hanya aktif {share.scan_window} WITA.
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 truncate border border-slate-200">
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
                                            className="py-2.5 px-3 text-center text-xs font-semibold text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-lg transition flex items-center justify-center gap-1.5"
                                        >
                                            <IconDownload className="w-4 h-4" aria-hidden="true" />
                                            <span>Unduh Label PDF</span>
                                        </a>
                                        <a
                                            href={share.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="py-2.5 px-3 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1.5"
                                        >
                                            <IconQr className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                            <span>Buka Halaman</span>
                                        </a>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-6 px-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500 leading-relaxed">
                                Kode QR verifikasi digital akan otomatis aktif dan dapat dipindai setelah permohonan disetujui secara lengkap.
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}

function InfoGroup({ title, id, children }) {
    return (
        <section id={id} className={id ? 'scroll-mt-24' : undefined}>
            <h3 className="pb-1.5 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                {title}
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {children}
            </dl>
        </section>
    );
}

function DetailField({ label, value, hint, wide = false, lead = false, children }) {
    return (
        <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className={`mt-0.5 text-slate-900 whitespace-pre-line break-words ${lead ? 'text-base font-semibold' : 'text-sm font-medium'}`}>
                {children || value || '—'}
            </dd>
            {hint && <dd className="text-xs text-slate-500 mt-0.5">{hint}</dd>}
        </div>
    );
}
