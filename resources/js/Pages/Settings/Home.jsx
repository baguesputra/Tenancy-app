import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import useCan from '@/hooks/useCan';
import { SETTINGS_ITEMS } from '@/Components/Settings/settingsItems';

/**
 * `/settings` bukan halaman sendiri: modulnya sudah menjadi menu di sidebar.
 * Pengunjung yang sampai di sini (tautan lama, ketik langsung) dialihkan ke
 * modul pertama yang boleh ia buka.
 */
export default function Home() {
    const { can } = useCan();
    const first = SETTINGS_ITEMS.find((item) => can(item.permission));

    useEffect(() => {
        if (first) router.visit(first.href);
    }, [first]);

    return (
        <AppLayout>
            <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mx-auto w-full max-w-3xl">
                    <h1 className="text-xl font-semibold tracking-tight text-gray-900">Pengaturan</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {first ? 'Membuka modul…' : 'Tidak ada modul yang bisa diakses dengan akun ini.'}
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
