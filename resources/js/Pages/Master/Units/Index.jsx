import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

export default function Index({ units, filters }) {
    const updateFilter = (value) => {
        router.get('/units', { search: value }, { preserveState: true });
    };

    const columns = [
        { key: 'code', label: 'Kode Unit' },
        { key: 'branch', label: 'Cabang' },
        { key: 'tenant', label: 'Tenant Saat Ini' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Master Unit</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{units.total} unit terdaftar</p>
                    </div>
                    <Link href="/units/create">
                        <Button>+ Tambah Unit</Button>
                    </Link>
                </div>

                <TextInput
                    placeholder="Cari kode unit / lantai / blok..."
                    defaultValue={filters.search}
                    onChange={(e) => updateFilter(e.target.value)}
                    className="max-w-sm mb-4"
                />

                <DataTable columns={columns}>
                    {units.data.map((unit) => (
                        <tr
                            key={unit.id}
                            onClick={() => router.visit(`/units/${unit.id}/edit`)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-900">{unit.unit_code}</td>
                            <td className="px-5 py-3.5 text-gray-500">{unit.branch.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">
                                {unit.active_tenancy?.tenant?.name ?? '—'}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={unit.is_occupied ? 'blue' : 'gray'}>
                                    {unit.is_occupied ? 'Terisi' : 'Kosong'}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                    {units.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                                Belum ada unit yang cocok.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={units} links={units.links} />
                </div>
            </div>
        </AppLayout>
    );
}