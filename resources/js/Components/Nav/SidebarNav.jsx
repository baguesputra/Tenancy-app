import { Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import NavItem from './NavItem';
import {
    IconClipboard,
    IconClipboardCheck,
    IconContract,
    IconDocument,
    IconDoor,
    IconHome,
    IconKey,
    IconMap,
    IconPanelLeft,
    IconStorefront,
    IconTag,
    IconUserCircle,
    IconX,
} from '@/Components/Icons';

// Navigasi data-driven: tambah menu baru = tambah satu entri di sini.
// Menu berupa daftar panjang (bukan domain baru) wajib memakai pola halaman
// hub/index, bukan entri sidebar baru — sidebar hanya berisi pintu domain.
// Tiap entri punya ikon semantik sendiri; sebelumnya beberapa menu berbagi
// path ikon yang sama sehingga sulit dipindai.
//
// Seksi bersifat statis (label + hairline), bukan accordion: seluruh pintu
// domain selalu terlihat sehingga struktur aplikasi terbaca sekali lirik.
// Entri tanpa `permission` selalu tampil (mis. Dashboard).
const SECTIONS = [
    {
        key: 'utama',
        label: 'Utama',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: <IconHome className="h-4 w-4" /> },
            { label: 'Profile Tenant', href: '/tenant-profiles', permission: 'tenants.view', icon: <IconUserCircle className="h-4 w-4" /> },
        ],
    },
    {
        key: 'leasing',
        label: 'Leasing',
        items: [
            { label: 'LOO', href: '/loos', permission: 'loos.view', icon: <IconContract className="h-4 w-4" /> },
            { label: 'Checklist Operasional', href: '/fitout-checklists', permission: 'loos.view', icon: <IconClipboard className="h-4 w-4" /> },
        ],
    },
    {
        key: 'ops',
        label: 'Operasional',
        items: [
            { label: 'Denah Lantai', href: '/floor-plans', permission: 'units.view', icon: <IconMap className="h-4 w-4" /> },
            { label: 'Sesi Sidak', href: '/inspection-sessions', permission: 'sidak.view', icon: <IconClipboardCheck className="h-4 w-4" /> },
            { label: 'Surat Izin', href: '/permit-requests', permission: 'permits.view', icon: <IconDocument className="h-4 w-4" /> },
        ],
    },
    {
        key: 'master',
        label: 'Master Data',
        items: [
            { label: 'Tenant', href: '/tenants', permission: 'tenants.view', icon: <IconStorefront className="h-4 w-4" /> },
            { label: 'Unit', href: '/units', permission: 'units.view', icon: <IconDoor className="h-4 w-4" /> },
            { label: 'Kategori', href: '/categories', permission: 'categories.view', icon: <IconTag className="h-4 w-4" /> },
        ],
    },
];

