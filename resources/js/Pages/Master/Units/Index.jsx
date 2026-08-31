import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';

export default function Index({ units, filters }) {
    const updateFilter = (value) => {
        router.get('/units', { search: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Master Unit</h1>
                    <Link href="/units/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                        + Tambah Unit
                    </Link>
                </div>

                <input
                    placeholder="Cari kode unit / lantai / blok..."
                    defaultValue={filters.search}
                    onChange={(e) => updateFilter(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-full mb-4"
                />

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {units.data.map((unit) => (
                        <Link
                            key={unit.id}
                            href={`/units/${unit.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50"
                        >
                            <div>
                                <p className="font-medium">{unit.unit_code}</p>
                                <p className="text-xs text-gray-400">
                                    {unit.branch.name}
                                    {unit.is_occupied && unit.active_tenancy?.tenant &&
                                        ` — ${unit.active_tenancy.tenant.name}`}
                                </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded ${
                                    unit.is_occupied
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {unit.is_occupied ? 'Terisi' : 'Kosong'}
                            </span>
                        </Link>
                    ))}
                    {units.data.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">Belum ada unit.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}