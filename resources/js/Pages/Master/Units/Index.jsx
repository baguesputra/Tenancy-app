import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

export default function Index({ units, filters }) {
    const updateFilter = (value) => {
        router.get('/units', { search: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Master Unit</h1>
                    <Link href="/units/create">
                        <Button>+ Tambah Unit</Button>
                    </Link>
                </div>

                <TextInput
                    placeholder="Cari kode unit / lantai / blok..."
                    defaultValue={filters.search}
                    onChange={(e) => updateFilter(e.target.value)}
                    className="mb-4"
                />

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {units.data.map((unit) => (
                        <Link
                            key={unit.id}
                            href={`/units/${unit.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{unit.unit_code}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {unit.branch.name}
                                    {unit.is_occupied && unit.active_tenancy?.tenant && ` — ${unit.active_tenancy.tenant.name}`}
                                </p>
                            </div>
                            <Badge color={unit.is_occupied ? 'blue' : 'gray'}>
                                {unit.is_occupied ? 'Terisi' : 'Kosong'}
                            </Badge>
                        </Link>
                    ))}
                    {units.data.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada unit.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}