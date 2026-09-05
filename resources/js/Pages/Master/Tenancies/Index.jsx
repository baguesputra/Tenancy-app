import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

const statusColor = { draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red' };
const statusLabel = { draft: 'Draft', active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri' };

export default function Index({ tenancies, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenancies', { ...filters, [key]: value }, { preserveState: true });
    };

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'unit', label: 'Unit' },
        { key: 'period', label: 'Periode' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Kontrak / Tenancy</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenancies.total} kontrak tercatat</p>
                    </div>
                    <Link href="/tenancies/create">
                        <Button>+ Tambah Tenancy</Button>
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1 max-w-sm"
                    />
                    <SelectInput
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="terminated">Diakhiri</option>
                    </SelectInput>
                </div>

                <DataTable columns={columns}>
                    {tenancies.data.map((t) => (
                        <tr
                            key={t.id}
                            onClick={() => router.visit(`/tenancies/${t.id}/edit`)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-900">{t.tenant.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">{t.unit.unit_code}</td>
                            <td className="px-5 py-3.5 text-gray-500">
                                {t.start_date} s/d {t.end_date ?? 'sekarang'}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={statusColor[t.status]}>{statusLabel[t.status]}</Badge>
                            </td>
                        </tr>
                    ))}
                    {tenancies.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                                Belum ada data tenancy.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={tenancies} links={tenancies.links} />
                </div>
            </div>
        </AppLayout>
    );
}