import { useForm } from '@inertiajs/react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/portal/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h1 className="text-xl font-bold mb-1">Portal Tenant</h1>
                <p className="text-sm text-gray-500 mb-6">Login untuk mengajukan surat izin</p>

                <label className="block mb-2 text-sm font-medium">Username</label>
                <input
                    type="text"
                    value={data.username}
                    onChange={(e) => setData('username', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                />
                {errors.username && <p className="text-red-500 text-sm mb-2">{errors.username}</p>}

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