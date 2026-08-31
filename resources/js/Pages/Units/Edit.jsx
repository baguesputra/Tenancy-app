import AppLayout from '@/Layouts/AppLayout';
import UnitForm from './Partials/UnitForm';

export default function Edit(props) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Unit</h1>
                <UnitForm {...props} />
            </div>
        </AppLayout>
    );
}