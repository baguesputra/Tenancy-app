import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

export default function Index({ sessions }) {
    const columns = [
        { key: 'date', label: 'Tanggal' },
        { key: 'branch', label: 'Cabang' },
        { key: 'count', label: 'Jumlah Tenant' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Riwayat Sesi Sidak</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{sessions.total} sesi tercatat</p>
                    </div>
                    <Link href="/inspection-sessions/current">
                        <Button>Mulai / Lanjut Sesi</Button>
                    </Link>
                </div>

                <DataTable columns={columns}>
                    {sessions.data.map((session) => (
                        <tr
                            key={session.id}
                            onClick={() => router.visit(`/inspection-sessions/${session.id}`)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-900">
                                {new Date(session.started_at).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{session.branch.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">{session.inspections.length}</td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={session.status === 'completed' ? 'gray' : 'yellow'}>
                                    {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                    {sessions.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                                Belum ada riwayat sesi.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={sessions} links={sessions.links} />
                </div>
            </div>
        </AppLayout>
    );
}