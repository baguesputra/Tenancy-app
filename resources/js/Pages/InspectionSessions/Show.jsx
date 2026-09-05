import { useForm, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Show({ session, availableTenants }) {
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);

    const filteredTenants = availableTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const submitAddTenant = (tenantId) => {
        setProcessing(true);
        router.post(`/inspection-sessions/${session.id}/tenants`,
            { tenant_id: tenantId },
            {
                onFinish: () => setProcessing(false),
            }
        );
    };

    const completeSession = () => {
        if (confirm('Yakin sesi sidak ini sudah selesai? Setelah ini tidak bisa diedit lagi.')) {
            router.post(`/inspection-sessions/${session.id}/complete`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Sesi Sidak</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Dimulai: {new Date(session.started_at).toLocaleString('id-ID')}
                </p>

                {/* Tenant yang sudah ditambahkan */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <h2 className="font-semibold text-gray-700 mb-3">
                        Tenant dalam sesi ini ({session.inspections.length})
                    </h2>
                    {session.inspections.length === 0 && (
                        <p className="text-sm text-gray-400">Belum ada tenant ditambahkan.</p>
                    )}
                    <ul className="space-y-2">
                        {session.inspections.map((inspection) => (
                            <li key={inspection.id}>
                                <Link
                                    href={`/inspections/${inspection.id}`}
                                    className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
                                >
                                    <div>
                                        <span className="font-medium">{inspection.tenant.name}</span>
                                        <span className="text-xs text-gray-400 ml-2">
                                            ({inspection.tenant.product_category?.name})
                                        </span>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded ${
                                            inspection.status === 'completed'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                    >
                                        {inspection.status === 'completed' ? 'Selesai' : 'Draft'}
                                        {inspection.is_flagged && ' ⚠️'}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Tambah tenant baru */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <h2 className="font-semibold text-gray-700 mb-3">Tambah Tenant</h2>
                    <input
                        type="text"
                        placeholder="Cari nama tenant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border rounded px-3 py-2 mb-3"
                    />
                    <ul className="space-y-1 max-h-64 overflow-y-auto">
                        {filteredTenants.map((tenant) => (
                            <li key={tenant.id}>
                                <button
                                    disabled={processing}
                                    onClick={() => submitAddTenant(tenant.id)}
                                    className="w-full text-left p-2 rounded hover:bg-blue-50 flex justify-between"
                                >
                                    <span>
                                        {tenant.name}
                                        {tenant.tenant_category === 'Anchor' && (
                                            <span className="text-xs text-amber-600 ml-1">★ Anchor</span>
                                        )}
                                    </span>
                                    <span className="text-xs text-gray-400">{tenant.unit_code}</span>
                                </button>
                            </li>
                        ))}
                        {filteredTenants.length === 0 && (
                            <p className="text-sm text-gray-400">Tidak ada tenant ditemukan.</p>
                        )}
                    </ul>
                </div>

                <button
                    onClick={completeSession}
                    className="w-full bg-green-600 text-white rounded py-3 font-medium"
                >
                    Selesaikan Sesi
                </button>
            </div>
        </div>
    );
}