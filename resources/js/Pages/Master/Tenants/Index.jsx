import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

export default function Index({ tenants, tenantCategories, productCategories, filters }) {
    const updateFilter = (key, value) => {
        router.get('/tenants', { ...filters, [key]: value }, { preserveState: true });
    };

    const columns = [
        { key: 'name', label: 'Nama Tenant' },
        { key: 'category', label: 'Kategori' },
        { key: 'branch', label: 'Cabang' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Master Tenant</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenants.total} tenant terdaftar</p>
                    </div>
                    <Link href="/tenants/create">
                        <Button>+ Tambah Tenant</Button>
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1 max-w-sm"
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

                <DataTable columns={columns}>
                    {tenants.data.map((tenant) => (
                        <tr
                            key={tenant.id}
                            onClick={() => router.visit(`/tenants/${tenant.id}/edit`)}
                            className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-900">{tenant.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">
                                {tenant.tenant_category.name} · {tenant.product_category.name}
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{tenant.branch.name}</td>
                            <td className="px-5 py-3.5 text-right">
                                <Badge color={tenant.is_active ? 'green' : 'gray'}>
                                    {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                    {tenants.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                                Belum ada tenant yang cocok dengan pencarian ini.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <div className="bg-white rounded-b-xl border border-t-0 border-[#E2E5EA] -mt-px">
                    <Pagination meta={tenants.meta ?? tenants} links={tenants.links} />
                </div>
            </div>
        </AppLayout>
    );
}