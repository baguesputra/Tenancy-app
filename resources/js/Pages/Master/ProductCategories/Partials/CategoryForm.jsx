import { useForm } from '@inertiajs/react';

export default function CategoryForm({ category, endpoint }) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, errors } = useForm({
        name: category?.name ?? '',
        description: category?.description ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(`${endpoint}/${category.id}`);
        } else {
            post(endpoint);
        }
    };

    return (
        <form onSubmit={submit} className="max-w-lg space-y-4 bg-white rounded-lg shadow-sm p-5">
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nama Kategori</label>
                <input
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                <textarea
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Jelaskan maksud kategori ini..."
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <button
                type="submit"
                disabled={processing}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
            >
                {isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </button>
        </form>
    );
}