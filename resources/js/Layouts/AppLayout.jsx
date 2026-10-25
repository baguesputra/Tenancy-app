import { Link, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Breadcrumbs from '@/Components/Breadcrumbs';
import QrScanModal from '@/Components/Scan/QrScanModal';
import EmptyState from '@/Components/EmptyState';
import SidebarNav from '@/Components/Nav/SidebarNav';
import initials from '@/utils/initials';

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;

    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const permissions = auth.user?.permissions ?? [];
    const can = (perm) => isSuperAdmin || permissions.includes(perm);

    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebar-collapsed') === '1';
    });
    const asideRef = useRef(null);
    const lastFocusedRef = useRef(null);

    const csrfToken = typeof document !== 'undefined'
        ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
        : '';

    const openMobileNav = () => {
        lastFocusedRef.current = document.activeElement;
        setMobileNavOpen(true);
    };

    const closeMobileNav = () => {
        setMobileNavOpen(false);
        const previous = lastFocusedRef.current;
        lastFocusedRef.current = null;
        if (previous && document.contains(previous)) previous.focus?.();
    };

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
            return next;
        });
    };

    // Pindah halaman = navigasi sudah terjadi, drawer mobile tidak diperlukan lagi.
    useEffect(() => {
        closeMobileNav();
    }, [currentUrl]);

    // Drawer mobile diperlakukan sebagai dialog: fokus dipindah ke dalam panel,
    // Tab terkurung di dalamnya, dan fokus dikembalikan ke pemicu saat ditutup.
    useEffect(() => {
        if (!mobileNavOpen) return;

        const node = asideRef.current;
        node?.querySelector('[data-autofocus]')?.focus();

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeMobileNav();
                return;
            }
            if (e.key !== 'Tab' || !node) return;

            const items = Array.from(node.querySelectorAll('a[href], button:not([disabled])'));
            if (items.length === 0) return;

            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [mobileNavOpen]);

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {mobileNavOpen && (
                <div onClick={closeMobileNav} className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 lg:hidden" aria-hidden="true" />
            )}

            <SidebarNav
                asideRef={asideRef}
                currentUrl={currentUrl}
                // Drawer mobile selalu tampil penuh walau rail desktop disetel ciut.
                collapsed={collapsed && !mobileNavOpen}
                onToggleCollapse={toggleCollapsed}
                can={can}
                user={auth.user}
                mobileNavOpen={mobileNavOpen}
                onRequestClose={closeMobileNav}
            />

            <div className={`min-h-screen flex flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[232px]'}`}>
                <Topbar user={auth.user} onMenuClick={openMobileNav} csrfToken={csrfToken} />
                <FlashBanner />
                <div className="flex-1 flex flex-col">{children}</div>
            </div>
        </div>
    );
}

function Topbar({ user, onMenuClick, csrfToken }) {
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
        <header className="sticky top-0 z-20 h-16 shrink-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-[#E2E5EA] print:hidden">
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
                                        <EmptyState
                                            variant="notification"
                                            size="sm"
                                            title="Belum Ada Notifikasi"
                                            description="Notifikasi baru akan muncul di sini."
                                            className="py-6"
                                        />
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
                                    <form method="POST" action="/logout">
                                        <input type="hidden" name="_token" value={csrfToken} />
                                        <button
                                            type="submit"
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 min-h-[40px] text-sm text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-red-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Keluar
                                        </button>
                                    </form>
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

function FlashBanner() {
    const { flash, errors } = usePage().props;
    const errorMessages = Object.values(errors ?? {}).flat().filter(Boolean);
    if (!flash?.success && !flash?.error && errorMessages.length === 0) return null;

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
            {flash?.error && (
                <div className="bg-red-50 border-b border-red-100 text-red-700 text-sm px-4 sm:px-6 py-3 flex items-center gap-2" role="alert">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {flash.error}
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
