import AppLayout from '@/Layouts/AppLayout';
import CategoryManager from '@/Components/CategoryManager';

export default function Index({ categories, routePrefix, pageTitle }) {
    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <CategoryManager categories={categories} routePrefix={routePrefix} pageTitle={pageTitle} />
            </div>
        </AppLayout>
    );
}