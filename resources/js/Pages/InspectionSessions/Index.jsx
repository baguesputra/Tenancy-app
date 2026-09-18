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
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 w-full max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Riwayat Sesi Sidak</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{sessions.total} sesi tercatat</p>
                    </div>
                    <Link href="/inspection-sessions/current" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto justify-center !py-3 min-h-[48px]">Mulai / Lanjut Sesi</Button>
                    </Link>
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns}>
                        {sessions.data.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => router.visit(`/inspection-sessions/${session.id}`)}
                                className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                            >
                                <td className="px-5 py-3.5 font-medium text-gray-900">
                                    {new Date(session.started_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500">{session.branch?.name}</td>
                                <td className="px-5 py-3.5 text-gray-500">{session.inspections?.length ?? 0}</td>
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
                </div>

                <div className="sm:hidden space-y-2.5">
                    {sessions.data.map((session) => (
                        <Link
                            key={session.id}
                            href={`/inspection-sessions/${session.id}`}
                            className="block bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 min-h-[72px]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {new Date(session.started_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {session.branch?.name} · {session.inspections?.length ?? 0} tenant
                                    </p>
                                </div>
                                <Badge color={session.status === 'completed' ? 'gray' : 'yellow'} size="sm">
                                    {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {sessions.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">Belum ada riwayat sesi.</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">Mulai sesi pertama untuk inspeksi lapangan.</p>
                            <Link href="/inspection-sessions/current">
                                <Button className="justify-center !py-3 min-h-[48px]">Mulai Sesi</Button>
                            </Link>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={sessions} links={sessions.links} />
                </div>
            </div>
        </AppLayout>
    );
}
