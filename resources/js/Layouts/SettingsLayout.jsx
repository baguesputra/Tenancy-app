import AppLayout from '@/Layouts/AppLayout';

/**
 * Pembungkus halaman modul pengaturan. Navigasi modulnya ada di sidebar
 * utama (seksi Pengaturan), jadi layout ini hanya menjaga lebar dan jarak
 * konten agar sama di tiap modul.
 */
export default function SettingsLayout({ children }) {
    return (
        <AppLayout>
            <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mx-auto w-full max-w-7xl">
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}
