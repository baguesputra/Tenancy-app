import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';
import FormSection from '@/Components/Form/FormSection';
import Textarea from '@/Components/Form/Textarea';
import FileInput from '@/Components/Form/FileInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };

export default function Show({ permit }) {
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');

    const approve = (approvalId) => router.post(`/approvals/${approvalId}/approve`);

    const reject = (approvalId) => {
        router.post(`/approvals/${approvalId}/reject`, { reason }, {
            onSuccess: () => { setRejectingId(null); setReason(''); },
        });
    };

    const toggleWorker = (workerId) => router.post(`/permit-workers/${workerId}/toggle`);

    const verifyGood = (goodId, file) => {
        const formData = new FormData();
        if (file) formData.append('photo', file);
        router.post(`/permit-goods/${goodId}/verify`, formData);
    };

    const setGoodNote = (goodId, note) => {
        router.post(`/permit-goods/${goodId}/verify`, { mismatch_note: note });
    };

    const completeSecurityCheck = () => {
        router.post(`/permit-requests/${permit.id}/complete-security-check`);
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
                                        {permit.workers.map((w) => (
                                            <div key={w.id} className="flex justify-between items-center py-1.5">
                                                <span className="text-sm text-gray-700">{w.name}</span>
                                                <button
                                                    onClick={() => toggleWorker(w.id)}
                                                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                                                        ${w.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {w.is_present ? '✓ Hadir' : 'Tandai Hadir'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                        Daftar Barang
                                    </h3>
                                    <div className="space-y-4">
                                        {permit.goods.map((g) => (
                                            <div key={g.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-700">{g.description} ({g.quantity_note})</span>
                                                    <Badge color={g.is_verified ? 'green' : 'gray'}>
                                                        {g.is_verified ? '✓' : 'Belum'}
                                                    </Badge>
                                                </div>
                                                {!g.is_verified && (
                                                    <div className="space-y-2">
                                                        <FileInput accept="image/*" capture="environment" onChange={(e) => verifyGood(g.id, e.target.files[0])} />
                                                        <input
                                                            placeholder="Catatan ketidaksesuaian (opsional)"
                                                            onBlur={(e) => setGoodNote(g.id, e.target.value)}
                                                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-100"
                                                        />
                                                    </div>
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

                                        {a.step_key !== 'security' && a.status === 'pending' && (
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