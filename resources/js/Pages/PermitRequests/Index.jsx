import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };

export default function Index({ permits, filters }) {
    const updateFilter = (value) => {
        router.get('/permit-requests', { status: value }, { preserveState: true });
    };

    const columns = [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'job', label: 'Jenis Pekerjaan' },
        { key: 'date', label: 'Tanggal' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Surat Izin</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{permits.total} pengajuan</p>
                    </div>
                    <Link href="/permit-requests/create">
                        <Button>+ Ajukan Atas Nama Tenant</Button>
                    </Link>
                </div>

                <SelectInput
                    defaultValue={filters.status ?? ''}
                    onChange={(e) => updateFilter(e.target.value)}
                    className="sm:w-48 mb-4"
                >
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                </SelectInput>

                <DataTable columns={columns}>
                    {permits.data.map((p) => (
                        <tr
                            key={p.id}
                            onClick={() => router.visit(`/permit-requests/${p.id}`)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-900">{p.permit_number}</td>
                            <td className="px-5 py-3.5 text-gray-500">{p.store_name_snapshot}</td>
                            <td className="px-5 py-3.5 text-gray-500">{p.job_type ?? '—'}</td>
                            <td className="px-5 py-3.5 text-gray-500">{p.request_date}</td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={statusColor[p.status]}>{p.status}</Badge>
                            </td>
                        </tr>
                    ))}
                    {permits.data.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                                Belum ada surat izin.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={permits} links={permits.links} />
                </div>
            </div>
        </AppLayout>
    );
}