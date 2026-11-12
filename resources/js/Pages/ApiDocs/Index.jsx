import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { IconChevronLeft } from '@/Components/Icons';

const BASE = '/api/v1';

const GROUPS = [
    {
        id: 'autentikasi', title: 'Autentikasi',
        note: 'Login untuk mendapatkan token; gunakan logout untuk mencabut token yang sedang dipakai.',
        endpoints: [
            {
                method: 'POST', path: '/auth/login',
                body: '{ "email": "nama@perusahaan.id", "password": "…", "device_name": "hp-sidak" }',
                returns: '{ "token": "1|…", "user": { "id": 1, "name": "…", "email": "…" } }',
            },
            {
                method: 'POST', path: '/auth/logout', auth: true,
                note: 'Mencabut token yang sedang dipakai.',
                returns: '{ "message": "Token dicabut." }',
            },
        ],
    },
    {
        id: 'sidak', title: 'Sidak',
        note: 'Butuh izin sidak.manage untuk sesi dan sidak.answer untuk checklist. Akses dibatasi untuk pemilik sesi atau pengguna yang dapat melihat semua cabang.',
        endpoints: [
            { method: 'GET', path: '/inspection-sessions/current', auth: true, returns: '{ "session": { … } atau null }' },
            {
                method: 'POST', path: '/inspection-sessions', auth: true,
                body: '{ "participant_ids": [2], "notes": null }',
                returns: '{ "session": { "id", "status": "in_progress", "participants": [], "inspections": [] } }',
            },
            { method: 'GET', path: '/inspection-sessions/{id}', auth: true, returns: 'Sesi beserta daftar tenant yang sudah ditambahkan.' },
            {
                method: 'POST', path: '/inspection-sessions/{id}/scan', auth: true,
                body: '{ "token": "kode-dari-qr" }',
                note: 'Token adalah bagian setelah /scan/ pada QR unit. Unit kosong atau tenant yang sedang disidak orang lain ditolak.',
                returns: '{ "inspection": { "id", "status": "draft", "tenant": { "id", "name" } } }',
            },
            {
                method: 'POST', path: '/inspection-sessions/{id}/tenants', auth: true,
                body: '{ "tenant_id": "…" }',
                note: 'Jalan alternatif bila QR tidak bisa dipindai.',
            },
            { method: 'GET', path: '/inspections/{id}', auth: true, returns: 'Checklist lengkap. Tiap item membawa answer bila sudah diisi.' },
            {
                method: 'POST', path: '/inspections/{id}/answers', auth: true,
                body: 'multipart: checklist_item_id, value, note, photo (opsional, maks 5 MB, 3 foto per item)',
                returns: '{ "answer": { "id", "value", "note", "photos": [{ "id", "url" }] } }',
            },
            { method: 'DELETE', path: '/inspection-photos/{id}', auth: true },
            {
                method: 'POST', path: '/inspections/{id}/extra-photos', auth: true,
                body: 'multipart: photo (wajib), description',
            },
            { method: 'DELETE', path: '/inspection-extra-photos/{id}', auth: true },
            { method: 'PATCH', path: '/inspections/{id}/notes', auth: true, body: '{ "notes": "…", "other_notes": "…" }' },
            {
                method: 'POST', path: '/inspections/{id}/complete', auth: true,
                note: 'Menutup checklist tenant ini. Jawaban negatif yang wajib difoto tetapi belum ada foto membuat is_flagged benar.',
                returns: '{ "inspection": { "id", "status": "completed", "is_flagged", "completed_at" } }',
            },
            {
                method: 'POST', path: '/inspection-sessions/{id}/complete', auth: true,
                note: 'Menutup seluruh sesi. Setelah ini tidak ada yang bisa diubah.',
            },
        ],
    },
    {
        id: 'security', title: 'Cek fisik security',
        note: 'Butuh izin permits.inspect dan user harus dari departemen Security. Hanya izin yang tahap security-nya masih menunggu.',
        endpoints: [
            { method: 'GET', path: '/security/permits', auth: true, returns: 'Antrean izin di cabang user yang menunggu cek fisik.' },
            {
                method: 'GET', path: '/security/permits/{id}', auth: true,
                returns: 'Pekerja, barang, dan foto KTP. worker_count adalah jumlah foto KTP minimum bila tidak ada daftar nama.',
            },
            { method: 'POST', path: '/security/workers/{id}/toggle', auth: true, note: 'Membalik status hadir pekerja.' },
            { method: 'POST', path: '/security/workers/{id}/note', auth: true, body: '{ "mismatch_note": "nama tidak cocok" }' },
            {
                method: 'POST', path: '/security/goods/{id}/verify', auth: true,
                body: 'multipart: photo (wajib saat pertama), mismatch_note',
                note: 'Foto pertama terkunci dan tidak bisa diganti. Berikutnya hanya catatan yang bisa diubah.',
            },
            { method: 'POST', path: '/security/permits/{id}/ktp', auth: true, body: 'multipart: photo (wajib), mismatch_note' },
            { method: 'DELETE', path: '/security/ktp-photos/{id}', auth: true },
            {
                method: 'POST', path: '/security/permits/{id}/complete', auth: true,
                note: 'Ditolak bila foto KTP kurang dari jumlah pekerja atau masih ada barang yang belum dicek. Catatan ketidaksesuaian menandai izin, bukan menolaknya.',
                returns: '{ "permit": { "id", "status", "is_flagged" }, "message": "…" }',
            },
        ],
    },
];

