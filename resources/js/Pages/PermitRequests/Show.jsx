import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const statusColors = {
    pending: 'text-yellow-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
};

export default function Show({ permit, currentUserDepartmentId }) {
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState('');

    const approve = (approvalId) => {
        router.post(`/approvals/${approvalId}/approve`);
    };

    const reject = (approvalId) => {
        router.post(`/approvals/${approvalId}/reject`, { reason }, {
            onSuccess: () => { setRejectingId(null); setReason(''); },
        });
    };

    const toggleWorker = (workerId) => {
        router.post(`/permit-workers/${workerId}/toggle`);
    };

    const verifyGood = (goodId, file) => {
        const formData = new FormData();
        if (file) formData.append('photo', file);
        router.post(`/permit-goods/${goodId}/verify`, formData);
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">{permit.permit_number}</h1>
                <p className="text-sm text-gray-500 mb-6">
                    {permit.store_name_snapshot} — {permit.job_type} — {permit.request_date}
                </p>

                <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                    <h2 className="font-semibold text-gray-700 mb-3">Progress Approval</h2>
                    <ul className="space-y-3">
                        {permit.approvals.map((a) => (
                            <li key={a.id} className="border-b pb-3 last:border-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{a.label}</span>
                                    <span className={`text-xs ${statusColors[a.status]}`}>{a.status}</span>
                                </div>

                                {/* Tahap Security: tidak ada tombol approve/reject di sini,
                                    cukup instruksi arahkan ke checklist di bawah */}
                                {a.step_key === 'security' && a.status === 'pending' && a.department_id === currentUserDepartmentId && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Centang semua pekerja & barang di bawah, lalu klik "Selesaikan Pengecekan".
                                    </p>
                                )}

                                {/* Tahap selain Security: approve/reject generik seperti biasa */}
                                {a.step_key !== 'security' && a.status === 'pending' && a.department_id === currentUserDepartmentId && (
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => approve(a.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">
                                            Approve
                                        </button>
                                        <button onClick={() => setRejectingId(a.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded">
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                    <h2 className="font-semibold text-gray-700 mb-3">Daftar Pekerja</h2>
                    {permit.workers.map((w) => (
                        <div key={w.id} className="flex justify-between items-center py-1">
                            <span className="text-sm">{w.name}</span>
                            <button
                                onClick={() => toggleWorker(w.id)}
                                className={`text-xs px-2 py-1 rounded ${w.is_present ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {w.is_present ? '✓ Hadir' : 'Tandai Hadir'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-3">Daftar Barang</h2>
                    {permit.goods.map((g) => (
                        <div key={g.id} className="border-b pb-3 mb-3 last:border-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">{g.description} ({g.quantity_note})</span>
                                <span className={`text-xs px-2 py-1 rounded ${g.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {g.is_verified ? '✓ Terverifikasi' : 'Belum dicek'}
                                </span>
                            </div>
                            {!g.is_verified && (
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => verifyGood(g.id, e.target.files[0])}
                                    className="text-xs"
                                />
                            )}
                        </div>
                    ))}
                </div>
                {permit.is_flagged && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3 rounded mb-4">
                            ⚠️ Ada ketidaksesuaian yang tercatat saat pemeriksaan fisik.
                        </div>
                    )}

                    {permit.approvals.find(a => a.step_key === 'security')?.status === 'pending'
                        && currentUserDepartmentId === permit.approvals.find(a => a.step_key === 'security')?.department_id && (
                        <button
                            onClick={() => router.post(`/permit-requests/${permit.id}/complete-security-check`)}
                            className="w-full bg-blue-600 text-white rounded py-3 font-medium mt-4"
                        >
                            Selesaikan Pengecekan
                        </button>
                    )}
            </div>
        </AppLayout>
    );
}