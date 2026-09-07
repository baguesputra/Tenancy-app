import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function PortalLayout({ children }) {
    const { auth } = usePage().props;
    const currentUrl = usePage().url;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => setMobileNavOpen(false), [currentUrl]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const logout = () => router.post('/portal/logout');

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {mobileNavOpen && (
                <div onClick={() => setMobileNavOpen(false)} className="fixed inset-0 bg-black/30 z-30 lg:hidden" />
            )}

            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-[#0F1E36] flex flex-col z-40
                    transition-transform duration-200 ease-out
                    ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <div className="px-5 py-5 border-b border-white/[0.08] shrink-0 h-[57px] flex items-center">
                    <div>
                        <h1 className="font-semibold text-white text-[15px] tracking-tight">Portal Tenant</h1>
                        <p className="text-white/40 text-xs mt-0.5">{auth.tenantUser?.tenant?.name}</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    <NavLink href="/portal/dashboard" currentUrl={currentUrl}>Dashboard</NavLink>
                    <NavLink href="/portal/permits" currentUrl={currentUrl}>Surat Izin</NavLink>
                </nav>
            </aside>

            <div className="lg:ml-64 min-h-screen flex flex-col">
                <header className="sticky top-0 z-20 bg-white border-b border-[#E2E5EA] h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
                    <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="hidden lg:block" />

                    <div className="relative" ref={profileRef}>
                        <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-[#0F1E36] text-white text-xs font-medium flex items-center justify-center shrink-0">
                                {auth.tenantUser?.tenant?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden sm:block text-sm font-medium text-gray-700">{auth.tenantUser?.tenant?.name}</span>
                            <svg className="hidden sm:block w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#E2E5EA] shadow-lg py-1.5 z-30">
                                <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <FlashBanner />
                <div className="flex-1 flex flex-col">{children}</div>
            </div>
        </div>
    );
}

function NavLink({ href, currentUrl, children }) {
    const isActive = currentUrl.startsWith(href);
    return (
        <Link
            href={href}
            className={`relative flex items-center px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                ${isActive ? 'text-white bg-white/[0.08]' : 'text-white/55 hover:text-white/90 hover:bg-white/[0.04]'}`}
        >
            {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2F6FED]" />}
            <span className={isActive ? 'ml-1' : ''}>{children}</span>
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