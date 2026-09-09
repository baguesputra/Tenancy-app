import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

export default function Index({ users, filters, roles, departments, branches }) {
    const [editingUser, setEditingUser] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '', employee_number: '', branch_id: '', department_id: '', role: '', password: '',
    });

    const startEdit = (user) => {
        setEditingUser(user);
        setData({
            name: user.name,
            employee_number: user.employee_number,
            branch_id: user.branch_id,
            department_id: user.department_id ?? '',
            role: user.roles[0]?.name ?? '',
            password: '',
        });
        clearErrors();
    };

    const cancelEdit = () => { setEditingUser(null); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => { setEditingUser(null); reset(); } };
        editingUser ? put(`/settings/users/${editingUser.id}`, options) : post('/settings/users', options);
    };

    const handleDelete = (id) => {
        if (confirm('Hapus user ini?')) router.delete(`/settings/users/${id}`, { preserveScroll: true });
    };

    const updateFilter = (value) => router.get('/settings/users', { search: value }, { preserveState: true });

    const columns = [
        { key: 'name', label: 'Nama' },
        { key: 'role', label: 'Role / Departemen' },
        { key: 'branch', label: 'Cabang' },
        { key: 'actions', label: '', className: 'w-10' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Manajemen User</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{users.total} user terdaftar</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                    <form onSubmit={submit} className="bg-white rounded-xl border border-[#E2E5EA] p-5 lg:sticky lg:top-[72px]">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center shrink-0">
                                {editingUser ? <IconEdit /> : <IconPlus />}
                            </div>
                            <h2 className="text-sm font-semibold text-gray-800">
                                {editingUser ? 'Edit User' : 'Tambah User'}
                            </h2>
                        </div>

                        <FormField label="Nama" error={errors.name} required>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </FormField>

                        <FormField label="Employee Number" error={errors.employee_number} required>
                            <TextInput value={data.employee_number} onChange={(e) => setData('employee_number', e.target.value)} placeholder="TOP-000000" />
                        </FormField>

                        <FormField label="Cabang" error={errors.branch_id} required>
                            <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                <option value="">Pilih...</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SelectInput>
                        </FormField>

                        <FormField label="Departemen" error={errors.department_id} hint="Kosongkan jika tidak relevan (misal manager)">
                            <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                                <option value="">Tidak ada</option>
                                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </SelectInput>
                        </FormField>

                        <FormField label="Role" error={errors.role} required>
                            <SelectInput value={data.role} onChange={(e) => setData('role', e.target.value)}>
                                <option value="">Pilih...</option>
                                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                            </SelectInput>
                        </FormField>

                        <FormField label="Password" error={errors.password} hint={editingUser ? 'Kosongkan jika tidak ingin ganti' : 'Default: password'}>
                            <TextInput type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
                        </FormField>

                        <div className="flex gap-2 mt-1">
                            <Button type="submit" disabled={processing} className="flex-1 justify-center">
                                {editingUser ? 'Simpan' : '+ Tambah'}
                            </Button>
                            {editingUser && <Button type="button" variant="secondary" onClick={cancelEdit}>Batal</Button>}
                        </div>
                    </form>

                    <div>
                        <TextInput
                            placeholder="Cari nama user..."
                            defaultValue={filters.search}
                            onChange={(e) => updateFilter(e.target.value)}
                            className="max-w-xs mb-4"
                        />

                        <DataTable columns={columns} footer={<Pagination meta={users} links={users.links} />}>
                            {users.data.map((user) => (
                                <tr
                                    key={user.id}
                                    onClick={() => startEdit(user)}
                                    className={`group cursor-pointer transition-colors ${editingUser?.id === user.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                                >
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-gray-900">{user.name}</p>
                                        <p className="text-xs text-gray-400">{user.employee_number}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <Badge color="blue">{user.roles[0]?.name ?? '—'}</Badge>
                                        {user.department && <span className="text-xs text-gray-400 ml-2">{user.department.name}</span>}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-500">{user.branch?.name ?? '—'}</td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                        >
                                            <IconTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.data.length === 0 && (
                                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">Belum ada user.</td></tr>
                            )}
                        </DataTable>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}