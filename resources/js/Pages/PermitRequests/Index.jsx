import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };

export default function Index({ permits, filters }) {
    const updateFilter = (value) => {
        router.get('/permit-requests', { status: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Surat Izin</h1>
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

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {permits.data.map((p) => (
                        <Link
                            key={p.id}
                            href={`/permit-requests/${p.id}`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 text-sm">
                                    {p.permit_number} — {p.store_name_snapshot}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{p.job_type} — {p.request_date}</p>
                            </div>
                            <Badge color={statusColor[p.status]}>{p.status}</Badge>
                        </Link>
                    ))}
                    {permits.data.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada surat izin.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}