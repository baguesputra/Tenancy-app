import AppLayout from '@/Layouts/AppLayout';
import TenantForm from './Partials/TenantForm';

export default function Edit(props) {
    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Tenant</h1>
                <TenantForm {...props} />
            </div>
        </AppLayout>
    );
}