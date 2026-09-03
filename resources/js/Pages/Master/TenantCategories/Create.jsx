// Create.jsx
import AppLayout from '@/Layouts/AppLayout';
import CategoryForm from './Partials/CategoryForm';

export default function Create({ routePrefix, pageTitle }) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Tambah {pageTitle}</h1>
                <CategoryForm routePrefix={routePrefix} />
            </div>
        </AppLayout>
    );
}