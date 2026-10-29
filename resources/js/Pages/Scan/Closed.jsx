export default function Closed({ permit_number, store_name, next_open_label, summary }) {
    return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E2E5EA] rounded-2xl p-6 sm:p-8 text-center">
                <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto mx-auto" />
                <p className="mt-4 inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Di luar jam akses</p>
                <h1 className="mt-2 font-mono text-lg font-bold text-gray-900">{permit_number}</h1>
                <p className="mt-1 text-sm text-gray-500">{store_name}</p>
                <p className="mt-3 text-sm text-gray-600">
                    QR keluar-masuk barang hanya bisa dipindai pada jam yang ditentukan.
                    {next_open_label && (
                        <>
                            <br />
                            Akses dibuka kembali{' '}
                            <span className="font-semibold text-gray-900">{next_open_label}</span>.
                        </>
                    )}
                </p>
                {summary && <p className="mt-3 text-xs text-gray-500">Jadwal akses: {summary}</p>}
                {!next_open_label && (
                    <p className="mt-2 text-xs text-gray-400">Hubungi kantor manajemen bila butuh akses di luar jadwal.</p>
                )}
            </div>
        </div>
    );
}