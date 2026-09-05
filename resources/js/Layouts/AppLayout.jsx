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
    const { auth } = usePage().props;
    const currentUrl = usePage().url;

    const isMasterActive = masterMenuItems.some((item) => currentUrl.startsWith(item.href));
    const [masterOpen, setMasterOpen] = useState(isMasterActive);

    const logout = () => router.post('/logout');

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-64 bg-[#0F1E36] flex flex-col shrink-0">
                <div className="px-5 py-5 border-b border-white/[0.08]">
                    <h1 className="font-semibold text-white text-[15px] tracking-tight">Tenant</h1>
                    <p className="text-white/40 text-xs mt-0.5">
                        {auth.user?.branch?.name ?? 'Semua Cabang'}
                    </p>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    <NavLink href="/dashboard" currentUrl={currentUrl}>Dashboard</NavLink>
                    <NavLink href="/inspection-sessions" currentUrl={currentUrl}>Sesi Sidak</NavLink>
                    <NavLink href="/permit-requests" currentUrl={currentUrl}>Surat Izin</NavLink>

                    <div className="pt-1">
                        <button
                            onClick={() => setMasterOpen(!masterOpen)}
                            className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                                ${isMasterActive ? 'text-white bg-white/[0.06]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}`}
                        >
                            <span>Master Data</span>
                            <svg
                                className={`w-3.5 h-3.5 transition-transform ${masterOpen ? 'rotate-90' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {masterOpen && (
                            <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.08] space-y-0.5">
                                {masterMenuItems.map((item) => (
                                    <NavLink key={item.href} href={item.href} currentUrl={currentUrl} small>
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>

                <div className="px-3 py-4 border-t border-white/[0.08]">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-white text-[13px] font-medium truncate">{auth.user?.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{auth.user?.employee_number}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto">
                <FlashBanner />
                {children}
            </main>
        </div>
    );
}

function NavLink({ href, currentUrl, children, small = false }) {
    const isActive = currentUrl.startsWith(href);

    return (
        <Link
            href={href}
            className={`block px-3 py-2 rounded-lg transition-colors
                ${small ? 'text-[13px]' : 'text-[13px] font-medium'}
                ${isActive
                    ? 'bg-[#1FA24C] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
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
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-6 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {flash.success}
        </div>
    );
}