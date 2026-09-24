import PortalLayout from '@/Layouts/PortalLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import StepProgressMini from '@/Components/StepProgressMini';
import Pagination from '@/Components/Pagination';
import TextInput from '@/Components/Form/TextInput';
import { formatDateID } from '@/utils/format';

const statusColor = { pending: 'yellow', completed: 'green', rejected: 'red', cancelled: 'gray' };
const statusLabel = { pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan' };

const tabs = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Antre' },
    { value: 'completed', label: 'Selesai' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'cancelled', label: 'Dibatalkan' },
];

export default function Index({ permits, filters }) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const apply = (patch) => {
        router.get('/portal/permits', { status: filters?.status ?? '', search, ...patch }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const onSearch = (value) => {
        setSearch(value);
        router.get('/portal/permits', { status: filters?.status ?? '', search: value }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <PortalLayout>
            <div className="flex items-start justify-between gap-4 animate-stagger-in">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Surat Izin Saya</h1>
                    <p className="text-sm text-gray-500 mt-1">{permits.total} pengajuan</p>
                </div>
                <Link
                    href="/portal/permits/create"
                    className="shrink-0 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                >
                    + Ajukan Izin
                </Link>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-stagger-in" style={{ animationDelay: '60ms' }}>
                <div className="inline-flex items-center gap-1 bg-white border border-[#E2E5EA] rounded-full p-1 w-fit" role="tablist" aria-label="Filter status">
                    {tabs.map((t) => {
                        const active = (filters?.status ?? '') === t.value;
                        return (
                            <button
                                key={t.value}
                                role="tab"
                                aria-selected={active}
                                onClick={() => apply({ status: t.value })}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    active ? 'bg-[#0F1E36] text-white' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
                <div className="sm:ml-auto sm:w-64">
                    <TextInput
                        placeholder="Cari nomor / pekerjaan…"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        aria-label="Cari surat izin"
                    />
                </div>
            </div>

            <div className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden animate-stagger-in" style={{ animationDelay: '120ms' }}>
                <div className="divide-y divide-gray-100">
                    {permits.data.map((p) => (
                        <Link
                            key={p.id}
                            href={`/portal/permits/${p.id}`}
                            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-mono font-semibold text-gray-900 text-sm truncate">{p.permit_number}</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{p.job_type || '—'} — {formatDateID(p.request_date)}</p>
                                {p.step_progress?.length > 0 && p.status === 'pending' && (
                                    <div className="mt-2.5 max-w-[220px]">
                                        <StepProgressMini steps={p.step_progress} />
                                        {p.current_step_label && (
                                            <p className="text-[11px] text-gray-400 mt-1">Menunggu: {shortStep(p.current_step_label)}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0 pt-0.5">
                                <Badge color={statusColor[p.status]} variant="soft" size="sm">
                                    {p.status === 'pending' && p.current_step_label ? `Antre ${shortStep(p.current_step_label)}` : statusLabel[p.status]}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                    {permits.data.length === 0 && (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">{emptyTitle(filters)}</p>
                            <p className="text-xs text-gray-400 mt-1">{emptyHint(filters)}</p>

                        </div>
                    )}
                </div>
                <Pagination meta={permits} links={permits.links} />
            </div>
        </PortalLayout>
    );
}

function shortStep(label) {
    return (label ?? '').replace('Approval ', '').replace('Cek Fisik ', '');
}

function emptyTitle(filters) {
    if (filters?.search) return 'Tidak ada hasil pencarian.';
    if (filters?.status === 'pending') return 'Tidak ada izin antre.';
    if (filters?.status === 'completed') return 'Belum ada izin selesai.';
    if (filters?.status === 'rejected') return 'Tidak ada izin ditolak.';
    return 'Belum ada pengajuan.';
}

function emptyHint(filters) {
    if (filters?.search) return 'Coba kata kunci lain.';
    if (filters?.status) return 'Pengajuan dengan status ini akan muncul di sini.';
    return 'Ajukan izin pertama untuk memulai proses persetujuan.';
}
