import AppLayout from '@/Layouts/AppLayout';
import { usePage, Link } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <AppLayout>
            <div className="p-6 max-w-4xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                    Selamat datang, {auth.user?.name}
                </h1>
                <p className="text-sm text-gray-500 mb-8">
                    {auth.user?.employee_number} — {auth.user?.branch?.name ?? 'Semua Cabang'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <DashboardCard
                        href="/inspection-sessions/current"
                        title="Sesi Sidak"
                        description="Mulai atau lanjutkan sesi inspeksi tenant"
                    />
                    <DashboardCard
                        href="/permit-requests"
                        title="Surat Izin"
                        description="Lihat & kelola pengajuan surat izin"
                    />
                    <DashboardCard
                        href="/tenants"
                        title="Master Tenant"
                        description="Kelola data tenant dan kontrak"
                    />
                </div>
            </div>
        </AppLayout>
    );
}

function DashboardCard({ href, title, description }) {
    return (
        <Link
            href={href}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#0F1E36]/30 hover:shadow-sm transition-all"
        >
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
        </Link>
    );
}