import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import FormSection from '@/Components/Form/FormSection';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import GoodPhotoCapture from '@/Components/Security/GoodPhotoCapture';
import ReviseModal, { RevisionTimeline } from '@/Components/Permits/ReviseModal';
import FitoutStatementModal from '@/Components/Permits/FitoutStatementModal';
import DropdownMenu from '@/Components/DropdownMenu';
import { formatDateID, formatDateRange, formatDateTimeID, formatTimeRange } from '@/utils/format';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };
const statusColor = { pending: 'yellow', completed: 'green', approved: 'green', rejected: 'red', cancelled: 'gray' };
const statusLabel = { pending: 'Menunggu Persetujuan', completed: 'Selesai', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan' };
const approvalLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const dotColor = { pending: 'bg-amber-400', approved: 'bg-emerald-500', rejected: 'bg-red-500' };

export default function Show({ permit, can_revise, can_cancel, share, docFiles = {} }) {
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');
    const [reviseOpen, setReviseOpen] = useState(false);
    const [fitoutModalOpen, setFitoutModalOpen] = useState(false);

    const approve = (approvalId) => router.post(`/approvals/${approvalId}/approve`, {}, { preserveScroll: true });

    const reject = (approvalId) => {
        router.post(`/approvals/${approvalId}/reject`, { reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectingId(null); setReason(''); },
        });
    };

    const [verifyingGoodId, setVerifyingGoodId] = useState(null);
    const [expandedGoodId, setExpandedGoodId] = useState(null);
    const [workers, setWorkers] = useState(permit.workers);
    const [goods, setGoods] = useState(permit.goods);
    const [pendingWorkers, setPendingWorkers] = useState([]);
    const expandedGood = goods.find((g) => g.id === expandedGoodId) ?? null;

    useEffect(() => { setWorkers(permit.workers); }, [permit.workers]);
    useEffect(() => {
        setGoods((prev) => permit.goods.map((g) => {
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
        if (!confirm('Batalkan surat izin ini?')) return;
        router.post(`/permit-requests/${permit.id}/cancel`);
    };

    const securityStep = permit.approvals.find((a) => a.step_key === 'security');
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
        if (!confirm('Hapus foto KTP ini?')) return;
        router.delete(`/permit-ktp-photos/${photoId}`, { preserveScroll: true });
    };

    const activityLabels = permit.activity_types
        .map((val) => ACTIVITY_TYPES.find((t) => t.value === val)?.label ?? val);

    const location = [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot]
        .filter(Boolean).join(' / ') || '—';
    const isKegiatan = (permit.activity_types ?? []).some((v) => ['event', 'meeting_internal', 'stock_opname'].includes(v));
    const isFitout = (permit.activity_types ?? []).includes('fit_out');
    const isLembur = (permit.activity_types ?? []).includes('lembur');
    const hasContractor = Boolean(permit.contractor_pic);
    const kegiatanNameLabel = { event: 'Nama Event', meeting_internal: 'Nama Meeting', stock_opname: 'Nama Stock Opname' }[permit.activity_types?.[0]] ?? 'Nama Kegiatan';
    const category = (permit.activity_types ?? []).includes('pameran')
        ? { key: 'pameran', label: 'Pameran / Open Counter', color: 'coral' }
        : isKegiatan
        ? { key: 'kegiatan', label: 'Kegiatan', color: 'green' }
        : permit.tenant_id
        ? { key: 'tenant', label: 'Tenant', color: 'blue' }
        : { key: 'vendor', label: 'Vendor', color: 'amber' };
    const locationTitle = permit.tenant?.name
        ?? permit.contractor_company
        ?? permit.store_name_snapshot
        ?? '—';
    const currentStep = permit.approvals.find((a) => a.status === 'pending');

    const docIcon = (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
    );
    const docSections = [
        {
            title: 'Surat Ijin',
            items: [
                { label: 'Surat Ijin Kerja', description: 'PDF lengkap + approval & cek fisik', href: `/permit-requests/${permit.id}/pdf`, icon: docIcon, format: 'PDF' },
            ],
        },
        ...(isFitout ? [{
            title: 'Fit Out',
            items: [
                { label: 'Pernyataan Tenant', description: 'Pilih sumber data lalu unduh', onClick: () => setFitoutModalOpen(true), icon: docIcon, format: 'PDF' },
                ...(hasContractor
                    ? [{ label: 'Pernyataan Kontraktor', description: 'Data vendor di surat ini', href: `/permit-requests/${permit.id}/pernyataan-kontraktor`, icon: docIcon, format: 'PDF' }]
                    : [{ label: 'Pernyataan Kontraktor', disabled: true, disabledHint: 'Lengkapi data kontraktor di surat izin dulu', icon: docIcon, format: 'PDF' }]),
                { label: 'Tempel Unit', description: 'Dilekatkan di depan unit', href: `/permit-requests/${permit.id}/fitout-tempel`, icon: docIcon, format: 'PDF' },
                { label: 'Kode Fit Out', description: 'Kartu kontraktor / unit', href: `/permit-requests/${permit.id}/kode-fitout`, icon: docIcon, format: 'PDF' },
                { label: 'Peraturan Fit Out', description: 'Tata tertib pekerja fit out', href: `/permit-requests/${permit.id}/peraturan-fitout`, icon: docIcon, format: docFiles['peraturan-fitout'] ?? 'PDF' },
            ],
        }] : []),
        ...((permit.activity_types ?? []).some((v) => ['masuk_barang', 'fit_out'].includes(v)) ? [{
            title: 'Penitipan',
            items: [
                { label: 'Penitipan Barang', description: 'Ijin loading dock DM 1', href: `/permit-requests/${permit.id}/penitipan-barang`, icon: docIcon, format: docFiles['penitipan-barang'] ?? 'PDF' },
            ],
        }] : []),
        ...(isLembur ? [{
            title: 'Lembur',
            items: [
                { label: 'Tata Tertib Lembur', description: 'Ketentuan pekerja lembur', href: `/permit-requests/${permit.id}/tata-tertib-lembur`, icon: docIcon, format: docFiles['tata-tertib-lembur'] ?? 'PDF' },
            ],
        }] : []),
    ];
    const docsMenuIcon = (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
    );

    return (
        <AppLayout>
            <div className="sticky top-14 z-10 bg-[#F7F8FA]/95 backdrop-blur border-b border-[#E2E5EA] px-6 sm:px-8 py-3 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold text-gray-900 truncate">{permit.permit_number}</h1>
                            <Badge color={category.color}>{category.label}</Badge>
                            <Badge color={statusColor[permit.status] ?? 'gray'}>{statusLabel[permit.status] ?? permit.status}</Badge>
                            {permit.is_flagged && <Badge color="amber">⚠ flagged</Badge>}
                            {canCompleteSecurityCheck && <Badge color="blue">{doneTasks}/{totalTasks} dicek</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                            {locationTitle} — {permit.event_name || permit.job_type || 'Kegiatan'} — Diajukan {formatDateID(permit.request_date)}{currentStep ? ` — Menunggu: ${currentStep.label}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {canCompleteSecurityCheck && (
                            <div className="w-36">
                                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                                    <span>Progress</span><span>{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#0F1E36] transition-all" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        )}
                        <DropdownMenu label="Dokumen" icon={docsMenuIcon} sections={docSections} />
                    </div>
                </div>
                <nav className="flex gap-1 mt-2 text-xs font-medium overflow-x-auto print:hidden" aria-label="Lompat section">
                    {[
                        ['#detail', 'Detail'],
                        ...(!isKegiatan ? [
                            ['#pekerja', `Pekerja ${workersDone}/${workers.length}`],
                            ['#barang', `Barang ${goodsDone}/${goods.length}`],
                        ] : []),
                        ['#approval', 'Approval'],
                    ].map(([href, label]) => (
                        <a key={href} href={href} className="px-3 py-1.5 rounded-full text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 whitespace-nowrap transition-colors">
                            {label}
                        </a>
                    ))}
                </nav>
            </div>

            <div className="px-6 sm:px-8 py-6 flex-1 pb-28 lg:pb-6">
                {permit.is_flagged && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3.5 rounded-lg mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        Ada ketidaksesuaian yang tercatat saat pemeriksaan fisik.
                    </div>
                )}

                <div className="permit-print-grid grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div>
                        <div id="detail" className="scroll-mt-40">
                            <article className="permit-doc bg-white rounded-2xl border border-[#E2E5EA] shadow-sm px-6 py-8 sm:px-10 mb-6">
                                <div className="permit-doc-kop text-center border-b-2 border-[#0F1E36] pb-5">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Surat Izin Kegiatan</h2>
                                    <p className="text-sm text-gray-600 mt-1.5">
                                        Nomor: <span className="font-semibold text-gray-900">{permit.permit_number}</span>
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                                        <Badge color={category.color}>{category.label}</Badge>
                                        <Badge color={statusColor[permit.status] ?? 'gray'}>{statusLabel[permit.status] ?? permit.status}</Badge>
                                        {permit.is_flagged && <Badge color="amber">Perlu perhatian</Badge>}
                                    </div>
                                </div>

                                <DocSection numeral="I" title="Data Pemohon">
                                    <DocRow label="Kategori"><Badge color={category.color}>{category.label}</Badge></DocRow>
                                    <DocRow label="Diajukan Oleh">{permit.requested_by_label}</DocRow>
                                    <DocRow label="Tanggal Pengajuan">{formatDateID(permit.request_date)}</DocRow>
                                    <DocRow label="Penanggung Jawab">{`${permit.pic_name ?? '—'} (${permit.pic_phone ?? '—'})`}</DocRow>
                                </DocSection>

                                <DocSection numeral="II" title="Pelaksanaan Kegiatan">
                                    <DocRow label="Lokasi">{`${permit.store_name_snapshot} — ${location}`}</DocRow>
                                    <DocRow label="Jenis Kegiatan">
                                        <span className="flex flex-wrap gap-1.5">
                                            {activityLabels.map((label) => (
                                                <Badge key={label} color="blue">{label}</Badge>
                                            ))}
                                        </span>
                                    </DocRow>
                                    {isKegiatan ? (
                                        <>
                                            <DocRow label={kegiatanNameLabel}>{permit.event_name || '—'}</DocRow>
                                            <DocRow label="Area Event">{permit.event_area || '—'}</DocRow>
                                        </>
                                    ) : (
                                        <>
                                            <DocRow label="Jenis Pekerjaan">{permit.job_type || '—'}</DocRow>
                                            <DocRow label="Akses Masuk / Keluar">{permit.access_route || '—'}</DocRow>
                                        </>
                                    )}
                                    <DocRow label="Tanggal Pelaksanaan">{formatDateRange(permit.work_start_date, permit.work_end_date)}</DocRow>
                                    <DocRow label="Jam Pelaksanaan">{formatTimeRange(permit.work_start_time, permit.work_end_time)}</DocRow>
                                    {permit.notes && <DocRow label="Keterangan">{permit.notes}</DocRow>}
                                </DocSection>

                                {(permit.is_external || permit.contractor_company) && (
                                    <DocSection numeral="III" title={category.key === 'vendor' ? 'Data Vendor' : 'Kontraktor Eksternal'}>
                                        <DocRow label="Perusahaan">{permit.contractor_company || '—'}</DocRow>
                                        <DocRow label="Penanggung Jawab">{permit.contractor_pic || '—'}</DocRow>
                                        <DocRow label="Telp / HP / Fax">{permit.contractor_phone || '—'}</DocRow>
                                        <DocRow label="Alamat">{permit.contractor_address || '—'}</DocRow>
                                    </DocSection>
                                )}

                                {permit.accompanying_departments?.length > 0 && (
                                    <DocSection numeral={(permit.is_external || permit.contractor_company) ? 'IV' : 'III'} title="Departemen Pendampingan">
                                        <DocRow label="Departemen">
                                            <span className="flex flex-wrap gap-1.5">
                                                {permit.accompanying_departments.map((d) => (
                                                    <Badge key={d.id} color="gray">{d.name}</Badge>
                                                ))}
                                            </span>
                                        </DocRow>
                                    </DocSection>
                                )}
                            </article>
                        </div>

                        {!isKegiatan && (
                        <FormSection title="Pemeriksaan Fisik" description={canCompleteSecurityCheck ? `${doneTasks}/${totalTasks} selesai — ketuk untuk cek` : 'Hasil cek fisik'}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div id="pekerja" className="scroll-mt-40 overflow-x-auto">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Pekerja <span className="text-gray-400">({workersDone}/{workerTotal})</span>
                                    </h3>
                                    {isLegacyWorkers ? (
                                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                        <thead>
                                            <tr className="bg-[#0F1E36] text-white text-left">
                                                <th scope="col" className="w-10 px-3 py-2.5 font-semibold">No</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold">Nama Pekerja</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {workers.map((w, i) => (
                                                <tr key={w.id} id={`worker-${w.id}`} className="odd:bg-white even:bg-gray-50 scroll-mt-40">
                                                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                                                    <td className="px-3 py-2.5 text-gray-900">{w.name}</td>
                                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                        {canCompleteSecurityCheck ? (
                                                            <>
                                                                <button
                                                                    onClick={() => toggleWorker(w.id)}
                                                                    disabled={pendingWorkers.includes(w.id)}
                                                                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 min-h-[32px] print:hidden
                                                                        ${w.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                                >
                                                                    {pendingWorkers.includes(w.id) ? '…' : w.is_present ? '✓ Hadir' : 'Tandai Hadir'}
                                                                </button>
                                                                <span className="hidden print:inline">
                                                                    <Badge color={w.is_present ? 'green' : 'gray'}>
                                                                        {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                                                                    </Badge>
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <Badge color={w.is_present ? 'green' : 'gray'}>
                                                                {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    ) : (
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Jumlah pekerja: <span className="font-semibold tabular-nums">{ktpTarget} orang</span>
                                            <span className="text-gray-400"> — foto KTP minimal {ktpTarget} (boleh lebih)</span>
                                        </p>
                                        {canCompleteSecurityCheck && (
                                            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 print:hidden">
                                                <p className="text-xs font-medium text-gray-700 mb-2">Tambah foto KTP pekerja</p>
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
                                        {ktpPhotos.length > 0 ? (
                                            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {ktpPhotos.map((p) => (
                                                    <div key={p.id} className="relative group">
                                                        <img src={p.photo_url} alt="Foto KTP pekerja" loading="lazy" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                                                        {p.mismatch_note && (
                                                            <p className="text-[10px] text-amber-700 mt-1">Catatan: {p.mismatch_note}</p>
                                                        )}
                                                        {canCompleteSecurityCheck && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteKtp(p.id)}
                                                                aria-label="Hapus foto KTP"
                                                                className="print:hidden absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-xs text-gray-400">Belum ada foto KTP.</p>
                                        )}
                                    </div>
                                    )}
                                </div>

                                <div id="barang" className="scroll-mt-40 overflow-x-auto">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Barang <span className="text-gray-400">({goodsDone}/{goods.length})</span>
                                    </h3>
                                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                        <thead>
                                            <tr className="bg-[#0F1E36] text-white text-left">
                                                <th scope="col" className="w-10 px-3 py-2.5 font-semibold">No</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold">Barang</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold">Jumlah</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold">Satuan</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold">Foto</th>
                                                <th scope="col" className="px-3 py-2.5 font-semibold text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {goods.map((g, i) => (
                                                <tr key={g.id} id={`good-${g.id}`} className="odd:bg-white even:bg-gray-50 scroll-mt-40">
                                                    <td className="px-3 py-2.5 text-gray-500 align-top">{i + 1}</td>
                                                    <td className="px-3 py-2.5 text-gray-900 align-top">
                                                        {g.description}
                                                        {g.mismatch_note && (
                                                            <p className="text-xs text-amber-700 mt-0.5">Catatan: {g.mismatch_note}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap align-top">{g.quantity_note}</td>
                                                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap align-top">{g.unit ?? '—'}</td>
                                                    <td className="px-3 py-2.5 align-top">
                                                        {g.photo_url ? (
                                                            <img src={g.photo_url} alt={`Foto ${g.description}`} loading="lazy" className="w-12 h-12 object-cover rounded-md border border-gray-200" />
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right whitespace-nowrap align-top">
                                                        <Badge color={g.is_verified ? 'green' : 'gray'}>
                                                            {g.is_verified ? '✓ Terverifikasi' : 'Belum dicek'}
                                                        </Badge>
                                                        {canCompleteSecurityCheck && !g.is_verified && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedGoodId(expandedGoodId === g.id ? null : g.id);
                                                                    setTimeout(() => document.getElementById('good-verify')?.scrollIntoView({ block: 'nearest' }), 60);
                                                                }}
                                                                className="print:hidden ml-2 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors min-h-[32px]"
                                                            >
                                                                {expandedGoodId === g.id ? 'Tutup' : 'Verifikasi'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {canCompleteSecurityCheck && expandedGood && !expandedGood.is_verified && (
                                        <div id="good-verify" className="mt-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 print:hidden scroll-mt-40">
                                            <p className="text-xs font-medium text-gray-700 mb-2">
                                                Verifikasi: {expandedGood.description} ({expandedGood.quantity_note})
                                            </p>
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
                            </div>
                        </FormSection>
                        )}
                    </div>

                    <div id="approval" className="lg:sticky lg:top-[168px] space-y-4 scroll-mt-40">
                        {can_revise && (
                            <Button variant="secondary" onClick={() => setReviseOpen(true)} className="w-full justify-center print:hidden">
                                Ajukan Revisi
                            </Button>
                        )}
                        {can_cancel && (
                            <Button variant="danger" onClick={cancelPermit} className="w-full justify-center print:hidden">
                                Batalkan Pengajuan
                            </Button>
                        )}
                        {(permit.revisions ?? []).length > 0 && (
                            <FormSection title={`Riwayat Revisi (${permit.revisions.length})`}>
                                <RevisionTimeline revisions={permit.revisions} />
                            </FormSection>
                        )}
                        <FormSection title="QR Publik untuk Tenant" description="Dipindai tanpa login — cetak & berikan ke tenant">
                            {share ? (
                                <div className="flex items-start gap-3">
                                    <img src={share.qr} alt="QR publik surat izin" className="w-24 h-24 rounded-lg border border-gray-200 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap gap-2 mt-2.5 print:hidden">
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard?.writeText(share.url)}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                            >
                                                Salin link
                                            </button>
                                            <a
                                                href={`/permit-requests/${permit.id}/qr-label`}
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                            >
                                                Unduh kartu QR (PDF)
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">{isKegiatan ? 'QR aktif setelah izin selesai disetujui.' : 'QR aktif setelah izin selesai / disetujui Building Service.'}</p>
                            )}
                        </FormSection>
                        <FormSection title="Progress Approval" description={currentStep ? `Menunggu: ${currentStep.label}` : 'Semua tahap selesai'}>
                            <ol className="relative ml-1.5 border-l-2 border-gray-100 space-y-4">
                                {permit.approvals.map((a) => (
                                    <li key={a.id} className="pl-4 relative">
                                        <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${dotColor[a.status] ?? 'bg-gray-300'}`} aria-hidden="true" />
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700">{a.label}</span>
                                            <Badge color={approvalColor[a.status]}>{approvalLabel[a.status] ?? a.status}</Badge>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {a.status === 'approved'
                                                ? `Oleh ${a.approved_by?.name ?? '—'} — ${formatDateTimeID(a.approved_at)}`
                                                : a.status === 'rejected'
                                                ? `Oleh ${a.approved_by?.name ?? '—'} — ${formatDateTimeID(a.approved_at)}`
                                                : a.department?.name
                                                ? `Departemen ${a.department.name} — menunggu`
                                                : 'Menunggu'}
                                        </p>
                                        {a.notes && (
                                            <p className={`text-xs mt-1.5 rounded-lg px-2.5 py-1.5 border ${a.status === 'rejected' ? 'text-red-700 bg-red-50 border-red-100' : 'text-gray-600 bg-gray-50 border-gray-100'}`}>
                                                {a.notes}
                                            </p>
                                        )}

                                        {a.step_key === 'security' && a.status === 'pending' && (
                                            <p className="text-xs text-gray-400 mt-1.5">
                                                Centang semua pekerja & barang di kiri, lalu selesaikan pemeriksaan.
                                            </p>
                                        )}

                                        {a.step_key !== 'security' && a.status === 'pending' && a.department_id === permit.currentUserDepartmentId && (a.step_key !== 'marketing' || permit.can_approve_marketing) && (a.step_key !== 'tenant_manager' || permit.can_approve_tenant_manager) && (
                                            <div className="mt-2.5 flex gap-2 print:hidden">
                                                <Button variant="success" onClick={() => approve(a.id)} className="!px-3 !py-1.5 text-xs">
                                                    Approve
                                                </Button>
                                                <Button variant="danger" onClick={() => setRejectingId(a.id)} className="!px-3 !py-1.5 text-xs">
                                                    Reject
                                                </Button>
                                            </div>
                                        )}

                                        {rejectingId === a.id && (
                                            <div className="mt-2.5 print:hidden">
                                                <Textarea
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder="Alasan penolakan..."
                                                    rows={2}
                                                    className="text-xs"
                                                />
                                                <Button variant="danger" onClick={() => reject(a.id)} className="!px-3 !py-1.5 text-xs mt-2">
                                                    Kirim Penolakan
                                                </Button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </FormSection>

                        {canCompleteSecurityCheck && (
                            <Button variant="primary" onClick={completeSecurityCheck} disabled={!allChecked} className="w-full !py-3 hidden lg:inline-flex print:hidden">
                                Selesaikan Pengecekan ({doneTasks}/{totalTasks})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {canCompleteSecurityCheck && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 print:hidden">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">{doneTasks}/{totalTasks} dicek</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-[#0F1E36] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <Button variant="primary" onClick={completeSecurityCheck} disabled={!allChecked} className="!px-4 !py-2.5 text-sm shrink-0">
                        Selesaikan
                    </Button>
                </div>
            )}
            <ReviseModal
                open={reviseOpen}
                onClose={() => setReviseOpen(false)}
                permit={permit}
                postUrl={`/permit-requests/${permit.id}/revise`}
            />
            <FitoutStatementModal
                open={fitoutModalOpen}
                onClose={() => setFitoutModalOpen(false)}
                permit={permit}
            />
        </AppLayout>
    );
}

function DocSection({ numeral, title, children }) {
    return (
        <section className="permit-doc-section mt-7">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#0F1E36] border-b border-gray-200 pb-2">
                {numeral}. {title}
            </h3>
            <dl className="divide-y divide-gray-100">{children}</dl>
        </section>
    );
}

function DocRow({ label, children }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-0.5 sm:gap-4 py-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 sm:pt-0.5">{label}</dt>
            <dd className="text-sm text-gray-900 leading-relaxed">{children}</dd>
        </div>
    );
}
