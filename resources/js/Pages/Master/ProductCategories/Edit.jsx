import AppLayout from '@/Layouts/AppLayout';
import CategoryForm from '../TenantCategories/Partials/CategoryForm';

export default function Edit({ category }) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Kategori Produk</h1>
                <CategoryForm category={category} endpoint="/product-categories" />
            </div>
        </AppLayout>
    );
}