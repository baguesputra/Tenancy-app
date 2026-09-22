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
import { formatDateID, formatDateRange, formatDateTimeID, formatTimeRange } from '@/utils/format';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };
const statusColor = { pending: 'yellow', completed: 'green', approved: 'green', rejected: 'red' };
const statusLabel = { pending: 'Menunggu Persetujuan', completed: 'Selesai', approved: 'Disetujui', rejected: 'Ditolak' };
const approvalLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const dotColor = { pending: 'bg-amber-400', approved: 'bg-emerald-500', rejected: 'bg-red-500' };

export default function Show({ permit, can_revise }) {
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');
    const [reviseOpen, setReviseOpen] = useState(false);

    const approve = (approvalId) => router.post(`/approvals/${approvalId}/approve`, {}, { preserveScroll: true });

    const reject = (approvalId) => {
        router.post(`/approvals/${approvalId}/reject`, { reason }, {
            preserveScroll: true,
            onSuccess: () => { setRejectingId(null); setReason(''); },
        });
    };

    const [verifyingGoodId, setVerifyingGoodId] = useState(null);
    const [workers, setWorkers] = useState(permit.workers);
    const [goods, setGoods] = useState(permit.goods);
    const [pendingWorkers, setPendingWorkers] = useState([]);

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
            onSuccess: () => scrollToId(`good-${goodId}`),
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

    const securityStep = permit.approvals.find((a) => a.step_key === 'security');
    const canCompleteSecurityCheck = securityStep?.status === 'pending'
        && securityStep?.department_id === permit.currentUserDepartmentId;

    const workersDone = workers.filter((w) => w.is_present).length;
    const goodsDone = goods.filter((g) => g.is_verified).length;
    const totalTasks = workers.length + goods.length;
    const doneTasks = workersDone + goodsDone;
    const allChecked = totalTasks > 0 && doneTasks === totalTasks;
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const activityLabels = permit.activity_types
        .map((val) => ACTIVITY_TYPES.find((t) => t.value === val)?.label ?? val);

    const location = [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot]
        .filter(Boolean).join(' / ') || '—';
    const category = (permit.activity_types ?? []).includes('pameran')
        ? { key: 'pameran', label: 'Pameran / Open Counter', color: 'coral' }
        : permit.tenant_id
        ? { key: 'tenant', label: 'Tenant', color: 'blue' }
        : (permit.is_external || (!permit.store_name_snapshot || permit.store_name_snapshot === 'Area Umum Mall') && permit.contractor_company)
        ? { key: 'vendor', label: 'Vendor', color: 'amber' }
        : { key: 'area', label: 'Area Duta Mall', color: 'gray' };
    const locationTitle = permit.tenant?.name
        ?? permit.contractor_company
        ?? permit.store_name_snapshot
        ?? '—';
    const currentStep = permit.approvals.find((a) => a.status === 'pending');

    return (
        <AppLayout>
            <div className="sticky top-14 z-10 bg-[#F7F8FA]/95 backdrop-blur border-b border-[#E2E5EA] px-6 sm:px-8 py-3">
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
                            {locationTitle} — {permit.job_type || 'Kegiatan'} — Diajukan {formatDateID(permit.request_date)}{currentStep ? ` — Menunggu: ${currentStep.label}` : ''}
                        </p>
                    </div>
                    {canCompleteSecurityCheck && (
                        <div className="w-36 shrink-0">
                            <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                                <span>Progress</span><span>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0F1E36] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}
                </div>
                <nav className="flex gap-1 mt-2 text-xs font-medium overflow-x-auto" aria-label="Lompat section">
                    {[
                        ['#detail', 'Detail'],
                        ['#pekerja', `Pekerja ${workersDone}/${workers.length}`],
                        ['#barang', `Barang ${goodsDone}/${goods.length}`],
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
                        <span>⚠</span> Ada ketidaksesuaian yang tercatat saat pemeriksaan fisik.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    <div>
                        <div id="detail" className="scroll-mt-40">
                            <FormSection title="Detail Permohonan" description={`${category.label} — ${locationTitle}`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <InfoItem label="Kategori" value={<Badge color={category.color}>{category.label}</Badge>} />
                                    <InfoItem label="Nomor Surat" value={permit.permit_number} />
                                    <InfoItem label="Diajukan Oleh" value={permit.requested_by_label} />
                                    <InfoItem label="Tanggal Pengajuan" value={formatDateID(permit.request_date)} />
                                    <InfoItem label="Lokasi" value={`${permit.store_name_snapshot} — ${location}`} />
                                    <InfoItem label="Penanggung Jawab" value={`${permit.pic_name ?? '—'} (${permit.pic_phone ?? '—'})`} />
                                    <InfoItem
                                        label="Jenis Kegiatan"
                                        value={
                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                {activityLabels.map((label) => (
                                                    <Badge key={label} color="blue">{label}</Badge>
                                                ))}
                                            </div>
                                        }
                                        className="sm:col-span-2"
                                    />
                                    <InfoItem label="Jenis Pekerjaan" value={permit.job_type || '—'} className="sm:col-span-2" />
                                    <InfoItem label="Tanggal Pelaksanaan" value={formatDateRange(permit.work_start_date, permit.work_end_date)} />
                                    <InfoItem label="Jam Pelaksanaan" value={formatTimeRange(permit.work_start_time, permit.work_end_time)} />
                                    <InfoItem label="Akses Masuk/Keluar" value={permit.access_route || '—'} className="sm:col-span-2" />
                                    {permit.notes && (
                                        <InfoItem label="Keterangan" value={permit.notes} className="sm:col-span-2" />
                                    )}
                                </div>

                                {(permit.is_external || permit.contractor_company) && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                            {category.key === 'vendor' ? 'Data Vendor' : 'Kontraktor Eksternal'}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                            <InfoItem label="Perusahaan" value={permit.contractor_company || '—'} />
                                            <InfoItem label="Penanggung Jawab" value={permit.contractor_pic || '—'} />
                                            <InfoItem label="Telp/HP/Fax" value={permit.contractor_phone || '—'} />
                                            <InfoItem label="Alamat" value={permit.contractor_address || '—'} />
                                        </div>
                                    </div>
                                )}

                                {permit.accompanying_departments?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1.5">Departemen Pendampingan</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {permit.accompanying_departments.map((d) => (
                                                <Badge key={d.id} color="gray">{d.name}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </FormSection>
                        </div>

                        <FormSection title="Pemeriksaan Fisik" description={canCompleteSecurityCheck ? `${doneTasks}/${totalTasks} selesai — ketuk untuk cek` : 'Hasil cek fisik'}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div id="pekerja" className="scroll-mt-40">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Pekerja <span className="text-gray-400">({workersDone}/{workers.length})</span>
                                    </h3>
                                    <div className="space-y-1">
                                        {workers.map((w) => (
                                            <div key={w.id} id={`worker-${w.id}`} className="flex justify-between items-center gap-2 py-2 scroll-mt-40 min-h-[44px]">
                                                <span className="text-sm text-gray-700">{w.name}</span>
                                                {canCompleteSecurityCheck ? (
                                                    <button
                                                        onClick={() => toggleWorker(w.id)}
                                                        disabled={pendingWorkers.includes(w.id)}
                                                        className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 min-h-[32px]
                                                            ${w.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        {pendingWorkers.includes(w.id) ? '…' : w.is_present ? '✓ Hadir' : 'Tandai Hadir'}
                                                    </button>
                                                ) : (
                                                    <Badge color={w.is_present ? 'green' : 'gray'}>
                                                        {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div id="barang" className="scroll-mt-40">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Barang <span className="text-gray-400">({goodsDone}/{goods.length})</span>
                                    </h3>
                                    <div className="space-y-4">
                                        {goods.map((g) => (
                                            <div key={g.id} id={`good-${g.id}`} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 scroll-mt-40 min-h-[120px]">
                                                <div className="flex justify-between items-center gap-2 mb-2">
                                                    <span className="text-sm text-gray-700">{g.description} ({g.quantity_note})</span>
                                                    <Badge color={g.is_verified ? 'green' : 'gray'}>
                                                        {g.is_verified ? '✓ Terverifikasi' : 'Belum dicek'}
                                                    </Badge>
                                                </div>
                                                {canCompleteSecurityCheck ? (
                                                    <GoodPhotoCapture
                                                        good={g}
                                                        canEdit={canCompleteSecurityCheck}
                                                        onSubmit={verifyGood}
                                                        onNoteUpdate={setGoodNote}
                                                        submitting={verifyingGoodId === g.id}
                                                    />
                                                ) : (
                                                    g.photo_url && (
                                                        <img src={g.photo_url} alt={`Foto ${g.description}`} loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200 mt-2" />
                                                    )
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </div>

                    <div id="approval" className="lg:sticky lg:top-[168px] space-y-4 scroll-mt-40">
                        {can_revise && (
                            <Button variant="secondary" onClick={() => setReviseOpen(true)} className="w-full justify-center">
                                Ajukan Revisi
                            </Button>
                        )}
                        {(permit.revisions ?? []).length > 0 && (
                            <FormSection title={`Riwayat Revisi (${permit.revisions.length})`}>
                                <RevisionTimeline revisions={permit.revisions} />
                            </FormSection>
                        )}
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

                                        {a.step_key !== 'security' && a.status === 'pending' && a.department_id === permit.currentUserDepartmentId && (
                                            <div className="mt-2.5 flex gap-2">
                                                <Button variant="success" onClick={() => approve(a.id)} className="!px-3 !py-1.5 text-xs">
                                                    Approve
                                                </Button>
                                                <Button variant="danger" onClick={() => setRejectingId(a.id)} className="!px-3 !py-1.5 text-xs">
                                                    Reject
                                                </Button>
                                            </div>
                                        )}

                                        {rejectingId === a.id && (
                                            <div className="mt-2.5">
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
                            <Button variant="primary" onClick={completeSecurityCheck} disabled={!allChecked} className="w-full !py-3 hidden lg:inline-flex">
                                Selesaikan Pengecekan ({doneTasks}/{totalTasks})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {canCompleteSecurityCheck && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
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
        </AppLayout>
    );
}

function InfoItem({ label, value, className = '' }) {
    return (
        <div className={className}>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <div className="text-sm text-gray-800">{value}</div>
        </div>
    );
}
