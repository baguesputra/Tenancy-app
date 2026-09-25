import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Breadcrumbs from '@/Components/Breadcrumbs';
import QrScanModal from '@/Components/Scan/QrScanModal';
import initials from '@/utils/initials';

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
    refresh: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3.5M19 15a8 8 0 01-14 3.5" />
        </svg>
    ),
};

const masterMenuItems = [
    { label: 'Tenant', href: '/tenants', permission: 'tenants.view' },
    { label: 'Unit', href: '/units', permission: 'units.view' },
    { label: 'Kontrak / Tenancy', href: '/tenancies', permission: 'tenancies.view' },
    { label: 'Kategori', href: '/categories', permission: 'categories.view' },
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
        { label: 'Sinkronisasi Gate', href: '/settings/gate', icon: menuIcons.refresh },
        { label: 'Template Inspeksi', href: '/settings/inspection-templates', icon: menuIcons.sidak },
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
        if (!mobileNavOpen) return;
        const handleKey = (e) => e.key === 'Escape' && setMobileNavOpen(false);
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [mobileNavOpen]);

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
                <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 lg:hidden" aria-hidden="true" />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0F1E36] transition-all duration-200
                    ${collapsed ? 'w-[72px]' : 'w-[232px]'}
                    ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                aria-label="Navigasi utama"
            >
                <div className="shrink-0 border-b border-white/10">
                    <div className={`flex items-center h-16 ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'}`}>
                        <Link
                            href="/dashboard"
                            aria-label="Dashboard"
                            className={`flex items-center rounded-xl focus-visible:outline-2 focus-visible:outline-white min-h-[40px] ${collapsed ? 'justify-center' : 'gap-2.5 flex-1 min-w-0 px-1'}`}
                        >
                            <img src="/images/logo.png" alt="Duta Mall" className="h-8 w-8 object-contain rounded-lg bg-white p-0.5 shrink-0" />
                            {!collapsed && (
                                <span className="leading-tight min-w-0">
                                    <span className="block text-sm font-semibold text-white truncate">Tenant</span>
                                    <span className="block text-[11px] text-white/50 truncate">{auth.user?.branch?.name ?? 'Semua Cabang'}</span>
                                </span>
                            )}
                        </Link>
                        {!collapsed && (
                            <button
                                onClick={toggleCollapsed}
                                title="Ciutkan sidebar"
                                aria-label="Ciutkan sidebar"
                                className="hidden lg:flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {collapsed && (
                        <div className="flex justify-center pb-2">
                            <button
                                onClick={toggleCollapsed}
                                title="Perluas sidebar"
                                aria-label="Perluas sidebar"
                                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                            >
                                <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto" role="navigation">
                    {!collapsed && <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">Menu</p>}
                    <NavLink href="/dashboard" currentUrl={currentUrl} icon={menuIcons.dashboard} collapsed={collapsed}>
                        Dashboard
                    </NavLink>

                    {visibleMasterMenuItems.length > 0 && (
                        <div className="pt-1">
                            {!collapsed && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">Master Data</p>}
                            <button
                                onClick={() => collapsed ? setCollapsed(false) : setMasterOpen(!masterOpen)}
                                title="Master Data"
                                aria-label="Master Data"
                                aria-expanded={masterOpen && !collapsed}
                                className={`w-full flex items-center min-h-[40px] px-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white
                                    ${collapsed ? 'justify-center py-2.5' : 'justify-between py-2.5'}
                                    ${isMasterActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="shrink-0" aria-hidden="true">{menuIcons.master}</span>
                                    {!collapsed && <span>Master Data</span>}
                                </span>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 shrink-0 text-white/60 transition-transform ${masterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            {masterOpen && !collapsed && (
                                <div className="mt-1 ml-[22px] pl-3 border-l border-white/10 space-y-0.5">
                                    {visibleMasterMenuItems.map((item) => (
                                        <NavLink key={item.href} href={item.href} currentUrl={currentUrl} small collapsed={false}>
                                            {item.label}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {can('tenants.view') && (
                        <NavLink href="/tenant-profiles" currentUrl={currentUrl} icon={menuIcons.users} collapsed={collapsed}>
                            Profile Tenant
                        </NavLink>
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
                            {!collapsed && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">Pengaturan</p>}
                            <button
                                onClick={() => collapsed ? setCollapsed(false) : setSettingsOpen(!settingsOpen)}
                                title="Pengaturan"
                                aria-label="Pengaturan"
                                aria-expanded={settingsOpen && !collapsed}
                                className={`w-full flex items-center min-h-[40px] px-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white
                                    ${collapsed ? 'justify-center py-2.5' : 'justify-between py-2.5'}
                                    ${isSettingsActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="shrink-0" aria-hidden="true">{menuIcons.settings}</span>
                                    {!collapsed && <span>Pengaturan</span>}
                                </span>
                                {!collapsed && (
                                    <svg className={`w-4 h-4 shrink-0 text-white/60 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            {settingsOpen && !collapsed && (
                                <div className="mt-1 ml-[22px] pl-3 border-l border-white/10 space-y-0.5">
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
            </aside>

            <div className={`min-h-screen flex flex-col transition-all duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[232px]'}`}>
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
    const [scanOpen, setScanOpen] = useState(false);
    const isSuperAdmin = user?.roles?.includes('super_admin');
    const canScan = isSuperAdmin || user?.permissions?.includes('sidak.view') || user?.permissions?.includes('permits.view');
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const profileBtnRef = useRef(null);
    const notifBtnRef = useRef(null);
    const { notifications = [], unreadNotificationsCount = 0 } = usePage().props;

    const markAsRead = (id, url) => {
        setNotifOpen(false);
        router.post(`/notifications/${id}/read`, {}, { onFinish: () => url ? router.visit(url) : router.reload() });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                if (notifOpen) { setNotifOpen(false); notifBtnRef.current?.focus(); }
                if (profileOpen) { setProfileOpen(false); profileBtnRef.current?.focus(); }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [notifOpen, profileOpen]);

    return (
        <header className="sticky top-0 z-20 h-16 shrink-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-[#E2E5EA]">
            <div className="flex items-center justify-between h-full px-4 sm:px-6 gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden h-10 w-10 flex items-center justify-center -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0"
                        aria-label="Buka menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="min-w-0">
                        <Breadcrumbs />
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {canScan && (
                        <button
                            type="button"
                            onClick={() => setScanOpen(true)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-label="Scan QR"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" />
                            </svg>
                        </button>
                    )}
                    <div className="relative" ref={notifRef}>
                        <button
                            ref={notifBtnRef}
                            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                            className="relative h-10 w-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-label={`Notifikasi${unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} belum dibaca` : ''}`}
                            aria-expanded={notifOpen}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#FF6B6B] text-white text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-white">
                                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-[#E2E5EA] shadow-xl z-30 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notifikasi</p>
                                    {unreadNotificationsCount > 0 && (
                                        <span className="text-[11px] font-medium text-[#0F1E36] bg-[#0F1E36]/5 rounded-full px-2 py-0.5">{unreadNotificationsCount} baru</span>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto py-1">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400" aria-hidden="true">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            </span>
                                            <p className="text-sm font-medium text-gray-700">Belum ada notifikasi</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Notifikasi baru akan muncul di sini.</p>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <button
                                                key={n.id}
                                                onClick={() => markAsRead(n.id, n.url)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36] flex gap-2.5"
                                            >
                                                <span className="mt-1.5 h-2 w-2 rounded-full bg-[#FF6B6B] shrink-0" aria-hidden="true" />
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium text-gray-800 truncate">{n.title}</span>
                                                    <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</span>
                                                    <span className="block text-xs text-gray-400 mt-1">{n.created_at}</span>
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={profileRef}>
                        <button
                            ref={profileBtnRef}
                            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                            className="flex items-center gap-2 h-10 pl-1.5 pr-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            aria-expanded={profileOpen}
                            aria-label="Menu pengguna"
                        >
                            {user?.photo_url ? (
                                <img src={user.photo_url} alt={user?.name ?? 'Foto pengguna'} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                                <span className="w-8 h-8 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                    {initials(user?.name ?? '?')}
                                </span>
                            )}
                            <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[140px]">{user?.name}</span>
                            <svg className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E2E5EA] shadow-xl z-30 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                                    {user?.photo_url ? (
                                        <img src={user.photo_url} alt={user?.name ?? 'Foto pengguna'} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <span className="w-9 h-9 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(user?.name ?? '?')}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-gray-800 truncate">{user?.name}</span>
                                        <span className="block text-xs text-gray-500 truncate">{user?.branch?.name ?? 'Semua Cabang'}</span>
                                        <span className="block text-xs text-gray-400 mt-0.5 font-mono truncate">{user?.employee_number}</span>
                                    </span>
                                </div>
                                <div className="py-1.5">
                                    <Link
                                        href="/password/change"
                                        className="flex items-center gap-2.5 px-4 py-2.5 min-h-[40px] text-sm text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        Ubah Kata Sandi
                                    </Link>
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 min-h-[40px] text-sm text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-red-500"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Keluar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <QrScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
        </header>
    );
}

function NavLink({ href, currentUrl, children, icon, small = false, collapsed = false }) {
    const isActive = currentUrl === href || currentUrl.startsWith(href + '/') || (href !== '/dashboard' && currentUrl.startsWith(href));

    return (
        <Link
            href={href}
            title={collapsed && typeof children === 'string' ? children : undefined}
            aria-label={collapsed && typeof children === 'string' ? children : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex items-center gap-3 px-3 rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white min-h-[40px]
                ${small ? 'py-2' : 'py-2.5'}
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
    const { flash, errors } = usePage().props;
    const errorMessages = Object.values(errors ?? {}).flat().filter(Boolean);
    if (!flash?.success && errorMessages.length === 0) return null;

    return (
        <div className="shrink-0">
            {flash?.success && (
                <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-4 sm:px-6 py-3 flex items-center gap-2 whitespace-pre-line" role="status">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {flash.success}
                </div>
            )}
            {errorMessages.length > 0 && (
                <div className="bg-red-50 border-b border-red-100 text-red-700 text-sm px-4 sm:px-6 py-3" role="alert">
                    <ul className="list-disc pl-5 space-y-0.5">
                        {errorMessages.slice(0, 5).map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

