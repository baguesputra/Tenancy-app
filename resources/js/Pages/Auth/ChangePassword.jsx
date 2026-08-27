import { useForm } from '@inertiajs/react';

export default function ChangePassword() {
    const { data, setData, put, processing, errors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        put('/password/change');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h1 className="text-xl font-bold mb-2">Ganti Password</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Wajib ganti password sebelum melanjutkan.
                </p>

                <label className="block mb-2 text-sm font-medium">Password Saat Ini</label>
                <input
                    type="password"
                    value={data.current_password}
                    onChange={(e) => setData('current_password', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-1"
                />
                {errors.current_password && (
                    <p className="text-red-500 text-sm mb-3">{errors.current_password}</p>
                )}

                <label className="block mb-2 text-sm font-medium">Password Baru</label>
                <input
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-1"
                />
                {errors.password && (
                    <p className="text-red-500 text-sm mb-3">{errors.password}</p>
                )}

                <label className="block mb-2 text-sm font-medium">Konfirmasi Password Baru</label>
                <input
                    type="password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-4"
                />

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-600 text-white rounded py-2 font-medium"
                >
                    Simpan
                </button>
            </form>
        </div>
    );
}