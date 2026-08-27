import { usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Dashboard
            </h1>
            <p className="text-gray-600">
                Selamat datang, {auth.user?.name} ({auth.user?.employee_number})
            </p>

            <form method="POST" action="/logout" className="mt-6">
                <input
                    type="hidden"
                    name="_token"
                    value={document.querySelector('meta[name="csrf-token"]')?.content}
                />
                <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded"
                >
                    Logout
                </button>
            </form>
        </div>
    );
}