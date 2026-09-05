import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

export default function Index({ tenants, tenantCategories, productCategories, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenants', { ...filters, [key]: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Master Tenant</h1>
                    <Link href="/tenants/create">
                        <Button>+ Tambah Tenant</Button>
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
                        defaultValue={filters.tenant_category_id ?? ''}
                        onChange={(e) => updateFilter('tenant_category_id', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Kategori Tenant</option>
                        {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                    <SelectInput
                        defaultValue={filters.product_category_id ?? ''}
                        onChange={(e) => updateFilter('product_category_id', e.target.value)}
                        className="sm:w-48"
                    >
                        <option value="">Semua Kategori Produk</option>
                        {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {tenants.data.map((tenant) => (
                        <Link
                            key={tenant.id}
                            href={`/tenants/${tenant.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{tenant.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {tenant.branch.name} — {tenant.tenant_category.name} / {tenant.product_category.name}
                                </p>
                            </div>
                            <Badge color={tenant.is_active ? 'green' : 'gray'}>
                                {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                        </Link>
                    ))}
                    {tenants.data.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada tenant.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}