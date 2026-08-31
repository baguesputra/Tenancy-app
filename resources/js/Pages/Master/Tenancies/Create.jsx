import AppLayout from '@/Layouts/AppLayout';
import TenancyForm from './Partials/TenancyForm';

export default function Create(props) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Tambah Tenancy</h1>
                <TenancyForm {...props} />
            </div>
        </AppLayout>
    );
}