import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef, Fragment } from 'react';

const menuIcons = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    master: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    sidak: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    permit: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    access: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
    ),
    settings: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    portal: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ),
};

const masterMenuItems = [
    { label: 'Tenant', href: '/tenants', permission: 'tenants.view' },
    { label: 'Unit', href: '/units', permission: 'units.view' },
    { label: 'Kontrak / Tenancy', href: '/tenancies', permission: 'tenancies.view' },
    { label: 'Kategori Tenant', href: '/tenant-categories', permission: 'categories.view' },
    { label: 'Kategori Product', href: '/product-categories', permission: 'categories.view' },
];

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;

    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const permissions = auth.user?.permissions ?? [];
    const can = (perm) => isSuperAdmin || permissions.includes(perm);

    const visibleMasterMenuItems = masterMenuItems.filter((item) => can(item.permission));
    const isMasterActive = visibleMasterMenuItems.some((item) => currentUrl.startsWith(item.href));
    const [masterOpen, setMasterOpen] = useState(isMasterActive);
    const settingsMenuItems = [
        { label: 'Manajemen User', href: '/settings/users', icon: menuIcons.users },
        { label: 'Akun Portal Tenant', href: '/settings/tenant-accounts', icon: menuIcons.portal },
        { label: 'Hak Akses', href: '/settings/access-control', icon: menuIcons.access },
    ];
    const isSettingsActive = settingsMenuItems.some((item) => currentUrl.startsWith(item.href));
    const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebar-collapsed') === '1';
    });

    useEffect(() => {
        setMobileNavOpen(false);
    }, [currentUrl]);

    useEffect(() => {
        if (collapsed) {
            setMasterOpen(false);
            setSettingsOpen(false);
        }
    }, [collapsed]);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    };

    const logout = () => router.post('/logout');

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {mobileNavOpen && (
                <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" aria-hidden="true" />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0F1E36] transition-all duration-200
                    ${collapsed ? 'w-[72px]' : 'w-[232px]'}
                    ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                aria-label="Navigasi utama"
            >
                <div className={`flex items-center border-b border-white/10 shrink-0 h-14 px-4 ${collapsed ? 'justify-center' : ''}`}>
                    {!collapsed ? (
                        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-white">
                            <img src="/images/logo.png" alt="Duta Mall" className="h-8 w-auto rounded-md bg-white p-0.5" />
                            <span className="leading-tight">
                                <span className="block text-sm font-semibold text-white">Tenant</span>
                                <span className="block text-[11px] text-white/50 truncate max-w-[140px]">{auth.user?.branch?.name ?? 'Semua Cabang'}</span>
                            </span>
                        </Link>
                    ) : (
                        <Link href="/dashboard" aria-label="Dashboard" className="rounded-lg focus-visible:outline-2 focus-visible:outline-white">
                            <img src="/images/logo.png" alt="Duta Mall" className="h-8 w-8 object-contain rounded-md bg-white p-0.5" />
                        </Link>
                    )}
                </div>

                <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto" role="navigation">
                    <NavLink href="/dashboard" currentUrl={currentUrl} icon={menuIcons.dashboard} collapsed={collapsed}>
                        Dashboard
                    </NavLink>

                    {visibleMasterMenuItems.length > 0 && (
                        <div className="pt-1">
                            <button
                                onClick={() => collapsed ? null : setMasterOpen(!masterOpen)}
                                title="Master Data"
                                aria-expanded={masterOpen && !collapsed}
                                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white
                                    ${collapsed ? 'justify-center' : 'justify-between'}
                                    ${isMasterActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="shrink-0" aria-hidden="true">{menuIcons.master}</span>
                                    {!collapsed && <span>Master Data</span>}
                                </span>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 shrink-0 text-white/40 transition-transform ${masterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            {masterOpen && !collapsed && (
                                <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                                    {visibleMasterMenuItems.map((item) => (
                                        <NavLink key={item.href} href={item.href} currentUrl={currentUrl} small collapsed={false}>
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {can('sidak.view') && (
                        <NavLink href="/inspection-sessions" currentUrl={currentUrl} icon={menuIcons.sidak} collapsed={collapsed}>
                            Sesi Sidak
                        </NavLink>
                    )}
                    {can('permits.view') && (
                        <NavLink href="/permit-requests" currentUrl={currentUrl} icon={menuIcons.permit} collapsed={collapsed}>
                            Surat Izin
                        </NavLink>
                    )}
                    {isSuperAdmin && (
                        <div className="pt-1">
                            <button
                                onClick={() => collapsed ? null : setSettingsOpen(!settingsOpen)}
                                title="Pengaturan"
                                aria-expanded={settingsOpen && !collapsed}
                                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white
                                    ${collapsed ? 'justify-center' : 'justify-between'}
                                    ${isSettingsActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="shrink-0" aria-hidden="true">{menuIcons.settings}</span>
                                    {!collapsed && <span>Pengaturan</span>}
                                </span>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 shrink-0 text-white/40 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            {settingsOpen && !collapsed && (
                                <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                                    {settingsMenuItems.map((item) => (
                                        <NavLink key={item.href} href={item.href} currentUrl={currentUrl} icon={item.icon} small collapsed={false}>
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                <div className="p-2.5 border-t border-white/10 shrink-0">
                    <button
                        onClick={toggleCollapsed}
                        className={`hidden lg:flex w-full items-center px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-white ${collapsed ? 'justify-center' : 'justify-end'}`}
                        title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                    >
                        <svg className={`w-5 h-5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </aside>

            <div className={`min-h-screen flex flex-col transition-all duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[232px]'}`}>
                <Topbar user={auth.user} onMenuClick={() => setMobileNavOpen(true)} onLogout={logout} breadcrumbs={getBreadcrumbs(currentUrl)} />
                <FlashBanner />
                <div className="flex-1 flex flex-col">{children}</div>
            </div>
        </div>
    );
}

function getBreadcrumbs(url) {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const crumbs = [{ label: 'Beranda', href: '/dashboard' }];

    const labelMap = {
        'tenants': 'Master Tenant',
        'units': 'Master Unit',
        'tenancies': 'Master Tenancy',
        'tenant-categories': 'Kategori Tenant',
        'product-categories': 'Kategori Produk',
        'inspection-sessions': 'Sesi Sidak',
        'permit-requests': 'Surat Izin',
        'settings': 'Pengaturan',
        'users': 'Manajemen User',
        'access-control': 'Hak Akses',
    };

    let currentPath = '';
    for (const segment of segments) {
        currentPath += '/' + segment;
        if (segment.match(/^[a-f0-9-]{36}$/) || segment.match(/^\d+$/)) continue;
        if (labelMap[segment]) {
            crumbs.push({ label: labelMap[segment], href: currentPath });
        }
    }
    return crumbs.slice(-2);
}

function Topbar({ user, onMenuClick, onLogout, breadcrumbs }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const { notifications, unreadNotificationsCount } = usePage().props;

    const markAsRead = (id, url) => {
        router.post(`/notifications/${id}/read`, {}, { onFinish: () => router.visit(url) });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                setProfileOpen(false);
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    return (
        <header className="sticky top-0 z-20 h-14 shrink-0 bg-white border-b border-[#E2E5EA]">
            <div className="flex items-center justify-between h-full px-4 sm:px-6 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        aria-label="Buka menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
                        {breadcrumbs.map((crumb, idx) => (
                            <Fragment key={crumb.href}>
                                {idx > 0 && <span className="text-gray-300" aria-hidden="true">/</span>}
                                {idx === breadcrumbs.length - 1 ? (
                                    <span className="font-medium text-gray-900 truncate max-w-[180px]">{crumb.label}</span>
                                ) : (
                                    <Link href={crumb.href} className="text-gray-500 hover:text-gray-800 transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                        {crumb.label}
                                    </Link>
                                )}
                            </Fragment>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-1">
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-label={`Notifikasi${unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} belum dibaca` : ''}`}
                            aria-expanded={notifOpen}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-[#FF6B6B] text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-2 z-30 max-h-96 overflow-y-auto">
                                <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">Notifikasi</p>
                                {notifications.length === 0 ? (
                                    <p className="px-4 py-8 text-sm text-gray-400 text-center">Belum ada notifikasi.</p>
                                ) : (
                                    notifications.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => markAsRead(n.id, n.url)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                        >
                                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">{n.created_at}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-expanded={profileOpen}
                            aria-label="Menu pengguna"
                        >
                            <span className="w-8 h-8 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                            <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[140px]">{user?.name}</span>
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-1.5 z-30">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{user?.employee_number}</p>
                                </div>
                                <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    Keluar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function NavLink({ href, currentUrl, children, icon, small = false, collapsed = false }) {
    const isActive = currentUrl === href || currentUrl.startsWith(href + '/') || (href !== '/dashboard' && currentUrl.startsWith(href));

    return (
        <Link
            href={href}
            title={collapsed && typeof children === 'string' ? children : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white
                ${collapsed ? 'justify-center' : ''}
                ${isActive ? 'text-white bg-white/10 font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
            {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#FF6B6B] rounded-r-full" aria-hidden="true" />
            )}
            {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
            {!collapsed && <span className="truncate">{children}</span>}
        </Link>
    );
}

function FlashBanner() {
    const { flash } = usePage().props;
    if (!flash?.success) return null;

    return (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-4 sm:px-6 py-3 flex items-center gap-2 shrink-0 whitespace-pre-line">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {flash.success}
        </div>
    );
}
