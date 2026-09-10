import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef, Fragment } from 'react';


const menuIcons = {
    dashboard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
     master: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    sidak: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    permit: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    access: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

// Sidebar width constants
const SIDEBAR_WIDTH_EXPANDED = '16rem'; // w-64 = 256px
const SIDEBAR_WIDTH_COLLAPSED = '4.5rem'; // 72px

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;

    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const permissions = auth.user?.permissions ?? [];
    const can = (perm) => isSuperAdmin || permissions.includes(perm);
     
    // Filter menu Master Data sesuai permission user
    const visibleMasterMenuItems = masterMenuItems.filter((item) => can(item.permission));
    const isMasterActive = visibleMasterMenuItems.some((item) => currentUrl.startsWith(item.href));
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
    
    // Use inline styles for smooth width transition
    const sidebarStyle = {
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
    };
    
    const contentStyle = {
        marginLeft: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
    };

    return (
        <div className="min-h-screen bg-[#FAFCFF]">
            {mobileNavOpen && (
                <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
            )}

            <aside
                style={sidebarStyle}
                className={`fixed inset-y-0 left-0 flex flex-col z-40
                    transition-all duration-300 ease-out
                    ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                aria-label="Navigasi utama"
            >
                {/* Sidebar background with glassmorphism */}
                <div className="absolute inset-0 bg-[#0F1E36]/95 backdrop-blur-xl border-r border-white/[0.06]" />
                
                <div className="relative flex flex-col h-full">
                    {/* Header */}
                    <div className={`flex items-center border-b border-white/[0.08] shrink-0 h-14 px-5 transition-all duration-300
                        ${collapsed ? 'justify-center' : ''}`}>
                        {!collapsed && (
                            <div className="w-full opacity-100 transition-opacity duration-200">
                                <h1 className="font-semibold text-white text-[15px] tracking-tight flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                        </svg>
                                    </span>
                                    Tenant
                                </h1>
                                <p className="text-white/40 text-xs mt-0.5 truncate">{auth.user?.branch?.name ?? 'Semua Cabang'}</p>
                            </div>
                        )}
                        {collapsed && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden" role="navigation">
                        <NavLink href="/dashboard" currentUrl={currentUrl} icon={menuIcons.dashboard} collapsed={collapsed}>
                            Dashboard
                        </NavLink>
                        
                        {visibleMasterMenuItems.length > 0 && (
                            <div className="pt-1">
                                <button
                                    onClick={() => collapsed ? null : setMasterOpen(!masterOpen)}
                                    title="Master Data"
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                        ${collapsed ? 'justify-center' : 'justify-between'}
                                        ${isMasterActive ? 'text-white bg-white/[0.06]' : 'text-white/60 hover:text-white hover:bg-white/[0.04]'}`}
                                    aria-expanded={masterOpen && !collapsed}
                                >
                                    <span className="flex items-center gap-3">
                                        <span className={`shrink-0 transition-colors duration-200 ${isMasterActive ? 'text-[#FF6B6B]' : ''}`}>
                                            {menuIcons.master}
                                        </span>
                                        {!collapsed && <span>Master Data</span>}
                                    </span>
                                    {!collapsed && (
                                        <svg className={`w-4 h-4 transition-transform duration-200 shrink-0 ${masterOpen ? 'rotate-180' : ''} ${isMasterActive ? 'text-[#FF6B6B]' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </button>

                                {masterOpen && !collapsed && (
                                    <div className="mt-1 ml-3 pl-3 border-l border-white/[0.06] space-y-0.5 animate-slideDown">
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
                            <div className="pt-2 mt-2 border-t border-white/[0.06]">
                                {!collapsed && (
                                    <p className="px-3 pb-2 text-xs text-white/30 uppercase tracking-wider">Pengaturan</p>
                                )}
                                <NavLink href="/settings/users" currentUrl={currentUrl} icon={menuIcons.users} collapsed={collapsed}>
                                    Manajemen User
                                </NavLink>
                                <NavLink href="/settings/access-control" currentUrl={currentUrl} icon={menuIcons.access} collapsed={collapsed}>
                                    Hak Akses
                                </NavLink>
                            </div>
                        )}
                    </nav>

                    {/* Collapse toggle at bottom */}
                    <div className="p-3 border-t border-white/[0.06] shrink-0">
                        <button
                            onClick={toggleCollapsed}
                            className="w-full flex items-center justify-end px-3 py-2.5 rounded-lg transition-all duration-200
                                text-white/50 hover:text-white hover:bg-white/[0.06]"
                            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                        >
                            <svg className={`w-5 h-5 transition-transform duration-300 ease-out ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            <div style={contentStyle} className="min-h-screen flex flex-col transition-all duration-300 ease-out lg:ml-0">
                <Topbar user={auth.user} onMenuClick={() => setMobileNavOpen(true)} onLogout={logout} breadcrumbs={getBreadcrumbs(currentUrl)} />
                <FlashBanner />
                <div className="flex-1 flex flex-col">{children}</div>
            </div>
        </div>
    );
}

// Breadcrumb helper
function getBreadcrumbs(url) {
    const segments = url.split('/').filter(Boolean);
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
        if (labelMap[segment] || segment.match(/^[a-f0-9-]{36}$/)) {
            // Skip UUIDs
            if (!segment.match(/^[a-f0-9-]{36}$/)) {
                crumbs.push({ label: labelMap[segment] || segment, href: currentPath });
            }
        }
    }
    return crumbs;
}

function Topbar({ user, onMenuClick, onLogout, breadcrumbs }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const searchRef = useRef(null);
    const { notifications, unreadNotificationsCount } = usePage().props;

    const markAsRead = (id, url) => {
        router.post(`/notifications/${id}/read`, {}, { onFinish: () => router.visit(url) });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut: ⌘K / Ctrl+K for search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setNotifOpen(false);
                setProfileOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-20 h-14 shrink-0">
            {/* Glass topbar background */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-[#E2E5EA] shadow-sm" />
            
            <div className="relative flex items-center justify-between h-full px-4 sm:px-6">
                {/* Left: Mobile menu + Breadcrumbs + Search */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <button 
                        onClick={onMenuClick} 
                        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                        aria-label="Buka menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="hidden sm:flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1.5">
                            {breadcrumbs.map((crumb, idx) => (
                                <Fragment key={crumb.href}>
                                    {idx > 0 && (
                                        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                    {idx === breadcrumbs.length - 1 ? (
                                        <span className="font-medium text-gray-900 truncate max-w-[200px]">{crumb.label}</span>
                                    ) : (
                                        <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100">
                                            {crumb.label}
                                        </Link>
                                    )}
                                </Fragment>
                            ))}
                        </ol>
                    </nav>

                    {/* Global Search (⌘K) */}
                    <div className="relative ml-auto hidden lg:block" ref={searchRef}>
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-500 transition-all duration-200 group w-56"
                            aria-label="Cari global (⌘K)"
                            aria-expanded={searchOpen}
                        >
                            <svg className="w-4 h-4 transition-colors group-hover:text-[#FF6B6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">Cari tenant, unit, izin...</span>
                            <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white/50 rounded">
                                <span>⌘</span>K
                            </kbd>
                        </button>
                        
                        {searchOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-2 z-30 animate-fadeIn">
                                <div className="px-3">
                                    <label className="sr-only" htmlFor="global-search">Pencarian global</label>
                                    <input
                                        id="global-search"
                                        type="search"
                                        placeholder="Cari tenant, unit, kontrak, izin..."
                                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#E2E5EA] rounded-lg focus:ring-2 focus:ring-[#FF6B6B]/20 focus:border-[#FF6B6B] outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div className="border-t border-[#E2E5EA] mt-2 pt-2 px-3">
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">⌘</kbd>
                                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">K</kbd>
                                        untuk buka/tutup
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Notifications + User */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                            aria-label={`Notifikasi${unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} belum dibaca` : ''}`}
                            aria-expanded={notifOpen}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF6B6B] text-white text-[10px] font-semibold rounded-full flex items-center justify-center animate-pulse">
                                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-88 bg-white rounded-xl border border-[#E2E5EA] shadow-xl py-2 z-30 max-h-96 overflow-y-auto animate-fadeIn">
                                <div className="px-4 py-2.5 border-b border-[#E2E5EA] flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notifikasi</p>
                                    {notifications.length > 0 && (
                                        <button className="text-xs text-[#FF6B6B] hover:text-[#E05555] font-medium">Tandai semua</button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <p className="px-4 py-8 text-sm text-gray-400 text-center">Belum ada notifikasi.</p>
                                ) : (
                                    notifications.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => markAsRead(n.id, n.url)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
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

                    {/* User Profile */}
                    <div className="relative" ref={profileRef}>
                        <button 
                            onClick={() => setProfileOpen(!profileOpen)} 
                            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                            aria-expanded={profileOpen}
                            aria-label="Menu pengguna"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F1E36] to-[#1a2f52] text-white text-xs font-medium flex items-center justify-center shrink-0 relative">
                                {user?.name?.charAt(0).toUpperCase()}
                                {/* Online indicator */}
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[160px]">{user?.employee_number}</p>
                            </div>
                            <svg className="hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-[#E2E5EA] shadow-xl py-1.5 z-30 animate-fadeIn">
                                <div className="px-4 py-3 border-b border-[#E2E5EA]">
                                    <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{user?.employee_number}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{user?.roles?.[0]?.replace('_', ' ') ?? 'User'}</p>
                                </div>
                                <button onClick={onLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
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
    const isActive = currentUrl.startsWith(href);

    return (
        <Link
            href={href}
            title={collapsed ? children : undefined}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${collapsed ? 'justify-center' : ''}
                ${small ? 'text-sm' : 'text-sm font-medium'}
                ${isActive 
                    ? 'text-white bg-gradient-to-r from-[#FF6B6B]/15 to-transparent' 
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'}`}
            aria-current={isActive ? 'page' : undefined}
        >
            {isActive && !collapsed && (
                <span className="absolute left-0 top-1 bottom-1 w-1 bg-[#FF6B6B] rounded-r-full" />
            )}
            {icon && <span className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-[#FF6B6B]' : ''}`}>{icon}</span>}
            {!collapsed && <span className="truncate">{children}</span>}
        </Link>
    );
}

function FlashBanner() {
    const { flash } = usePage().props;
    if (!flash?.success) return null;

    return (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-4 sm:px-8 py-3 flex items-center gap-2 shrink-0 animate-slideDown">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {flash.success}
        </div>
    );
}