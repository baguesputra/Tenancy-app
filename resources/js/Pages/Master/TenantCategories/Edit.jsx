// Edit.jsx
import AppLayout from '@/Layouts/AppLayout';
import CategoryForm from './Partials/CategoryForm';

export default function Edit({ category, routePrefix, pageTitle }) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit {pageTitle}</h1>
                <CategoryForm category={category} routePrefix={routePrefix} />
            </div>
        </AppLayout>
    );
}