export default function SsoGagal({ error, ssoLogoutUrl }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] px-4">
            <div className="w-full max-w-md text-center">
                <div className="mb-6">
                    <img src="/images/logo.png" alt="Tenant App" className="h-10 w-auto mx-auto mb-3" />
                    <h1 className="text-lg font-bold text-gray-900">Sistem Manajemen Tenant</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-[#E2E5EA] p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-2">Login SSO Gagal</h2>
                    <p className="text-sm text-gray-500 mb-5">
                        {error || 'Terjadi kesalahan saat login via SSO. Silakan coba lagi atau hubungi admin.'}
                    </p>

                    <div className="space-y-2.5">
                        <a
                            href="/auth/sso/redirect"
                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl bg-[#0F1E36] text-white hover:bg-[#1a2f52] transition-colors"
                        >
                            Coba Lagi
                        </a>
                        <a
                            href={ssoLogoutUrl ?? 'https://gate.appdutamall.com/dashboard'}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl border border-[#E2E5EA] text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Kembali ke Portal Perusahaan
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
