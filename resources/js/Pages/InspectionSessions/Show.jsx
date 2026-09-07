import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

export default function Show({ session, availableTenants }) {
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);

    const filteredTenants = availableTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
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
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-4xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Sesi Sidak</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Dimulai: {new Date(session.started_at).toLocaleString('id-ID')}
                </p>

                <FormSection title={`Tenant dalam Sesi Ini (${session.inspections.length})`}>
                    {session.inspections.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Belum ada tenant ditambahkan.</p>
                    ) : (
                        <div className="divide-y divide-gray-100 -mx-5">
                            {session.inspections.map((inspection) => (
                                <Link
                                    key={inspection.id}
                                    href={`/inspections/${inspection.id}`}
                                    className="flex justify-between items-center px-5 py-3 hover:bg-gray-50/80 transition-colors"
                                >
                                    <div>
                                        <span className="text-sm font-medium text-gray-900">{inspection.tenant.name}</span>
                                        <span className="text-xs text-gray-400 ml-2">
                                            {inspection.tenant.product_category?.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {inspection.is_flagged && <span title="Ada catatan">⚠️</span>}
                                        <Badge color={inspection.status === 'completed' ? 'green' : 'yellow'}>
                                            {inspection.status === 'completed' ? 'Selesai' : 'Draft'}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </FormSection>

                <FormSection title="Tambah Tenant">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mb-3"
                    />
                    <div className="max-h-72 overflow-y-auto -mx-5 divide-y divide-gray-100">
                        {filteredTenants.map((tenant) => (
                            <button
                                key={tenant.id}
                                disabled={adding}
                                onClick={() => submitAddTenant(tenant.id)}
                                className="w-full text-left px-5 py-2.5 hover:bg-blue-50/60 transition-colors flex justify-between items-center disabled:opacity-50"
                            >
                                <span className="text-sm text-gray-800">
                                    {tenant.name}
                                    {tenant.tenant_category === 'Anchor' && (
                                        <span className="text-xs text-amber-600 ml-1.5">★ Anchor</span>
                                    )}
                                </span>
                                <span className="text-xs text-gray-400">{tenant.unit_code}</span>
                            </button>
                        ))}
                        {filteredTenants.length === 0 && (
                            <p className="px-5 py-6 text-sm text-gray-400 text-center">Tidak ada tenant ditemukan.</p>
                        )}
                    </div>
                </FormSection>

                <Button variant="success" onClick={completeSession} className="w-full justify-center !py-3">
                    Selesaikan Sesi
                </Button>
            </div>
        </AppLayout>
    );
}