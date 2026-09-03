import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

export default function Index({ permits }) {
    return (
        <PortalLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Surat Izin Saya</h1>
                    <Link href="/portal/permits/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                        + Ajukan Baru
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {permits.data.map((p) => (
                        <Link key={p.id} href={`/portal/permits/${p.id}`} className="flex justify-between items-center p-4 hover:bg-gray-50">
                            <div>
                                <p className="font-medium">{p.permit_number}</p>
                                <p className="text-xs text-gray-400">{p.job_type} — {p.request_date}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${statusColors[p.status]}`}>{p.status}</span>
                        </Link>
                    ))}
                    {permits.data.length === 0 && <p className="p-4 text-sm text-gray-400">Belum ada pengajuan.</p>}
                </div>
            </div>
        </PortalLayout>
    );
}