// Pengaturan ikut dalam daftar yang sama — bukan dipin di dasar rail, agar
// seluruh navigasi memakai satu scroll container dan satu ritme seksi.
const SETTINGS_SECTION = {
    key: 'pengaturan',
    label: 'Pengaturan',
    items: [
        { label: 'Pengaturan', href: '/settings', anyPermission: ['users.manage', 'settings.gate', 'settings.permit_scan', 'settings.templates', 'settings.documents'], icon: <IconKey className="h-4 w-4" /> },
    ],
};

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
    const sections = SECTIONS
        .map((section) => ({
            ...section,
            visibleItems: section.items.filter((item) => item.anyPermission
                ? item.anyPermission.some((p) => can(p))
                : !item.permission || can(item.permission)),
        }))
        .filter((section) => section.visibleItems.length > 0);
    const settingsItems = SETTINGS_SECTION.items.filter((item) => can(item.permission));
    if (settingsItems.length > 0) {
        sections.push({ ...SETTINGS_SECTION, visibleItems: settingsItems });
    }

    const navRef = useRef(null);

    // Layout ikut remount tiap pindah halaman, jadi scroll container kembali ke
    // atas. Bawa item aktif ke tampilan lagi tanpa menggeser bila sudah terlihat.
    useEffect(() => {
        navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    }, [currentUrl]);

    return (
        <aside
            ref={asideRef}
            role={mobileNavOpen ? 'dialog' : undefined}
            aria-modal={mobileNavOpen ? 'true' : undefined}
            aria-label="Navigasi utama"
            className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0F1E36] transition-[width,transform] duration-200 motion-reduce:transition-none print:hidden
                ${collapsed ? 'w-[72px]' : 'w-[232px]'}
                ${mobileNavOpen ? 'translate-x-0 visible' : '-translate-x-full max-lg:invisible'} lg:translate-x-0`}
        >
            <div className="shrink-0 border-b border-white/10">
                <div className={`flex items-center h-16 ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'}`}>
                    <span className={collapsed ? 'group relative flex' : 'contents'}>
                    <Link
                        href="/dashboard"
                        aria-label={`Dashboard — ${user?.branch?.name ?? 'Semua Cabang'}`}
                        className={`relative flex items-center rounded-md min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
                            ${collapsed ? 'justify-center' : 'gap-2.5 flex-1 min-w-0 px-1'}`}
                    >
                        <img src="/images/logo.png" alt="" className="h-8 w-8 object-contain rounded-md bg-white p-0.5 shrink-0" />
                        {!collapsed && (
                            <span className="leading-tight min-w-0">
                                <span className="block text-sm font-semibold text-white truncate">Tenant</span>
                                <span className="block text-[11px] text-white/55 truncate">{user?.branch?.name ?? 'Semua Cabang'}</span>
                            </span>
                        )}
                    </Link>

                    {collapsed && (
                        /* Perluas rail — hanya layar besar dan saat ciut. Muncul
                            menutupi logo saat kursor mengarah ke area logo
                            (`group-hover`), bukan tab di tepi rail. */
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            aria-expanded="false"
                            aria-label="Perluas panel navigasi"
                            title="Perluas panel navigasi"
                            className="absolute inset-0 hidden items-center justify-center rounded-md bg-[#0F1E36]/90 text-white/70 opacity-0 transition-opacity duration-150 hover:text-white focus-visible:text-white group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto pointer-events-none lg:flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                        >
                            <IconPanelLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                        </button>
                    )}
                    </span>

                    {/* Tutup drawer — hanya relevan di layar kecil */}
                    <button
                        type="button"
                        data-autofocus
                        onClick={onRequestClose}
                        aria-label="Tutup menu"
                        className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <IconX className="h-5 w-5" />
                    </button>

                    {/* Ciutkan rail — hanya layar besar. Duduk di dalam baris
                        header, bergaya ghost menyatu dengan rail. */}
                    {!collapsed && (
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            aria-expanded="true"
                            aria-label="Ciutkan panel navigasi"
                            title="Ciutkan panel navigasi"
                            className="hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <IconPanelLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Satu scroll container untuk seluruh navigasi, termasuk
                Pengaturan. `min-h-0` wajib agar blok ini benar-benar bisa
                menyusut dan menyerahkan sisa tinggi ke scroll container. */}
            <nav ref={navRef} className="flex-1 min-h-0 px-2.5 py-3 thin-scrollbar overflow-y-auto">
                <div className="space-y-3">
                    {sections.map((section, index) => (
                        <NavSection
                            key={section.key}
                            section={section}
                            currentUrl={currentUrl}
                            collapsed={collapsed}
                            showDivider={collapsed && index > 0}
                        />
                    ))}
                </div>
            </nav>
        </aside>
    );
}

/**
 * Satu seksi navigasi: label mikro + daftar item. Saat rail ciut label
 * disembunyikan secara visual (`sr-only`) tetapi tetap ada di accessibility
 * tree, karena `aria-labelledby` butuh elemen yang bisa dirujuk.
 */
function NavSection({ section, currentUrl, collapsed, showDivider = false }) {
    const labelId = `nav-section-${section.key}`;

    return (
        <div role="group" aria-labelledby={labelId} className={showDivider ? 'pt-2.5 border-t border-white/10' : undefined}>
            <p
                id={labelId}
                className={
                    collapsed
                        ? 'sr-only'
                        : 'px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70'
                }
            >
                {section.label}
            </p>
            <div className="space-y-0.5">
                {section.visibleItems.map((item) => (
                    <NavItem key={item.href} href={item.href} currentUrl={currentUrl} icon={item.icon} collapsed={collapsed}>
                        {item.label}
                    </NavItem>
                ))}
            </div>
        </div>
    );
}
