import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const menuIcons = {
    dashboard: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
     master: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    sidak: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    permit: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
   
};

const masterMenuItems = [
    { label: 'Tenant', href: '/tenants' },
    { label: 'Unit', href: '/units' },
    { label: 'Kontrak / Tenancy', href: '/tenancies' },
    { label: 'Kategori Tenant', href: '/tenant-categories' },
    { label: 'Kategori Product', href: '/product-categories' },
];

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;

    const isMasterActive = masterMenuItems.some((item) => currentUrl.startsWith(item.href));
    const [masterOpen, setMasterOpen] = useState(isMasterActive);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebar-collapsed') === '1';
    });

    useEffect(() => {
        setMobileNavOpen(false);
    }, [currentUrl]);

    useEffect(() => {
        if (collapsed) setMasterOpen(false);
    }, [collapsed]);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    };

    const logout = () => router.post('/logout');
    const sidebarWidth = collapsed ? 'lg:w-[72px]' : 'lg:w-64';
    const contentMargin = collapsed ? 'lg:ml-[72px]' : 'lg:ml-64';

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {mobileNavOpen && (
                <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
            )}

            <aside
                className={`fixed inset-y-0 left-0 w-64 ${sidebarWidth} bg-[#0F1E36] flex flex-col z-40
                    transition-all duration-200 ease-out
                    ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <div className={`flex items-center border-b border-white/[0.08] shrink-0 h-[57px] ${collapsed ? 'lg:justify-center px-5' : 'px-5'}`}>
                    <div className={collapsed ? 'lg:hidden' : ''}>
                        <h1 className="font-semibold text-white text-[15px] tracking-tight">Tenant</h1>
                        <p className="text-white/40 text-xs mt-0.5">{auth.user?.branch?.name ?? 'Semua Cabang'}</p>
                    </div>
                    <div className={`hidden ${collapsed ? 'lg:flex' : ''} w-7 h-7 rounded-lg bg-white/10 items-center justify-center text-white text-xs font-bold`}>
                        T
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
                    <NavLink href="/dashboard" currentUrl={currentUrl} icon={menuIcons.dashboard} collapsed={collapsed}>
                        Dashboard
                    </NavLink>
                     <div className="pt-1">
                        <button
                            onClick={() => collapsed ? null : setMasterOpen(!masterOpen)}
                            title="Master Data"
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                                ${collapsed ? 'justify-center' : 'justify-between'}
                                ${isMasterActive ? 'text-white' : 'text-white/55 hover:text-white/90'}`}
                        >
                            <span className="flex items-center gap-3">
                                <span className="shrink-0">{menuIcons.master}</span>
                                {!collapsed && <span>Master Data</span>}
                            </span>
                            {!collapsed && (
                                <svg className={`w-3.5 h-3.5 transition-transform shrink-0 ${masterOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>

                        {masterOpen && !collapsed && (
                            <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.08] space-y-0.5">
                                {masterMenuItems.map((item) => (
                                    <NavLink key={item.href} href={item.href} currentUrl={currentUrl} small collapsed={false}>
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                    <NavLink href="/inspection-sessions" currentUrl={currentUrl} icon={menuIcons.sidak} collapsed={collapsed}>
                        Sesi Sidak
                    </NavLink>
                    <NavLink href="/permit-requests" currentUrl={currentUrl} icon={menuIcons.permit} collapsed={collapsed}>
                        Surat Izin
                    </NavLink>
                </nav>

                <div className="hidden lg:flex justify-end p-3 border-t border-white/[0.08] shrink-0">
                    <button
                        onClick={toggleCollapsed}
                        className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                    >
                        <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </aside>

            <div className={`${contentMargin} min-h-screen flex flex-col transition-all duration-200`}>
                <Topbar user={auth.user} onMenuClick={() => setMobileNavOpen(true)} onLogout={logout} />
                <FlashBanner />
                <div className="flex-1 flex flex-col">{children}</div>
            </div>
        </div>
    );
}

function Topbar({ user, onMenuClick, onLogout }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-20 bg-white border-b border-[#E2E5EA] h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800" aria-label="Buka menu">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <div className="hidden lg:block" />

            <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="relative" ref={notifRef}>
                    <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors" aria-label="Notifikasi">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-2 z-30">
                            <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notifikasi</p>
                            <p className="px-4 py-6 text-sm text-gray-400 text-center">Belum ada notifikasi.</p>
                        </div>
                    )}
                </div>

                <div className="relative" ref={profileRef}>
                    <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[#0F1E36] text-white text-xs font-medium flex items-center justify-center shrink-0">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
                        <svg className="hidden sm:block w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-1.5 z-30">
                            <div className="px-4 py-2.5 border-b border-[#E2E5EA]">
                                <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{user?.employee_number}</p>
                            </div>
                            <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, currentUrl, children, icon, small = false, collapsed = false }) {
    const isActive = currentUrl.startsWith(href);

    return (
        <Link
            href={href}
            title={collapsed ? children : undefined}
            className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${collapsed ? 'justify-center' : ''}
                ${small ? 'text-[13px]' : 'text-[13px] font-medium'}
                ${isActive ? 'text-white bg-white/[0.08]' : 'text-white/55 hover:text-white/90 hover:bg-white/[0.04]'}`}
        >
            {isActive && !collapsed && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2F6FED]" />
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            {!collapsed && <span className={isActive && !icon ? 'ml-1' : ''}>{children}</span>}
        </Link>
    );
}

function FlashBanner() {
    const { flash } = usePage().props;
    if (!flash?.success) return null;

    return (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-4 sm:px-8 py-3 flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {flash.success}
        </div>
    );
}