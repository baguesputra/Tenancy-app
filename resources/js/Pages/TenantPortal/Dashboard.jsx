export default function Dashboard() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold text-gray-800">Portal Tenant</h1>
            <p className="text-gray-600 mt-2">Selamat datang. Fitur pengajuan surat izin akan muncul di sini.</p>

            <form method="POST" action="/portal/logout" className="mt-6">
                <input
                    type="hidden"
                    name="_token"
                    value={document.querySelector('meta[name="csrf-token"]')?.content}
                />
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">
                    Logout
                </button>
            </form>
        </div>
    );
}