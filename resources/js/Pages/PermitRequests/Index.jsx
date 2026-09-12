import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StepProgressMini from '@/Components/StepProgressMini';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red' };

export default function Index({ permits, filters }) {
    const updateFilter = (value) => {
        router.get('/permit-requests', { status: value }, { preserveState: true });
    };

    const myTurnCount = permits.data.filter((p) => p.is_my_turn).length;

    const columns = [
        { key: 'number', label: 'Nomor Surat' },
        { key: 'location', label: 'Lokasi / Tenant' },
        { key: 'progress', label: 'Progress' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Surat Izin</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{permits.total} pengajuan</p>
                    </div>
                    <Link href="/permit-requests/create">
                        <Button>+ Ajukan Atas Nama Tenant</Button>
                    </Link>
                </div>

                {myTurnCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <p className="text-sm text-amber-800">
                            Ada <span className="font-semibold">{myTurnCount}</span> permohonan menunggu tindakan kamu.
                        </p>
                    </div>
                )}

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
                            className={`cursor-pointer transition-colors ${
                                p.is_my_turn ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/80'
                            }`}
                        >
                            <td className="px-5 py-3.5">
                                <p className="font-medium text-gray-900">{p.permit_number}</p>
                                {p.is_my_turn && (
                                    <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                                        Menunggu Anda
                                    </span>
                                )}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{p.store_name_snapshot}</td>
                            <td className="px-5 py-3.5">
                                {p.step_progress?.length > 0 ? (
                                    <StepProgressMini steps={p.step_progress} />
                                ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                {p.status === 'pending' && p.current_step_label ? (
                                    <Badge color="yellow">Menunggu {p.current_step_label.replace('Approval ', '')}</Badge>
                                ) : (
                                    <Badge color={statusColor[p.status]}>{p.status === 'completed' ? 'Selesai' : p.status === 'rejected' ? 'Ditolak' : p.status}</Badge>
                                )}
                            </td>
                        </tr>
                    ))}
                    {permits.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
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