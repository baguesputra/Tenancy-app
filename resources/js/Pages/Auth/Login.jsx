import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';

const highlights = [
    { title: 'Terpusat', desc: 'Data tenant, unit, dan kontrak dalam satu sistem' },
    { title: 'Terkendali', desc: 'Alur persetujuan berjenjang sesuai kewenangan' },
    { title: 'Teraudit', desc: 'Seluruh aktivitas tercatat dan dapat ditelusuri' },
];

export default function Login({ allowLocalLogin }) {
    const { data, setData, post, processing, errors } = useForm({
        employee_number: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const hasError = errors.employee_number || errors.password;

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen bg-[#F4F6FA] grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
            <main className="flex items-center justify-center px-6 pt-8 pb-4 sm:px-12 sm:py-10 lg:px-16 animate-stagger-in order-1">
                <div className="w-full max-w-sm">
                    <div className="flex items-center gap-2.5">
                        <img src="/images/logo.png" alt="Duta Mall" className="h-10 w-auto" />
                        <span className="leading-tight">
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Sistem Manajemen Tenant</span>
                            <span className="block text-sm font-semibold text-gray-900">Akses Internal</span>
                        </span>
                    </div>

                    <h1 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Masuk</h1>
                    <p className="text-sm text-gray-500 mt-1">Masuk menggunakan kredensial karyawan yang terdaftar.</p>

                    {hasError && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex gap-2.5" role="alert">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <span>{errors.employee_number || errors.password}</span>
                        </div>
                    )}

                    {!allowLocalLogin ? (
                        <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl" role="status">
                            Autentikasi lokal tidak tersedia pada environment ini. Hubungi administrator sistem.
                        </div>
                    ) : (
                        <form onSubmit={submit} className="mt-6 space-y-4">
                            <FormField label="Nomor Induk Karyawan" error={errors.employee_number ? ' ' : null} required>
                                <TextInput
                                    value={data.employee_number}
                                    onChange={(e) => setData('employee_number', e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="TOP-123456"
                                    aria-label="Nomor induk karyawan"
                                    className="py-3 rounded-xl font-mono text-base sm:text-sm"
                                />
                            </FormField>

                            <FormField label="Kata Sandi" error={errors.password ? ' ' : null} required>
                                <div className="relative">
                                    <TextInput
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        aria-label="Kata sandi"
                                        className="pr-11 py-3 rounded-xl text-base sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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
                                {processing ? 'Memproses…' : 'Masuk'}
                            </button>
                        </form>
                    )}

                    <p className="mt-6 text-xs text-gray-400 leading-relaxed">
                        Mengalami kendala akses? Hubungi administrator sistem.
                    </p>
                </div>
            </main>

            <section aria-label="Tentang aplikasi" className="bg-[#0F1E36] text-white relative overflow-hidden mx-3 mb-8 rounded-3xl px-6 py-7 sm:px-10 lg:m-0 lg:rounded-none lg:px-16 lg:py-16 flex flex-col animate-stagger-in order-2" style={{ animationDelay: '80ms' }}>
                <div
                    className="absolute inset-0 opacity-[0.12]"
                    aria-hidden="true"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                        maskImage: 'radial-gradient(ellipse 90% 80% at 70% 20%, black 30%, transparent 75%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 70% 20%, black 30%, transparent 75%)',
                    }}
                />
                <div className="absolute -right-20 -bottom-28 w-80 h-80 rounded-full bg-[#FF6B6B]/10 blur-3xl" aria-hidden="true" />
                <div className="relative flex-1 flex flex-col max-w-xl">
                    <p className="inline-flex w-fit items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 border border-white/15 rounded-full px-3 py-1.5">
                        <span className="w-1.5 h-1.5 bg-[#FF6B6B]" aria-hidden="true" />
                        Aplikasi internal perusahaan
                    </p>
                    <h2 className="mt-4 text-2xl sm:text-3xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.08]">
                        Pengelolaan tenant dalam satu sistem terpadu.
                    </h2>
                    <p className="mt-3 text-sm sm:text-[15px] text-white/65 leading-relaxed max-w-md">
                        Mendukung pengelolaan data tenant, administrasi kontrak, inspeksi lapangan, dan perizinan operasional secara terstruktur.
                    </p>

                    <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden" aria-label="Keunggulan sistem">
                        {highlights.map((h) => (
                            <span key={h.title} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 border border-white/10 rounded-full px-3 py-1.5">
                                {h.title}
                            </span>
                        ))}
                    </div>

                    <ul className="mt-8 hidden sm:block border-y border-white/10 divide-y divide-white/10">
                        {highlights.map((h) => (
                            <li key={h.title} className="py-4">
                                <span className="block text-sm font-semibold">{h.title}</span>
                                <span className="block text-xs text-white/55 mt-0.5">{h.desc}</span>
                            </li>
                        ))}
                    </ul>

                    <p className="mt-auto pt-8 hidden sm:block text-xs text-white/45">
                        Akses diberikan sesuai peran dan unit kerja masing-masing pengguna.
                    </p>
                </div>
            </section>
        </div>
    );
}
