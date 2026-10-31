import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import EmptyState from '@/Components/EmptyState';
import useCan from '@/hooks/useCan';

export default function Index({ sessions }) {
    const { can } = useCan();
    const canManage = can('sidak.manage');
    const columns = [
        { key: 'date', label: 'Tanggal' },
        { key: 'pic', label: 'PIC' },
        { key: 'branch', label: 'Cabang' },
        { key: 'count', label: 'Jumlah Tenant' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-5 sm:py-7 flex-1 w-full max-w-6xl mx-auto">
                <div className="mb-6 flex flex-col gap-4 border-b border-[#E2E5EA] pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Operasional</p>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#0F1E36] sm:text-2xl">Riwayat Sesi Sidak</h1>
                        <p className="mt-1 text-sm text-gray-500">Pantau pelaksanaan inspeksi tenant berdasarkan sesi.</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-xs font-medium text-gray-500">{sessions.total} sesi tercatat</span>
                        {canManage && (
                            <Link href="/inspection-sessions/create" className="shrink-0 sm:w-auto">
                                <Button className="justify-center !py-2.5">Tambah Sesi</Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block [&>div]:border-b-0 [&>div]:shadow-none">
                    <DataTable columns={columns}>
                        {sessions.data.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => router.visit(`/inspection-sessions/${session.id}`)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') router.visit(`/inspection-sessions/${session.id}`);
                                }}
                                tabIndex={0}
                                className="cursor-pointer transition-colors hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                <td className="px-5 py-3.5 font-medium text-gray-900">
                                    {new Date(session.started_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                </td>
                                <td className="px-5 py-3.5 text-gray-700">{session.pic_name ?? '—'}</td>
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
                                <td colSpan={5} className="px-5 py-6">
                                    <EmptyState
                                        variant="empty"
                                        size="md"
                                        title="Belum Ada Riwayat Sesi Sidak"
                                        description="Mulai sesi inspeksi lapangan pertama Anda untuk merekam data sidak tenant."
                                        action={
                                            canManage && (
                                                <Link href="/inspection-sessions/create">
                                                    <Button className="justify-center !py-2.5">Tambah Sesi</Button>
                                                </Link>
                                            )
                                        }
                                    />
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
                            className="block min-h-[72px] rounded-xl border border-[#E2E5EA] bg-white p-4 shadow-sm transition-colors active:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {new Date(session.started_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        PIC {session.pic_name ?? '—'} · {session.branch?.name} · {session.inspections?.length ?? 0} tenant
                                    </p>
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
                                            <Button className="justify-center !py-2.5 w-full">Tambah Sesi</Button>
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
