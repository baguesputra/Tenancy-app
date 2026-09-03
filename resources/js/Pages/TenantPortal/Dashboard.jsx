import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <PortalLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <Link href="/portal/permits/create" className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded">
                    + Ajukan Surat Izin
                </Link>
            </div>
        </PortalLayout>
    );
}