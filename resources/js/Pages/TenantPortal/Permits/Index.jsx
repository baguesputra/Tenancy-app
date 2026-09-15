import PortalLayout from '@/Layouts/PortalLayout';
import { Link, router } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import StepProgressMini from '@/Components/StepProgressMini';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };

export default function Index({ permits }) {
    return (
        <PortalLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Surat Izin Saya</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{permits.total} pengajuan</p>
                    </div>
                    <Link href="/portal/permits/create">
                        <Button>+ Ajukan Baru</Button>
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E5EA] divide-y divide-gray-100">
                    {permits.data.map((p) => (
                        <Link
                            key={p.id}
                            href={`/portal/permits/${p.id}`}
                            className="flex justify-between items-center px-5 py-4 hover:bg-gray-50/80 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm">{p.permit_number}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{p.job_type || '—'} — {p.request_date}</p>
                                {p.step_progress?.length > 0 && (
                                    <div className="mt-2">
                                        <StepProgressMini steps={p.step_progress} />
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0 ml-4">
                                {p.status === 'pending' && p.current_step_label ? (
                                    <Badge color="yellow">Menunggu {p.current_step_label.replace('Approval ', '')}</Badge>
                                ) : (
                                    <Badge color={statusColor[p.status]}>
                                        {p.status === 'completed' ? 'Selesai' : p.status === 'rejected' ? 'Ditolak' : p.status}
                                    </Badge>
                                )}
                            </div>
                        </Link>
                    ))}
                    {permits.data.length === 0 && (
                        <p className="px-5 py-12 text-sm text-gray-400 text-center">Belum ada pengajuan.</p>
                    )}
                </div>
            </div>
        </PortalLayout>
    );
}