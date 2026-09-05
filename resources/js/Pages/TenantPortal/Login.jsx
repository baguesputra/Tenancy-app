import { useForm } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';
import Button from '@/Components/Form/Button';

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F1E36] text-white font-bold text-lg mb-4">
                        T
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">Portal Tenant</h1>
                    <p className="text-sm text-gray-500 mt-1">Masuk untuk mengajukan surat izin</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
                    <form onSubmit={submit}>
                        <FormField label="Username" error={errors.username} required>
                            <TextInput
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                autoFocus
                            />
                        </FormField>

                        <FormField label="Password" error={errors.password} required>
                            <TextInput
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                        </FormField>

                        <Button type="submit" disabled={processing} className="w-full mt-2">
                            {processing ? 'Memproses...' : 'Masuk'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}