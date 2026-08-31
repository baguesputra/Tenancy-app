import { useForm } from '@inertiajs/react';

export default function Login({ allowLocalLogin }) {
    const { data, setData, post, processing, errors } = useForm({
        employee_number: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    if (!allowLocalLogin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Login lokal dinonaktifkan. Silakan gunakan SSO.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h1 className="text-xl font-bold mb-6">Login — Tenant</h1>

                <label className="block mb-2 text-sm font-medium">Employee Number</label>
                <input
                    type="text"
                    value={data.employee_number}
                    onChange={(e) => setData('employee_number', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                    placeholder="TOP-123456"
                />
                {errors.employee_number && (
                    <p className="text-red-500 text-sm mb-2">{errors.employee_number}</p>
                )}

                <label className="block mb-2 text-sm font-medium">Password</label>
                <input
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                />

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-600 text-white rounded py-2 font-medium"
                >
                    Masuk
                </button>
            </form>
        </div>
    );
}