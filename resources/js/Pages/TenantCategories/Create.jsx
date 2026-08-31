import AppLayout from '@/Layouts/AppLayout';
import CategoryForm from './Partials/CategoryForm';

export default function Create() {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Tambah Kategori Tenant</h1>
                <CategoryForm endpoint="/tenant-categories" />
            </div>
        </AppLayout>
    );
}