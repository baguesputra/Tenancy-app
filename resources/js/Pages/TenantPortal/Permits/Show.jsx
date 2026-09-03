import PortalLayout from '@/Layouts/PortalLayout';

const statusColors = {
    pending: 'text-yellow-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
};

export default function Show({ permit }) {
    return (
        <PortalLayout>
            <div className="p-6 max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">{permit.permit_number}</h1>
                <p className="text-sm text-gray-500 mb-6">{permit.job_type} — {permit.request_date}</p>

                <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                    <h2 className="font-semibold text-gray-700 mb-3">Progress Approval</h2>
                    <ul className="space-y-2">
                        {permit.approvals.map((a) => (
                            <li key={a.id} className="flex justify-between text-sm">
                                <span>{a.label}</span>
                                <span className={statusColors[a.status]}>{a.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                    <h2 className="font-semibold text-gray-700 mb-3">Daftar Pekerja</h2>
                    {permit.workers.map((w) => (
                        <p key={w.id} className="text-sm">
                            {w.name} — {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                        </p>
                    ))}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="font-semibold text-gray-700 mb-3">Daftar Barang</h2>
                    {permit.goods.map((g) => (
                        <p key={g.id} className="text-sm">
                            {g.description} ({g.quantity_note}) — {g.is_verified ? '✓ Terverifikasi' : 'Belum dicek'}
                        </p>
                    ))}
                </div>
            </div>
        </PortalLayout>
    );
}