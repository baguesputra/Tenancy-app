import AppLayout from '@/Layouts/AppLayout';
import { usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <AppLayout>
            <div className="p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
                <p className="text-gray-600">
                    Selamat datang, {auth.user?.name} ({auth.user?.employee_number})
                </p>
            </div>
        </AppLayout>
    );
}