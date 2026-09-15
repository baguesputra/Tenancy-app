import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';

const services = [
    { title: 'Surat Izin', desc: 'Ajukan & pantau sampai selesai', live: true },
    { title: 'Riwayat Pengajuan', desc: 'Semua pengajuan terdokumentasi', live: true },
    { title: 'Profil & Kontrak', desc: 'Data toko & masa sewa', live: false },
];

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const hasError = errors.username || errors.password;

    const submit = (e) => {
        e.preventDefault();
        post('/portal/login');
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <section aria-label="Layanan pengurusan toko" className="bg-[#0F1E36] text-white relative overflow-hidden mx-3 mb-8 rounded-3xl px-6 py-7 sm:px-10 lg:m-0 lg:rounded-none lg:px-16 lg:py-16 flex flex-col animate-stagger-in order-2 lg:order-1">
                <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-white/[0.07]" aria-hidden="true" />
                <div className="absolute right-24 -bottom-28 w-80 h-80 rounded-full bg-white/[0.05]" aria-hidden="true" />
                <div className="relative flex-1 flex flex-col max-w-xl">
                    <p className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                        Pengurusan toko dalam satu pintu
                    </p>
                    <h1 className="mt-4 text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight leading-[1.06]">
                        Kelola toko lebih cepat, tanpa antre ke kantor.
                    </h1>
                    <p className="mt-4 text-sm sm:text-base text-white/65 leading-relaxed max-w-md">
                        Satu akun untuk semua pengurusan tenant — mulai dari perizinan operasional sampai data toko dan kontrak.
                    </p>
                    <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden" aria-label="Layanan tersedia">
                        {services.map((s) => (
                            <span key={s.title} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 border border-white/10 rounded-full px-3 py-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.live ? 'bg-emerald-400' : 'bg-white/40'}`} aria-hidden="true" />
                                {s.title}
                            </span>
                        ))}
                    </div>
                    <ul className="mt-8 hidden sm:block divide-y divide-white/10 border-y border-white/10">
                        {services.map((s, i) => (
                            <li key={s.title} className="flex items-center gap-4 py-4">
                                <span className="font-mono text-xs text-white/40 w-6" aria-hidden="true">0{i + 1}</span>
                                <span className="flex-1">
                                    <span className="block text-sm font-semibold">{s.title}</span>
                                    <span className="block text-xs text-white/55 mt-0.5">{s.desc}</span>
                                </span>
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.live ? 'text-emerald-300' : 'text-white/40'}`}>
                                    {s.live ? 'Tersedia' : 'Segera'}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-auto pt-8 hidden sm:block text-xs text-white/45">Satu akun per toko · Minta akses ke pengelola Tenancy jika belum punya.</p>
                </div>
            </section>

            <main className="flex items-center justify-center px-6 pt-8 pb-4 sm:px-12 sm:py-10 lg:px-16 lg:py-10 animate-stagger-in order-1 lg:order-2" style={{ animationDelay: '80ms' }}>
                <div className="w-full max-w-sm">
                    <div className="flex items-center gap-2.5">
                        <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto" />
                        <span className="leading-tight">
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Portal Tenant</span>
                            <span className="block text-sm font-semibold text-gray-900">Masuk Toko</span>
                        </span>
                    </div>

                    <h2 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Masuk</h2>
                    <p className="text-sm text-gray-500 mt-1">Gunakan username toko dari pengelola.</p>

                    {hasError && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex gap-2.5" role="alert">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <span>{errors.username || errors.password}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <FormField label="Username" error={errors.username ? ' ' : null} required>
                            <TextInput
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                autoComplete="username"
                                autoFocus
                                placeholder="namatoko"
                                aria-label="Username toko"
                                className="py-3 rounded-xl text-base sm:text-sm"
                            />
                        </FormField>

                        <FormField label="Password" error={errors.password ? ' ' : null} required>
                            <div className="relative">
                                <TextInput
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    aria-label="Password"
                                    className="pr-11 py-3 rounded-xl text-base sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                    aria-pressed={showPassword}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        {showPassword ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0112 5c7 0 10 7 10 7a17 17 0 01-2.9 3.1M6.6 6.6A16.4 16.4 0 002 12s3 7 10 7c1.5 0 2.8-.3 4-.8" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z" />
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </FormField>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-3 text-[15px] sm:text-sm font-semibold text-white bg-[#0F1E36] rounded-xl hover:bg-[#1a2f52] active:scale-[0.99] disabled:opacity-60 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                        >
                            {processing && (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {processing ? 'Memproses…' : 'Masuk ke Portal'}
                        </button>
                    </form>

                    <p className="mt-6 text-xs text-gray-400 leading-relaxed">
                        Lupa kredensial? Hubungi pengelola Tenancy untuk reset akun toko.
                    </p>
                </div>
            </main>
        </div>
    );
}
