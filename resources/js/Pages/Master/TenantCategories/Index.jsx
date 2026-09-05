import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

export default function Index({ categories, routePrefix, pageTitle }) {
    const handleDelete = (id) => {
        if (confirm('Hapus kategori ini?')) {
            router.delete(`/${routePrefix}/${id}`);
        }
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-3xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
                    <Link href={`/${routePrefix}/create`}>
                        <Button>+ Tambah Kategori</Button>
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex justify-between items-center p-4">
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                    {cat.name}
                                    <Badge color="gray">{cat.tenants_count} tenant</Badge>
                                </p>
                                {cat.description && (
                                    <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
                                )}
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <Link href={`/${routePrefix}/${cat.id}/edit`} className="text-xs font-medium text-[#0F1E36] hover:underline">
                                    Edit
                                </Link>
                                <button onClick={() => handleDelete(cat.id)} className="text-xs font-medium text-red-500 hover:underline">
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="p-8 text-sm text-gray-400 text-center">Belum ada kategori.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}