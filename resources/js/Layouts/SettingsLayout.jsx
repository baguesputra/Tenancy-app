import AppLayout from '@/Layouts/AppLayout';
import SettingsIcon from '@/Components/Settings/SettingsIcon';
import { SETTINGS_ITEMS } from '@/Components/Settings/settingsItems';
import { Link, usePage } from '@inertiajs/react';

const GROUPS = ['Pengguna & Akses', 'Operasional & Dokumen'];

export default function SettingsLayout({ children }) {
    const { auth } = usePage().props;
    const url = usePage().url;
    const permissions = auth.user?.permissions ?? [];
    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const can = (permission) => isSuperAdmin || permissions.includes(permission);
    const items = SETTINGS_ITEMS.filter((item) => can(item.permission));

    return (
        <AppLayout>
            <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:flex-row lg:items-start">
                    <aside className="w-full shrink-0 scroll-mt-20 lg:sticky lg:top-20 lg:w-56">
                        <div className="mb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Administrasi</p>
                            <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Pengaturan</h1>
                        </div>
                        <div className="relative">
                            <nav
                                className="flex gap-1 overflow-x-auto rounded-xl border border-[#E2E5EA] bg-white p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-0.5 lg:overflow-visible"
                                aria-label="Menu pengaturan"
                            >
                                {GROUPS.map((group) => {
                                    const groupItems = items.filter((item) => item.group === group);
                                    if (groupItems.length === 0) return null;

                                    return (
                                        <div key={group} className="contents lg:block">
                                            <p className="hidden px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 lg:block">
                                                {group}
                                            </p>
                                            {groupItems.map((item) => {
                                                const active = url === item.href || url.startsWith(`${item.href}/`);

                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        aria-current={active ? 'page' : undefined}
                                                        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] lg:py-2 ${
                                                            active
                                                                ? 'bg-[#0F1E36] font-semibold text-white'
                                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <SettingsIcon name={item.icon} className="h-4 w-4 shrink-0" />
                                                        <span className="whitespace-nowrap lg:whitespace-normal">{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </nav>
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-white to-transparent lg:hidden"
                            />
                        </div>
                    </aside>
                    <main className="min-w-0 flex-1">{children}</main>
                </div>
            </div>
        </AppLayout>
    );
}