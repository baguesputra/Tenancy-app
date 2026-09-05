import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

const statusColor = { draft: 'gray', active: 'green', ended: 'yellow', terminated: 'red' };
const statusLabel = { draft: 'Draft', active: 'Aktif', ended: 'Berakhir', terminated: 'Diakhiri' };

export default function Index({ tenancies, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenancies', { ...filters, [key]: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Kontrak / Tenancy</h1>
                    <Link href="/tenancies/create">
                        <Button>+ Tambah Tenancy</Button>
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1"
                    />
                    <SelectInput
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="ended">Berakhir</option>
                        <option value="terminated">Diakhiri</option>
                    </SelectInput>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {tenancies.data.map((t) => (
                        <Link
                            key={t.id}
                            href={`/tenancies/${t.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{t.tenant.name} — {t.unit.unit_code}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {t.start_date} s/d {t.end_date ?? 'sekarang'}
                                    {t.contract_number && ` — No. ${t.contract_number}`}
                                </p>
                            </div>
                            <Badge color={statusColor[t.status]}>{statusLabel[t.status]}</Badge>
                        </Link>
                    ))}
                    {tenancies.data.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada data tenancy.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}