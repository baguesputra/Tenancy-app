import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';

const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    ended: 'bg-yellow-100 text-yellow-700',
    terminated: 'bg-red-100 text-red-700',
};

const statusLabels = {
    draft: 'Draft',
    active: 'Aktif',
    ended: 'Berakhir',
    terminated: 'Diakhiri',
};

export default function Index({ tenancies, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenancies', { ...filters, [key]: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Kontrak / Tenancy</h1>
                    <Link href="/tenancies/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                        + Tambah Tenancy
                    </Link>
                </div>

                <div className="flex gap-3 mb-4">
                    <input
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="border rounded px-3 py-2 text-sm flex-1"
                    />
                    <select
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="terminated">Diakhiri</option>
                    </select>
                </div>

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {tenancies.data.map((t) => (
                        <Link
                            key={t.id}
                            href={`/tenancies/${t.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50"
                        >
                            <div>
                                <p className="font-medium">
                                    {t.tenant.name} — {t.unit.unit_code}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {t.start_date} s/d {t.end_date ?? 'sekarang'}
                                    {t.contract_number && ` — No. ${t.contract_number}`}
                                </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${statusColors[t.status]}`}>
                                {statusLabels[t.status]}
                            </span>
                        </Link>
                    ))}
                    {tenancies.data.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">Belum ada data tenancy.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}