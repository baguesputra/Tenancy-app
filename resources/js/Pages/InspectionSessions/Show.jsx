import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import QrScanModal from '@/Components/Scan/QrScanModal';

const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'draft', label: 'Draft' },
    { key: 'completed', label: 'Selesai' },
    { key: 'flagged', label: 'Perlu Perhatian' },
];

export default function Show({ session, availableTenants }) {
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const [filter, setFilter] = useState('all');
    const [scanOpen, setScanOpen] = useState(false);

    const inspections = session.inspections ?? [];
    const done = inspections.filter((i) => i.status === 'completed').length;
    const progress = inspections.length === 0 ? 0 : Math.round((done / inspections.length) * 100);

    const visibleInspections = useMemo(() => {
        if (filter === 'draft') return inspections.filter((i) => i.status !== 'completed');
        if (filter === 'completed') return inspections.filter((i) => i.status === 'completed');
        if (filter === 'flagged') return inspections.filter((i) => i.is_flagged);
        return inspections;
    }, [inspections, filter]);

    const filteredTenants = availableTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
        || (t.unit_code ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const submitAddTenant = (tenantId) => {
        setAdding(true);
        router.post(
            `/inspection-sessions/${session.id}/tenants`,
            { tenant_id: tenantId },
            { onFinish: () => setAdding(false) }
        );
    };

    const completeSession = () => {
        if (confirm('Yakin sesi sidak ini sudah selesai? Setelah ini tidak bisa diedit lagi.')) {
            router.post(`/inspection-sessions/${session.id}/complete`);
        }
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-4xl w-full mx-auto pb-28 sm:pb-10">
                <div className="bg-[#0F1E36] text-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Sesi Sidak Berjalan</p>
                            <h1 className="text-lg sm:text-xl font-semibold mt-0.5">
                                {new Date(session.started_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </h1>
                        </div>
                        <Badge color={session.status === 'completed' ? 'gray' : 'green'} size="md">
                            {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                        </Badge>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/70 mb-1.5">
                            <span>{done} dari {inspections.length} tenant selesai</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                        <Button
                            variant="success"
                            onClick={() => setScanOpen(true)}
                            className="w-full justify-center !py-3 min-h-[48px] !bg-emerald-400 !text-[#0F1E36] hover:!bg-emerald-300 font-semibold"
                            iconLeft={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" />
                                </svg>
                            }
                        >
                            Scan QR Tenant
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={completeSession}
                            className="w-full justify-center !py-3 min-h-[48px] !bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
                        >
                            Selesaikan Sesi
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm mb-4 overflow-hidden">
                    <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h2 className="text-sm font-semibold text-gray-900">Tenant dalam Sesi Ini ({inspections.length})</h2>
                            <Link href="/inspection-sessions" className="text-xs text-gray-500 hover:text-gray-800 min-h-[32px] flex items-center">
                                ← Riwayat
                            </Link>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filter tenant">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={filter === f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`shrink-0 px-3 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${
                                        filter === f.key
                                            ? 'bg-[#0F1E36] text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {visibleInspections.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm font-medium text-gray-700">
                                {inspections.length === 0 ? 'Belum ada tenant ditambahkan.' : 'Tidak ada tenant pada filter ini.'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">Scan QR di depan toko untuk mulai sidak tercepat.</p>
                            <Button variant="primary" onClick={() => setScanOpen(true)} className="justify-center !py-3 min-h-[48px]">
                                Scan QR Sekarang
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {visibleInspections.map((inspection) => (
                                <Link
                                    key={inspection.id}
                                    href={`/inspections/${inspection.id}`}
                                    className="flex items-center gap-3 px-4 sm:px-5 py-3.5 min-h-[64px] hover:bg-gray-50/80 active:bg-gray-100 transition-colors"
                                >
                                    <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                                        inspection.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`} aria-hidden="true">
                                        {inspection.status === 'completed' ? '✓' : (inspection.tenant?.name?.[0] ?? '?').toUpperCase()}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-gray-900 truncate">{inspection.tenant?.name}</span>
                                        <span className="block text-xs text-gray-400 truncate mt-0.5">
                                            {inspection.tenant?.active_tenancy?.unit?.unit_code ?? inspection.tenant?.product_category?.name ?? ''}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1.5 shrink-0">
                                        {inspection.is_flagged && (
                                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Ada catatan perhatian">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        <Badge color={inspection.status === 'completed' ? 'green' : 'yellow'} size="sm">
                                            {inspection.status === 'completed' ? 'Selesai' : 'Draft'}
                                        </Badge>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-5 pt-4 pb-3">
                        <h2 className="text-sm font-semibold text-gray-900">Tambah Manual</h2>
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">Cari nama atau kode unit. Sudah disidak tidak muncul lagi.</p>
                        <TextInput
                            placeholder="Cari nama tenant / kode unit…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            clearable
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border-t border-gray-100">
                        {filteredTenants.map((tenant) => (
                            <button
                                key={tenant.id}
                                type="button"
                                disabled={adding}
                                onClick={() => submitAddTenant(tenant.id)}
                                className="w-full text-left px-4 sm:px-5 py-3 min-h-[56px] hover:bg-blue-50/60 active:bg-blue-100/60 transition-colors flex justify-between items-center gap-3 disabled:opacity-50"
                            >
                                <span className="text-sm text-gray-800 min-w-0">
                                    <span className="block truncate font-medium">{tenant.name}</span>
                                    <span className="block text-xs text-gray-400 truncate">
                                        {tenant.unit_code ?? ''}{tenant.tenant_category === 'Anchor' ? ' · Anchor' : ''}
                                    </span>
                                </span>
                                <span className="text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-2.5 py-1.5 shrink-0">+ Sidak</span>
                            </button>
                        ))}
                        {filteredTenants.length === 0 && (
                            <p className="px-5 py-6 text-sm text-gray-400 text-center">Tidak ada tenant ditemukan.</p>
                        )}
                    </div>
                </div>
            </div>

            <QrScanModal open={scanOpen} onClose={() => setScanOpen(false)} sessionId={session.id} />
        </AppLayout>
    );
}