const ERRORS = [
    ['401', 'Token tidak ada atau sudah dicabut.'],
    ['403', 'Bukan pemilik sesi, bukan departemen Security, atau belum giliran cek fisik.'],
    ['422', 'Data kurang atau aturan tidak terpenuhi. Kesalahan validasi menyertakan message dan errors; kesalahan lainnya dapat hanya menyertakan message.'],
];

function Method({ method }) {
    const tone = {
        GET: 'text-blue-800 bg-blue-100',
        POST: 'text-emerald-800 bg-emerald-100',
        PATCH: 'text-amber-900 bg-amber-100',
        DELETE: 'text-red-800 bg-red-100',
    }[method];

    return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{method}</span>;
}

const SECTIONS = [['mulai', 'Mulai'], ...GROUPS.map((group) => [group.id, group.title]), ['kesalahan', 'Kesalahan']];
const FLOWS = {
    sidak: ['Buka sesi', 'Pindai QR unit', 'Isi checklist', 'Tutup sesi'],
    security: ['Ambil antrean', 'Periksa pekerja dan barang', 'Selesaikan pemeriksaan'],
};

function Endpoint({ endpoint }) {
    const [copyStatus, setCopyStatus] = useState('');

    async function copyPath() {
        try {
            await navigator.clipboard.writeText(`${BASE}${endpoint.path}`);
            setCopyStatus('Tersalin');
        } catch {
            setCopyStatus('Tidak dapat menyalin');
        }
    }

    return (
        <article className="space-y-3 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
                <Method method={endpoint.method} />
                <code className="min-w-0 break-all text-[13px] font-medium text-[#0F1E36]">{endpoint.path}</code>
                <button type="button" onClick={copyPath} aria-label={`Salin path ${endpoint.method} ${endpoint.path}`} className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Salin</button>
                <span role="status" className="text-xs text-slate-600">{copyStatus}</span>
            </div>
            {endpoint.note && <p className="text-sm leading-6 text-slate-600">{endpoint.note}</p>}
            {[["Kirim", endpoint.body], ["Balasan", endpoint.returns]].map(([label, value]) => value && (
                <div key={label}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-[#0F1E36] px-4 py-3 text-xs leading-6 text-slate-100"><code>{value}</code></pre>
                </div>
            ))}
        </article>
    );
}

export default function Index() {
    const [active, setActive] = useState('mulai');

    useEffect(() => {
        const update = () => {
            const current = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean)
                .filter((section) => section.getBoundingClientRect().top <= 120).pop();
            setActive(current?.id ?? 'mulai');
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);

    return (
        <div className="min-h-screen bg-[#F6F8FB] text-[#182334]">
            <Head title="Dokumentasi API" />
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-12">
                <nav aria-label="Navigasi dokumentasi" className="mb-8 rounded-xl bg-[#0F1E36] p-4 text-white shadow-lg shadow-slate-900/10 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
                    <div className="px-3 pb-6 pt-2">
                        <p className="text-base font-semibold tracking-tight text-white">Dokumentasi API</p>
                        <Link href="/dashboard" aria-label="Kembali ke aplikasi" title="Kembali ke aplikasi" className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/25 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><IconChevronLeft className="h-4 w-4" aria-hidden="true" /></Link>
                    </div>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Daftar isi</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
                        {SECTIONS.map(([id, label]) => (
                            <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active === id ? 'bg-white text-[#0F1E36]' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>{label}</a>
                        ))}
                    </div>
                </nav>
                <main className="min-w-0 max-w-4xl">
                <section id="mulai" className="scroll-mt-28">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Panduan integrasi · v1</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F1E36]">Mulai menggunakan API</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Referensi untuk aplikasi sidak di HP dan pemeriksaan fisik surat izin oleh security.</p>
                <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[["Base URL", BASE], ["Autentikasi", 'Authorization: Bearer {token}'], ["Format", 'JSON · Foto: multipart/form-data']].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-200 bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</dt><dd className="mt-2 break-words font-mono text-xs text-[#0F1E36]">{value}</dd></div>
                    ))}
                </dl>
                <p className="mt-4 text-sm leading-6 text-slate-600">Kirim juga header <code>Accept: application/json</code> pada setiap permintaan.</p>
                </section>

                {GROUPS.map((group) => (
                    <section id={group.id} key={group.id} className="mt-12 scroll-mt-28">
                        <h2 className="text-xl font-semibold text-[#0F1E36]">{group.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{group.note}</p>
                        {FLOWS[group.id] && <ol className="mt-4 flex flex-wrap gap-2">{FLOWS[group.id].map((step, index) => <li key={step} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">{index + 1}. {step}</li>)}</ol>}
                        <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                            {group.endpoints.map((ep) => (
                                <Endpoint key={`${ep.method} ${ep.path}`} endpoint={ep} />
                            ))}
                        </div>
                    </section>
                ))}

                <section id="kesalahan" className="mt-12 scroll-mt-28">
                    <h2 className="text-xl font-semibold text-[#0F1E36]">Kesalahan</h2>
                    <dl className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {ERRORS.map(([code, text]) => (
                            <div key={code} className="flex gap-3 px-4 py-3 text-sm">
                                <dt className="font-semibold text-gray-900">{code}</dt>
                                <dd className="text-gray-600">{text}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
                </main>
            </div>
        </div>
    );
}
