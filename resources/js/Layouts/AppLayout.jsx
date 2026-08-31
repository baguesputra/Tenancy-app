import { Link, usePage, router } from '@inertiajs/react';

const menuItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sesi Sidak', href: '/inspection-sessions' },
    { label: 'Master Tenant', href: '/tenants' },
    { label: 'Master Unit', href: '/units' },
    { label: 'Kontrak / Tenancy', href: '/tenancies' },
    { label: 'Kategori Tenant', href: '/tenant-categories' },
    { label: 'Kategori Produk', href: '/product-categories' },
];

export default function AppLayout({ children }) {
    const { auth } = usePage().props;

    const logout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0F1E36] text-white flex flex-col">
                <div className="p-5 border-b border-white/10">
                    <h1 className="font-bold text-lg">Tenant</h1>
                    <p className="text-xs text-white/50 mt-1">
                        {auth.user?.branch?.name ?? 'Semua Cabang'}
                    </p>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="block px-3 py-2 rounded text-sm text-white/80 hover:bg-white/10 hover:text-white"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/10">
                    <div className="px-3 py-2 text-sm text-white/70">
                        {auth.user?.name}
                        <span className="block text-xs text-white/40">
                            {auth.user?.employee_number}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 rounded text-sm text-red-300 hover:bg-white/10"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <FlashBanner />
                {children}
            </main>
        </div>
    );
}

function FlashBanner() {
    const { flash } = usePage().props;

    if (!flash?.success) return null;

    return (
        <div className="bg-green-50 border-b border-green-200 text-green-700 text-sm px-6 py-3">
            {flash.success}
        </div>
    );
}