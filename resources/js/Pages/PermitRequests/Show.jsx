import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import FormSection from '@/Components/Form/FormSection';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import GoodPhotoCapture from '@/Components/Security/GoodPhotoCapture';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };

export default function Show({ permit }) {
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');

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

    const activityLabels = permit.activity_types
        .map((val) => ACTIVITY_TYPES.find((t) => t.value === val)?.label ?? val);

    const location = [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot]
        .filter(Boolean).join(' / ') || '—';

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{permit.permit_number}</h1>
                <p className="text-sm text-gray-500 mb-6">
                    {permit.store_name_snapshot} — {permit.job_type} — {permit.request_date}
                </p>

                {permit.is_flagged && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3.5 rounded-lg mb-4 flex items-center gap-2">
                        <span>⚠</span> Ada ketidaksesuaian yang tercatat saat pemeriksaan fisik.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    {/* Kolom kiri */}
                    <div>
                        {/* Detail Permohonan — info lengkap untuk bahan approval */}
                        <FormSection title="Detail Permohonan">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <InfoItem label="Diajukan Oleh" value={permit.requested_by_label} />
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
                                />
                                <InfoItem label="Tanggal Pelaksanaan" value={`${permit.work_start_date} s/d ${permit.work_end_date}`} />
                                <InfoItem label="Jam Pelaksanaan" value={`${permit.work_start_time ?? '—'} s/d ${permit.work_end_time ?? '—'}`} />
                                <InfoItem label="Akses Masuk/Keluar" value={permit.access_route || '—'} className="sm:col-span-2" />
                                {permit.notes && (
                                    <InfoItem label="Keterangan" value={permit.notes} className="sm:col-span-2" />
                                )}
                            </div>

                            {permit.is_external && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Kontraktor Eksternal
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                        <InfoItem label="Perusahaan" value={permit.contractor_company || '—'} />
                                        <InfoItem label="Penanggung Jawab" value={permit.contractor_pic || '—'} />
                                        <InfoItem label="Telp/HP/Fax" value={permit.contractor_phone || '—'} />
                                        <InfoItem label="Alamat" value={permit.contractor_address || '—'} />
                                    </div>
                                    {permit.accompanying_departments?.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-500 mb-1.5">Departemen Pendampingan</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {permit.accompanying_departments.map((d) => (
                                                    <Badge key={d.id} color="gray">{d.name}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </FormSection>

                        {/* Pemeriksaan Fisik — pekerja & barang, 2 kolom */}
                        <FormSection title="Pemeriksaan Fisik">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Pekerja
                                    </h3>
                                    <div className="space-y-1">
                                        {workers.map((w) => (
                                            <div key={w.id} id={`worker-${w.id}`} className="flex justify-between items-center py-1.5 scroll-mt-20">
                                                <span className="text-sm text-gray-700">{w.name}</span>
                                                {canCompleteSecurityCheck ? (
                                                    <button
                                                        onClick={() => toggleWorker(w.id)}
                                                        disabled={pendingWorkers.includes(w.id)}
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-60
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

                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Barang
                                    </h3>
                                    <div className="space-y-4">
                                        {goods.map((g) => (
                                            <div key={g.id} id={`good-${g.id}`} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 scroll-mt-20 min-h-[120px]">
                                                <div className="flex justify-between items-center mb-2">
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

                    {/* Kolom kanan — sticky */}
                    <div className="lg:sticky lg:top-[72px] space-y-4">
                        <FormSection title="Progress Approval">
                            <ul className="space-y-3">
                                {permit.approvals.map((a) => (
                                    <li key={a.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">{a.label}</span>
                                            <Badge color={approvalColor[a.status]}>{a.status}</Badge>
                                        </div>

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
                            </ul>
                        </FormSection>

                        {canCompleteSecurityCheck && (
                            <Button variant="primary" onClick={completeSecurityCheck} className="w-full !py-3">
                                Selesaikan Pengecekan
                            </Button>
                        )}
                    </div>
                </div>
            </div>
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