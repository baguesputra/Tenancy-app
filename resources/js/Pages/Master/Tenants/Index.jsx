import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';

export default function Index({ tenants, tenantCategories, productCategories, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenants', { ...filters, [key]: value }, { preserveState: true });
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Master Tenant</h1>
                    <Link href="/tenants/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                        + Tambah Tenant
                    </Link>
                </div>

                <div className="flex gap-3 mb-4">
                    <input
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="border rounded px-3 py-2 text-sm flex-1"
                    />
                    <select
                        defaultValue={filters.tenant_category_id ?? ''}
                        onChange={(e) => updateFilter('tenant_category_id', e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    >
                        <option value="">Semua Kategori Tenant</option>
                        {tenantCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        defaultValue={filters.product_category_id ?? ''}
                        onChange={(e) => updateFilter('product_category_id', e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    >
                        <option value="">Semua Kategori Produk</option>
                        {productCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {tenants.data.map((tenant) => (
                        <Link
                            key={tenant.id}
                            href={`/tenants/${tenant.id}/edit`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50"
                        >
                            <div>
                                <p className="font-medium">{tenant.name}</p>
                                <p className="text-xs text-gray-400">
                                    {tenant.branch.name} — {tenant.tenant_category.name} / {tenant.product_category.name}
                                </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded ${
                                    tenant.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </Link>
                    ))}
                    {tenants.data.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">Belum ada tenant.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}