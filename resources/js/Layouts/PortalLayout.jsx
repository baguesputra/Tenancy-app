import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Breadcrumbs from '@/Components/Breadcrumbs';

export default function PortalLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const tenantName = auth.tenantUser?.tenant?.name ?? 'Toko Saya';

    useEffect(() => setProfileOpen(false), [currentUrl]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') setProfileOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const logout = () => router.post('/portal/logout');

    return (
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[#E2E5EA]">
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link href="/portal/dashboard" className="flex items-center gap-2.5 shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                        <img src="/images/logo.png" alt="Duta Mall" className="h-9 w-auto" />
                        <span className="hidden xs:block sm:block leading-tight">
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Portal Tenant</span>
                            <span className="block text-sm font-semibold text-gray-900 truncate max-w-[160px]">{tenantName}</span>
                        </span>
                    </Link>

                    <nav className="hidden sm:flex items-center gap-1 ml-2 sm:ml-6" aria-label="Navigasi portal">
                        <TopLink href="/portal/dashboard" currentUrl={currentUrl}>Beranda</TopLink>
                        <TopLink href="/portal/permits" currentUrl={currentUrl}>Surat Izin</TopLink>
                        <TopLink href="/portal/inspections" currentUrl={currentUrl}>Sidak</TopLink>
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                aria-expanded={profileOpen}
                                aria-label="Menu akun toko"
                                className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <span className="w-8 h-8 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                    {tenantName.charAt(0).toUpperCase()}
                                </span>
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-1.5 z-30 animate-fadeIn">
                                    <p className="px-4 py-2.5 text-sm font-medium text-gray-800 truncate border-b border-gray-100">{tenantName}</p>
                                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                        Keluar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <FlashBanner />
            <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 sm:pt-7 pb-28 sm:pb-12 flex-1 flex flex-col">
                <Breadcrumbs className="mb-4" />
                {children}
            </main>

            <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E2E5EA]" aria-label="Navigasi cepat portal">
                <div className="grid grid-cols-3 h-16">
                    <BottomLink href="/portal/dashboard" currentUrl={currentUrl} label="Beranda" icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />} />
                    <BottomLink href="/portal/permits" currentUrl={currentUrl} label="Surat Izin" icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />} />
                    <BottomLink href="/portal/inspections" currentUrl={currentUrl} label="Sidak" icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />} />
                </div>
            </nav>
        </div>
    );
}

function TopLink({ href, currentUrl, children }) {
    const isActive = href === '/portal/dashboard' ? currentUrl === href : currentUrl.startsWith(href);
    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                isActive ? 'text-white bg-[#0F1E36]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
            {children}
        </Link>
    );
}

function BottomLink({ href, currentUrl, label, icon }) {
    const isActive = href === '/portal/dashboard' ? currentUrl === href : currentUrl.startsWith(href);
    return (
        <Link
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                isActive ? 'text-[#0F1E36]' : 'text-gray-400'
            }`}
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                {icon}
            </svg>
            {label}
        </Link>
    );
}

function FlashBanner() {
    const { flash } = usePage().props;
    if (!flash?.success) return null;
    return (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 text-sm px-4 sm:px-8 py-3 flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {flash.success}
        </div>
    );
}
