import { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import NavItem from './NavItem';
import {
    IconBriefcase,
    IconBuilding,
    IconChevronDown,
    IconClipboard,
    IconClipboardCheck,
    IconClipboardList,
    IconContract,
    IconDocument,
    IconDoor,
    IconFileText,
    IconGrid,
    IconHome,
    IconKey,
    IconMap,
    IconPanelLeft,
    IconRefresh,
    IconSettings,
    IconStorefront,
    IconTag,
    IconUserCircle,
    IconUsers,
    IconX,
} from '@/Components/Icons';

// Grup navigasi data-driven: tambah menu baru = tambah satu entri di sini.
// Menu berupa daftar panjang (bukan domain baru) wajib memakai pola halaman
// hub/index, bukan entri sidebar baru — sidebar hanya berisi pintu domain.
// Tiap entri punya ikon semantik sendiri; sebelumnya beberapa menu berbagi
// path ikon yang sama sehingga sulit dipindai.
const NAV_GROUPS = [
    {
        key: 'leasing',
        label: 'Leasing',
        icon: <IconBriefcase className="h-5 w-5" />,
        items: [
            { label: 'LOO', href: '/loos', permission: 'loos.view', icon: <IconContract className="h-4 w-4" /> },
            { label: 'Checklist Operasional', href: '/fitout-checklists', permission: 'loos.view', icon: <IconClipboard className="h-4 w-4" /> },
        ],
    },
    {
        key: 'ops',
        label: 'Operasional',
        icon: <IconBuilding className="h-5 w-5" />,
        items: [
            { label: 'Denah Lantai', href: '/floor-plans', permission: 'units.view', icon: <IconMap className="h-4 w-4" /> },
            { label: 'Sesi Sidak', href: '/inspection-sessions', permission: 'sidak.view', icon: <IconClipboardCheck className="h-4 w-4" /> },
            { label: 'Surat Izin', href: '/permit-requests', permission: 'permits.view', icon: <IconDocument className="h-4 w-4" /> },
        ],
    },
    {
        key: 'master',
        label: 'Master Data',
        icon: <IconGrid className="h-5 w-5" />,
        items: [
            { label: 'Tenant', href: '/tenants', permission: 'tenants.view', icon: <IconStorefront className="h-4 w-4" /> },
            { label: 'Unit', href: '/units', permission: 'units.view', icon: <IconDoor className="h-4 w-4" /> },
            { label: 'Kategori', href: '/categories', permission: 'categories.view', icon: <IconTag className="h-4 w-4" /> },
        ],
    },
];

const SETTINGS_GROUP = {
    key: 'settings',
    label: 'Pengaturan',
    icon: <IconSettings className="h-5 w-5" />,
    items: [
        { label: 'Manajemen User', href: '/settings/users', permission: 'settings.access', icon: <IconUsers className="h-4 w-4" /> },
        { label: 'Hak Akses', href: '/settings/access-control', permission: 'settings.access', icon: <IconKey className="h-4 w-4" /> },
        { label: 'Sinkronisasi Gate', href: '/settings/gate', permission: 'settings.access', icon: <IconRefresh className="h-4 w-4" /> },
        { label: 'Template Inspeksi', href: '/settings/inspection-templates', permission: 'settings.access', icon: <IconClipboardList className="h-4 w-4" /> },
        { label: 'Dokumen Statis', href: '/settings/documents', permission: 'documents.manage', icon: <IconFileText className="h-4 w-4" /> },
    ],
};

const isUnder = (currentUrl, href) =>
    currentUrl === href || currentUrl.startsWith(href + '/') || (href !== '/dashboard' && currentUrl.startsWith(href));

/** Rail navigasi utama. Lebar & state ciut dikendalikan `AppLayout`. */
export default function SidebarNav({
    currentUrl,
    collapsed = false,
    onToggleCollapse,
    can,
    user,
    mobileNavOpen = false,
    onRequestClose,
    asideRef,
}) {
    const groups = NAV_GROUPS
        .map((group) => ({ ...group, visibleItems: group.items.filter((item) => can(item.permission)) }))
        .filter((group) => group.visibleItems.length > 0);
    const settingsItems = SETTINGS_GROUP.items.filter((item) => can(item.permission));
    const settingsActive = settingsItems.some((item) => isUnder(currentUrl, item.href));

    const [openGroups, setOpenGroups] = useState(() =>
        Object.fromEntries(groups.map((group) => [group.key, group.visibleItems.some((item) => isUnder(currentUrl, item.href))]))
    );
    const [settingsOpen, setSettingsOpen] = useState(settingsActive);
    const [flyout, setFlyout] = useState(null);

    // Kunci grup aktif: nilainya stabil per halaman sehingga efek di bawah hanya
    // berjalan saat benar-benar pindah domain (bukan tiap render).
    const activeGroupKey = groups
        .filter((group) => group.visibleItems.some((item) => isUnder(currentUrl, item.href)))
        .map((group) => group.key)
        .join(',');

    // Grup yang memuat halaman aktif dibuka otomatis — termasuk saat masuk lewat
    // breadcrumb/notifikasi, yang sebelumnya meninggalkan grup tertutup. Tidak
    // menutup paksa grup yang sedang dibuka/ditutup sendiri oleh pengguna.
    useEffect(() => {
        if (collapsed) {
            setOpenGroups({});
            setSettingsOpen(false);
            setFlyout(null);
            return;
        }
        if (activeGroupKey) {
            setOpenGroups((prev) => {
                const keys = activeGroupKey.split(',');
                if (keys.every((key) => prev[key])) return prev;
                return { ...prev, ...Object.fromEntries(keys.map((key) => [key, true])) };
            });
        }
        if (settingsActive) setSettingsOpen(true);
    }, [activeGroupKey, collapsed, settingsActive]);

    return (
        <aside
            ref={asideRef}
            role={mobileNavOpen ? 'dialog' : undefined}
            aria-modal={mobileNavOpen ? 'true' : undefined}
            aria-label="Navigasi utama"
            className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0F1E36] transition-[width,transform] duration-200 print:hidden
                ${collapsed ? 'w-[72px]' : 'w-[232px]'}
                ${mobileNavOpen ? 'translate-x-0 visible' : '-translate-x-full max-lg:invisible'} lg:translate-x-0`}
        >
            <div className="shrink-0 border-b border-white/10">
                <div className={`flex items-center h-16 ${collapsed ? 'justify-center px-1 gap-1' : 'gap-2 px-3'}`}>
                    <Link
                        href="/dashboard"
                        aria-label={`Dashboard — ${user?.branch?.name ?? 'Semua Cabang'}`}
                        className={`group relative flex items-center rounded-xl min-h-[40px] focus-visible:outline-2 focus-visible:outline-white
                            ${collapsed ? 'justify-center' : 'gap-2.5 flex-1 min-w-0 px-1'}`}
                    >
                        <img src="/images/logo.png" alt="" className="h-8 w-8 object-contain rounded-lg bg-white p-0.5 shrink-0" />
                        {!collapsed && (
                            <span className="leading-tight min-w-0">
                                <span className="block text-sm font-semibold text-white truncate">Tenant</span>
                                <span className="block text-[11px] text-white/50 truncate">{user?.branch?.name ?? 'Semua Cabang'}</span>
                            </span>
                        )}
                        {collapsed && (
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                                {user?.branch?.name ?? 'Semua Cabang'}
                            </span>
                        )}
                    </Link>

                    {/* Tutup drawer — hanya relevan di layar kecil */}
                    <button
                        type="button"
                        data-autofocus
                        onClick={onRequestClose}
                        aria-label="Tutup menu"
                        className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <IconX className="h-5 w-5" />
                    </button>

                    {/* Ciut/perluas rail — hanya relevan di layar besar */}
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? 'Perluas panel navigasi' : 'Ciutkan panel navigasi'}
                        title={collapsed ? 'Perluas panel navigasi' : 'Ciutkan panel navigasi'}
                        className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <IconPanelLeft className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* `overflow-visible` saat ciut wajib: flyout diposisikan di luar lebar
                rail, dan `overflow-y-auto` akan memotongnya (satu sumbu non-visible
                memaksa sumbu lain jadi auto). */}
            <nav className={`flex-1 px-2.5 py-3 space-y-1 ${collapsed ? 'overflow-visible' : 'thin-scrollbar overflow-y-auto'}`}>
                {!collapsed && <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">Menu</p>}
                <NavItem href="/dashboard" currentUrl={currentUrl} icon={<IconHome className="h-5 w-5" />} collapsed={collapsed}>
                    Dashboard
                </NavItem>
                {can('tenants.view') && (
                    <NavItem href="/tenant-profiles" currentUrl={currentUrl} icon={<IconUserCircle className="h-5 w-5" />} collapsed={collapsed}>
                        Profile Tenant
                    </NavItem>
                )}

                {groups.map((group) => (
                    <NavGroup
                        key={group.key}
                        group={group}
                        currentUrl={currentUrl}
                        collapsed={collapsed}
                        active={group.visibleItems.some((item) => isUnder(currentUrl, item.href))}
                        open={!!openGroups[group.key]}
                        flyoutOpen={flyout === group.key}
                        onToggle={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                        onFlyoutOpen={() => setFlyout(group.key)}
                        onFlyoutClose={() => setFlyout((current) => (current === group.key ? null : current))}
                    />
                ))}

                {settingsItems.length > 0 && (
                    <div className="mt-2 border-t border-white/10">
                        <NavGroup
                            group={{ ...SETTINGS_GROUP, visibleItems: settingsItems }}
                            currentUrl={currentUrl}
                            collapsed={collapsed}
                            active={settingsActive}
                            open={settingsOpen}
                            flyoutOpen={flyout === SETTINGS_GROUP.key}
                            onToggle={() => setSettingsOpen((open) => !open)}
                            onFlyoutOpen={() => setFlyout(SETTINGS_GROUP.key)}
                            onFlyoutClose={() => setFlyout((current) => (current === SETTINGS_GROUP.key ? null : current))}
                            flyoutAlign="bottom"
                        />
                    </div>
                )}
            </nav>
        </aside>
    );
}

/**
 * Grup navigasi (disclosure). Mode normal: submenu terbuka inline. Mode ciut:
 * submenu muncul sebagai flyout di samping rail, bisa dibuka lewat hover, klik,
 * maupun fokus keyboard — sebelumnya submenu tak terjangkau sama sekali.
 */
function NavGroup({ group, currentUrl, collapsed, active, open, flyoutOpen, onToggle, onFlyoutOpen, onFlyoutClose, flyoutAlign = 'top' }) {
    const wrapRef = useRef(null);
    const buttonRef = useRef(null);
    const expanded = collapsed ? flyoutOpen : open;
    const panelId = `nav-panel-${group.key}`;

    // Flyout: tutup saat klik di luar grup.
    useEffect(() => {
        if (!flyoutOpen) return;
        const onPointerDown = (e) => {
            if (!wrapRef.current?.contains(e.target)) onFlyoutClose();
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [flyoutOpen, onFlyoutClose]);

    const handleKeyDown = (e) => {
        if (e.key !== 'Escape' || !flyoutOpen) return;
        e.stopPropagation();
        // Fokuskan tombol lebih dulu agar fokus tidak hilang ke body saat panel
        // (tempat fokus berada) dilepas dari DOM.
        buttonRef.current?.focus();
        onFlyoutClose();
    };

    return (
        <div
            ref={wrapRef}
            className="relative pt-1"
            onMouseEnter={collapsed ? onFlyoutOpen : undefined}
            onMouseLeave={collapsed ? onFlyoutClose : undefined}
            onFocus={collapsed ? onFlyoutOpen : undefined}
            onBlur={collapsed ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) onFlyoutClose(); } : undefined}
            onKeyDown={handleKeyDown}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={collapsed ? (flyoutOpen ? onFlyoutClose : onFlyoutOpen) : onToggle}
                aria-label={collapsed ? group.label : undefined}
                aria-expanded={expanded}
                aria-controls={expanded ? panelId : undefined}
                className={`group relative w-full flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white
                    ${collapsed ? 'justify-center py-2.5' : 'justify-between py-2.5'}
                    ${active ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0" aria-hidden="true">{group.icon}</span>
                    {!collapsed && <span className="truncate">{group.label}</span>}
                </span>
                {!collapsed && (
                    <IconChevronDown
                        className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                )}
                {collapsed && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                        {group.label}
                    </span>
                )}
            </button>

            {!collapsed && open && (
                <div id={panelId} className="mt-1 ml-[22px] pl-3 border-l border-white/10 space-y-0.5">
                    {group.visibleItems.map((item) => (
                        <NavItem key={item.href} href={item.href} currentUrl={currentUrl} icon={item.icon} small>
                            {item.label}
                        </NavItem>
                    ))}
                </div>
            )}

            {collapsed && flyoutOpen && (
                <div
                    id={panelId}
                    className={`absolute left-full z-50 ml-2 w-60 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-[#E2E5EA] bg-white p-2 shadow-xl ${flyoutAlign === 'bottom' ? 'bottom-0' : 'top-0'}`}
                >
                    <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
                    <div className="space-y-0.5">
                        {group.visibleItems.map((item) => (
                            <NavItem key={item.href} href={item.href} currentUrl={currentUrl} icon={item.icon} small tone="light">
                                {item.label}
                            </NavItem>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}