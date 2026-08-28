import { Link } from '@inertiajs/react';

export default function Index({ sessions }) {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Riwayat Sesi Sidak</h1>
                    <Link
                        href="/inspection-sessions/current"
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Mulai / Lanjut Sesi
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm divide-y">
                    {sessions.data.map((session) => (
                        <Link
                            key={session.id}
                            href={`/inspection-sessions/${session.id}`}
                            className="flex justify-between items-center p-4 hover:bg-gray-50"
                        >
                            <div>
                                <p className="font-medium">
                                    {new Date(session.started_at).toLocaleDateString('id-ID')}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {session.branch.name} — {session.inspections.length} tenant
                                </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-1 rounded ${
                                    session.status === 'completed'
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-yellow-100 text-yellow-700'
                                }`}
                            >
                                {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                            </span>
                        </Link>
                    ))}
                    {sessions.data.length === 0 && (
                        <p className="p-4 text-sm text-gray-400">Belum ada riwayat sesi.</p>
                    )}
                </div>
            </div>
        </div>
    );
}