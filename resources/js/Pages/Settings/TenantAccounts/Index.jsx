import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

export default function Index({ tenants, filters, withoutAccountCount }) {
    const updateFilter = (key, value) => {
        router.get('/settings/tenant-accounts', { ...filters, [key]: value }, { preserveState: true });
    };

    const createAccount = (tenantId) => {
        router.post(`/settings/tenant-accounts/${tenantId}`, {}, { preserveScroll: true });
    };

    const resetPassword = (tenantId, tenantName) => {
        if (confirm(`Reset password akun untuk "${tenantName}"? Password lama tidak bisa dipakai lagi.`)) {
            router.post(`/settings/tenant-accounts/${tenantId}/reset-password`, {}, { preserveScroll: true });
        }
    };

    const toggleActive = (tenantId) => {
        router.post(`/settings/tenant-accounts/${tenantId}/toggle-active`, {}, { preserveScroll: true });
    };

    const bulkCreate = () => {
        if (confirm(`Buat akun untuk semua ${withoutAccountCount} tenant yang belum punya akun?`)) {
            router.post('/settings/tenant-accounts/bulk-create', {}, { preserveScroll: true });
        }
    };

    const columns = [
        { key: 'name', label: 'Nama Tenant' },
        { key: 'branch', label: 'Cabang' },
        { key: 'username', label: 'Username' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Akun Portal Tenant</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenants.total} tenant terdaftar</p>
                    </div>
                    {withoutAccountCount > 0 && (
                        <Button onClick={bulkCreate}>
                            Buat Akun untuk {withoutAccountCount} Tenant yang Belum Punya
                        </Button>
                    )}
                </div>

                {withoutAccountCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
                        ⚠ Ada <strong>{withoutAccountCount}</strong> tenant yang belum punya akun Portal Tenant.
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <TextInput
                        placeholder="Cari nama tenant..."
                        defaultValue={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="flex-1 max-w-sm"
                    />
                    <SelectInput
                        defaultValue={filters.status ?? ''}
                        onChange={(e) => updateFilter('status', e.target.value)}
                        className="sm:w-56"
                    >
                        <option value="">Semua Tenant</option>
                        <option value="with_account">Sudah Punya Akun</option>
                        <option value="without_account">Belum Punya Akun</option>
                    </SelectInput>
                </div>

                <DataTable columns={columns} footer={<Pagination meta={tenants} links={tenants.links} />}>
                    {tenants.data.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-gray-900">{tenant.name}</td>
                            <td className="px-5 py-3.5 text-gray-500">{tenant.branch?.name ?? '—'}</td>
                            <td className="px-5 py-3.5 text-gray-500">
                                {tenant.tenant_user?.username ?? <span className="text-gray-300 italic">Belum ada</span>}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                {tenant.tenant_user ? (
                                    <Badge color={tenant.tenant_user.is_active ? 'green' : 'gray'}>
                                        {tenant.tenant_user.is_active ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                ) : (
                                    <Badge color="yellow">Belum Ada Akun</Badge>
                                )}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                {tenant.tenant_user ? (
                                    <>
                                        <button
                                            onClick={() => resetPassword(tenant.id, tenant.name)}
                                            className="text-xs font-medium text-[#2F6FED] hover:underline mr-3"
                                        >
                                            Reset Password
                                        </button>
                                        <button
                                            onClick={() => toggleActive(tenant.id)}
                                            className="text-xs font-medium text-gray-500 hover:underline"
                                        >
                                            {tenant.tenant_user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => createAccount(tenant.id)}
                                        className="text-xs font-medium text-[#1FA24C] hover:underline"
                                    >
                                        + Buat Akun
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {tenants.data.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                                Tidak ada tenant yang cocok.
                            </td>
                        </tr>
                    )}
                </DataTable>
            </div>
        </AppLayout>
    );
}