import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import EmptyState from '@/Components/EmptyState';
import useCan from '@/hooks/useCan';
import { formatDateTimeShortID, formatDurationID } from '@/utils/format';

export default function Index({ sessions }) {
    const { can } = useCan();
    const canManage = can('sidak.manage');
    const columns = [
        { key: 'start', label: 'Mulai' },
        { key: 'end', label: 'Selesai' },
        { key: 'duration', label: 'Durasi' },
        { key: 'pic', label: 'PIC' },
        { key: 'branch', label: 'Cabang' },
        { key: 'count', label: 'Jumlah Tenant' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-[#0F1E36] sm:text-2xl">Riwayat Sesi Sidak</h1>
                        <p className="mt-1 text-sm text-gray-500">{sessions.total} sesi tercatat</p>
                    </div>
                    {canManage && (
                        <Link href="/inspection-sessions/create" className="w-full shrink-0 sm:w-auto">
                            <Button className="min-h-11 w-full justify-center sm:w-auto">Tambah Sesi</Button>
                        </Link>
                    )}
                </header>

                <div className="hidden sm:mb-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                    <h2 className="text-base font-semibold text-[#0F1E36]">Semua sesi</h2>
                    <span className="text-sm text-gray-500">Pilih baris untuk membuka detail</span>
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns} caption="Riwayat sesi sidak">
                        {sessions.data.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => router.visit(`/inspection-sessions/${session.id}`)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        router.visit(`/inspection-sessions/${session.id}`);
                                    }
                                }}
                                tabIndex={0}
                                className="cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-900">
                                    {formatDateTimeShortID(session.started_at)}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                                    {session.ended_at ? formatDateTimeShortID(session.ended_at) : '—'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                                    {formatDurationID(session.started_at, session.ended_at)}
                                </td>
                                <td className="px-5 py-4 text-gray-700">{session.pic_name ?? '—'}</td>
                                <td className="px-5 py-4 text-gray-600">{session.branch?.name ?? '—'}</td>
                                <td className="px-5 py-4 text-gray-600">{session.inspections?.length ?? 0}</td>
                                <td className="px-5 py-4 text-right">
                                    <Badge color={session.status === 'completed' ? 'gray' : 'yellow'}>
                                        {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                        {sessions.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-8">
                                    <EmptyState
                                        variant="empty"
                                        size="md"
                                        title="Belum Ada Riwayat Sesi Sidak"
                                        description="Mulai sesi inspeksi lapangan pertama Anda untuk merekam data sidak tenant."
                                        action={
                                            canManage && (
                                                <Link href="/inspection-sessions/create">
                                                    <Button className="min-h-11 justify-center !py-2.5">Tambah Sesi</Button>
                                                </Link>
                                            )
                                        }
                                    />
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="space-y-3 sm:hidden">
                    {sessions.data.map((session) => (
                        <Link
                            key={session.id}
                            href={`/inspection-sessions/${session.id}`}
                            className="block min-h-[88px] rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-sm transition-colors active:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatDateTimeShortID(session.started_at)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        Selesai: {session.ended_at ? formatDateTimeShortID(session.ended_at) : '—'} · {formatDurationID(session.started_at, session.ended_at)}
                                    </p>
                                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                                        <div className="truncate"><dt className="sr-only">PIC</dt>PIC: {session.pic_name ?? '—'}</div>
                                        <div className="truncate"><dt className="sr-only">Cabang</dt>{session.branch?.name ?? '—'}</div>
                                        <div><dt className="sr-only">Jumlah tenant</dt>{session.inspections?.length ?? 0} tenant</div>
                                    </dl>
                                </div>
                                <Badge color={session.status === 'completed' ? 'gray' : 'yellow'} size="sm">
                                    {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {sessions.data.length === 0 && (
                        <div className="rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-sm">
                            <EmptyState
                                variant="empty"
                                size="sm"
                                title="Belum Ada Riwayat Sesi"
                                description="Mulai sesi pertama untuk inspeksi lapangan."
                                action={
                                    canManage && (
                                        <Link href="/inspection-sessions/create">
                                            <Button className="min-h-11 w-full justify-center !py-2.5">Tambah Sesi</Button>
                                        </Link>
                                    )
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
