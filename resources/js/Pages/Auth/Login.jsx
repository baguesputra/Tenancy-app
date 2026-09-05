import { useForm } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';
import Button from '@/Components/Form/Button';

export default function Login({ allowLocalLogin }) {
    const { data, setData, post, processing, errors } = useForm({
        employee_number: '',
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen flex">
            {/* Panel kiri — brand, hilang di layar kecil */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0F1E36] text-white flex-col justify-between p-12">
                <div>
                    <h1 className="text-2xl font-bold">Tenant</h1>
                    <p className="text-white/50 text-sm mt-1">Sistem Manajemen Tenant Mall</p>
                </div>
                <div>
                    <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                        Kelola tenant, kontrak, sidak, dan surat izin dalam satu platform terintegrasi.
                    </p>
                </div>
                <p className="text-white/30 text-xs">© {new Date().getFullYear()} — Internal System</p>
            </div>

            {/* Panel kanan — form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden mb-8 text-center">
                        <h1 className="text-xl font-bold text-[#0F1E36]">Tenant</h1>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Masuk</h2>
                    <p className="text-sm text-gray-500 mb-8">Login menggunakan akun karyawan kamu</p>

                    {!allowLocalLogin ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-4 rounded-lg">
                            Login lokal dinonaktifkan di environment ini. Silakan gunakan SSO.
                        </div>
                    ) : (
                        <form onSubmit={submit}>
                            <FormField label="Employee Number" error={errors.employee_number} required>
                                <TextInput
                                    value={data.employee_number}
                                    onChange={(e) => setData('employee_number', e.target.value)}
                                    placeholder="TOP-123456"
                                    autoFocus
                                />
                            </FormField>

                            <FormField label="Password" error={errors.password} required>
                                <TextInput
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                            </FormField>

                            <Button type="submit" disabled={processing} className="w-full mt-2">
                                {processing ? 'Memproses...' : 'Masuk'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}