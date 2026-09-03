import { Link, usePage, router } from '@inertiajs/react';

export default function PortalLayout({ children }) {
    const { auth } = usePage().props;

    const logout = () => router.post('/portal/logout');

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-56 bg-[#0F1E36] text-white flex flex-col">
                <div className="p-5 border-b border-white/10">
                    <h1 className="font-bold text-lg">Portal Tenant</h1>
                    <p className="text-xs text-white/50 mt-1">
                        {auth.tenantUser?.tenant?.name}
                    </p>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    <Link href="/portal/dashboard" className="block px-3 py-2 rounded text-sm text-white/80 hover:bg-white/10">
                        Dashboard
                    </Link>
                    <Link href="/portal/permits" className="block px-3 py-2 rounded text-sm text-white/80 hover:bg-white/10">
                        Surat Izin
                    </Link>
                </nav>
                <div className="p-3 border-t border-white/10">
                    <button onClick={logout} className="w-full text-left px-3 py-2 rounded text-sm text-red-300 hover:bg-white/10">
                        Logout
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}