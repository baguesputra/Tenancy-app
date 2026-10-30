import SettingsLayout from '@/Layouts/SettingsLayout';
import SettingsIcon from '@/Components/Settings/SettingsIcon';
import { SETTINGS_ITEMS } from '@/Components/Settings/settingsItems';
import { IconChevronRight } from '@/Components/Icons';
import { Link, usePage } from '@inertiajs/react';

const GROUPS = ['Pengguna & Akses', 'Operasional & Dokumen'];

export default function Home() {
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const can = (permission) => isSuperAdmin || permissions.includes(permission);
    const items = SETTINGS_ITEMS.filter((item) => can(item.permission));

    return (
        <SettingsLayout>
            <div className="w-full">
                <div className="mb-5 border-b border-[#E2E5EA] pb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">Modul Pengaturan</h2>
                    <p className="mt-0.5 text-sm text-gray-500">Pilih modul di bawah untuk mengelola data dan konfigurasi.</p>
                </div>

                <div className="space-y-6">
                    {GROUPS.map((group) => {
                        const groupItems = items.filter((item) => item.group === group);
                        if (groupItems.length === 0) return null;

                        return (
                            <section key={group} aria-label={group}>
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">{group}</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {groupItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="group flex h-full min-h-[76px] items-start gap-3 rounded-xl border border-[#E2E5EA] bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#0F1E36] ring-1 ring-[#E2E5EA]"
                                            >
                                                <SettingsIcon name={item.icon} className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                                                <span className="mt-0.5 block text-xs leading-relaxed text-gray-500 line-clamp-2">{item.description}</span>
                                            </span>
                                            <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" aria-hidden="true" />
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </SettingsLayout>
    );
}