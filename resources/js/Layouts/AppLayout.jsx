import { Link, usePage, router } from '@inertiajs/react';
import { useState } from 'react';

const masterMenuItems = [
    { label: 'Tenant', href: '/tenants' },
    { label: 'Unit', href: '/units' },
    { label: 'Kontrak / Tenancy', href: '/tenancies' },
    { label: 'Kategori Tenant', href: '/tenant-categories' },
    { label: 'Kategori Produk', href: '/product-categories' },
];

export default function AppLayout({ children }) {
    const { auth, url } = usePage().props;
    const currentUrl = usePage().url;

    const isMasterActive = masterMenuItems.some((item) => currentUrl.startsWith(item.href));
    const [masterOpen, setMasterOpen] = useState(isMasterActive);

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

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <SidebarLink href="/dashboard" currentUrl={currentUrl}>
                        Dashboard
                    </SidebarLink>

                    {/* Grup Master — dropdown */}
                    <div>
                        <button
                            onClick={() => setMasterOpen(!masterOpen)}
                            className={`w-full flex justify-between items-center px-3 py-2 rounded text-sm ${
                                isMasterActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <span>Master Data</span>
                            <span className={`transition-transform ${masterOpen ? 'rotate-90' : ''}`}>
                                ›
                            </span>
                        </button>

                        {masterOpen && (
                            <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-1">
                                {masterMenuItems.map((item) => (
                                    <SidebarLink
                                        key={item.href}
                                        href={item.href}
                                        currentUrl={currentUrl}
                                        small
                                    >
                                        {item.label}
                                    </SidebarLink>
                                ))}
                            </div>
                        )}
                    </div>
                    <SidebarLink href="/permit-requests" currentUrl={currentUrl}>
                        Surat Izin
                    </SidebarLink>
                     <SidebarLink href="/inspection-sessions" currentUrl={currentUrl}>
                        Sesi Sidak
                    </SidebarLink>
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

function SidebarLink({ href, currentUrl, children, small = false }) {
    const isActive = currentUrl.startsWith(href);

    return (
        <Link
            href={href}
            className={`block px-3 py-2 rounded ${small ? 'text-xs' : 'text-sm'} ${
                isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
        >
            {children}
        </Link>
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