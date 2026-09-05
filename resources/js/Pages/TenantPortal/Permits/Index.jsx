import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };

export default function Index({ permits }) {
    return (
        <PortalLayout>
            <div className="p-6 max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Surat Izin Saya</h1>
                    <Link href="/portal/permits/create">
                        <Button>+ Ajukan Baru</Button>
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {permits.data.map((p) => (
                        <Link key={p.id} href={`/portal/permits/${p.id}`} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{p.permit_number}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{p.job_type} — {p.request_date}</p>
                            </div>
                            <Badge color={statusColor[p.status]}>{p.status}</Badge>
                        </Link>
                    ))}
                    {permits.data.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada pengajuan.</p>
                    )}
                </div>
            </div>
        </PortalLayout>
    );
}