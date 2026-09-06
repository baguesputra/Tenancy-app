import { useForm, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';

export default function CategoryManager({ categories, routePrefix, pageTitle }) {
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
    });

    const startEdit = (category) => {
        setEditingId(category.id);
        setData({ name: category.name, description: category.description ?? '' });
        clearErrors();
    };

    const cancelEdit = () => {
        setEditingId(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => { setEditingId(null); reset(); },
        };
        editingId ? put(`/${routePrefix}/${editingId}`, options) : post(`/${routePrefix}`, options);
    };

    const handleDelete = (id) => {
        if (confirm('Hapus kategori ini?')) {
            router.delete(`/${routePrefix}/${id}`, { preserveScroll: true });
        }
    };

    const filtered = useMemo(
        () => categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
        [categories, search]
    );

    const totalTenants = categories.reduce((sum, c) => sum + c.tenants_count, 0);

    const columns = [
        { key: 'name', label: 'Nama' },
        { key: 'count', label: 'Jumlah Tenant' },
        { key: 'actions', label: '', className: 'text-right' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {categories.length} kategori · {totalTenants} tenant tercakup
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                {/* Panel form — sticky di kiri */}
                <form
                    onSubmit={submit}
                    className="bg-white rounded-xl border border-[#E2E5EA] p-5 lg:sticky lg:top-6"
                >
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-[#0F1E36]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {editingId ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                )}
                            </svg>
                        </div>
                        <h2 className="text-sm font-semibold text-gray-800">
                            {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                        </h2>
                    </div>

                    <FormField label="Nama Kategori" error={errors.name} required>
                        <TextInput
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="cth. Anchor"
                        />
                    </FormField>

                    <FormField label="Keterangan" error={errors.description}>
                        <Textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            placeholder="Jelaskan maksud kategori ini..."
                        />
                    </FormField>

                    <div className="flex gap-2 mt-1">
                        <Button type="submit" disabled={processing} className="flex-1 justify-center">
                            {editingId ? 'Simpan Perubahan' : '+ Tambah'}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={cancelEdit}>
                                Batal
                            </Button>
                        )}
                    </div>
                </form>

                {/* Tabel — mengisi sisa lebar */}
                <div>
                    <TextInput
                        placeholder="Cari kategori..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs mb-4"
                    />

                    <DataTable columns={columns}>
                        {filtered.map((cat) => (
                            <tr
                                key={cat.id}
                                onClick={() => startEdit(cat)}
                                className={`group cursor-pointer transition-colors ${
                                    editingId === cat.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
                                }`}
                            >
                                <td className="px-5 py-3.5">
                                    <p className="font-medium text-gray-900">{cat.name}</p>
                                    {cat.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 max-w-md">{cat.description}</p>
                                    )}
                                </td>
                                <td className="px-5 py-3.5">
                                    <Badge color="gray">{cat.tenants_count}</Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(cat.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                        aria-label="Hapus"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-sm text-gray-400">
                                    {search ? 'Tidak ada kategori yang cocok.' : 'Belum ada kategori.'}
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>
            </div>
        </div>
    );
}