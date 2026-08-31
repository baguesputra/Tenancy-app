import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';

export default function Index({ categories }) {
    const handleDelete = (id) => {
        if (confirm('Hapus kategori ini?')) {
            router.delete(`/tenant-categories/${id}`);
        }
    };

    return (
        <AppLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Kategori Produk</h1>
                    <Link href="/tenant-categories/create" className="bg-blue-600 text-white px-4 py-2 rounded">
                        + Tambah Kategori
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex justify-between items-center p-4">
                            <div className="flex-1">
                                <p className="font-medium">
                                    {cat.name}
                                    <span className="text-xs text-gray-400 ml-2">
                                        ({cat.tenants_count} tenant)
                                    </span>
                                </p>
                                {cat.description && (
                                    <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Link
                                    href={`/tenant-categories/${cat.id}/edit`}
                                    className="text-sm text-blue-600"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="text-sm text-red-500"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">Belum ada kategori.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}