import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import DateInput from '@/Components/Form/DateInput';
import TimeInput from '@/Components/Form/TimeInput';
import Textarea from '@/Components/Form/Textarea';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';
import Button from '@/Components/Form/Button';

const FIELD_LABEL = { work_start_date: 'Tgl mulai', work_end_date: 'Tgl selesai', work_end_time: 'Jam selesai', access_route: 'Akses' };

export function RevisionTimeline({ revisions = [] }) {
    if (!revisions.length) return null;
    return (
        <div className="space-y-3">
            {revisions.map((r) => (
                <div key={r.id} className="rounded-xl border border-[#E2E5EA] bg-white p-3.5">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-900">Revisi #{r.revision_no}</p>
                        <p className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-gray-700">
                        {Object.entries(r.changes ?? {}).map(([f, c]) => (
                            <li key={f}>
                                <span className="font-medium">{FIELD_LABEL[f] ?? f}:</span>{' '}
                                <span className="line-through text-gray-400">{c.old ?? '—'}</span>
                                {' → '}
                                <span className="font-semibold text-gray-900">{c.new ?? '—'}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2">“{r.reason}”</p>
                </div>
            ))}
        </div>
    );
}

export default function ReviseModal({ open, onClose, permit, postUrl }) {
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({ work_start_date: '', work_end_date: '', work_end_time: '', access_route: '', reason: '' });

    useEffect(() => {
        if (open && permit) {
            setForm({
                work_start_date: (permit.work_start_date ?? '').slice(0, 10),
                work_end_date: (permit.work_end_date ?? '').slice(0, 10),
                work_end_time: (permit.work_end_time ?? '').slice(0, 5),
                access_route: permit.access_route ?? '',
                reason: '',
            });
        }
    }, [open, permit]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !permit) return null;

    const submit = (e) => {
        e.preventDefault();
        setSending(true);
        router.post(postUrl, form, {
            preserveScroll: true,
            onFinish: () => setSending(false),
            onSuccess: () => onClose?.(),
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ajukan revisi">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <form onSubmit={submit} className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Ajukan Revisi</p>
                        <p className="text-xs text-gray-500 font-mono">{permit.permit_number}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Revisi mengulang approval Marketing/Keuangan/BS/Security. Tenancy tetap.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField compact label="Tgl mulai" required>
                            <DateInput value={form.work_start_date} onChange={(e) => setForm({ ...form, work_start_date: e.target.value })} />
                        </FormField>
                        <FormField compact label="Tgl selesai" required>
                            <DateInput value={form.work_end_date} onChange={(e) => setForm({ ...form, work_end_date: e.target.value })} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <FormField compact label="Jam selesai">
                            <TimeInput value={form.work_end_time} onChange={(e) => setForm({ ...form, work_end_time: e.target.value })} />
                        </FormField>
                        <FormField compact label="Akses masuk/keluar">
                            <TextInput value={form.access_route} onChange={(e) => setForm({ ...form, access_route: e.target.value })} placeholder="cth. Loading dock barat" />
                        </FormField>
                    </div>
                    <FormField compact label="Alasan revisi" required hint="Min. 10 karakter, tampil ke BS & Security.">
                        <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="cth. Bongkar panggung mundur karena hujan, tambah 1 hari." />
                    </FormField>
                </div>
                <div className="flex gap-2 p-5 pt-0">
                    <Button type="button" variant="secondary" onClick={onClose} className="shrink-0">Batal</Button>
                    <Button type="submit" loading={sending} className="flex-1 justify-center">Kirim Revisi</Button>
                </div>
            </form>
        </div>,
        document.body
    );
}
