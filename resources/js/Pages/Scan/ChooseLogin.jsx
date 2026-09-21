import { Link } from '@inertiajs/react';

export default function ChooseLogin({ token }) {
    return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E2E5EA] rounded-2xl p-6 sm:p-8 text-center animate-stagger-in">
                <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto mx-auto" />
                <h1 className="mt-4 text-xl font-bold text-gray-900">Scan QR terdeteksi</h1>
                <p className="mt-1 text-sm text-gray-500">Pilih jalur masuk untuk melanjutkan.</p>
                <div className="mt-6 grid gap-2.5">
                    <Link
                        href="/portal/login"
                        className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                    >
                        Masuk sebagai Tenant Toko
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                    >
                        Masuk sebagai Staff Mall
                    </Link>
                </div>
                <p className="mt-4 text-[11px] text-gray-400">Login untuk melanjutkan ke hasil scan.</p>
            </div>
        </div>
    );
}
