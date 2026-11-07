import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';

function today() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return '—';
    return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InternalUsagePanel({ unit, departments = [], canEdit = true }) {
    const [ending, setEnding] = useState(false);
    const history = unit?.assignments_history ?? [];
    const active = history.find((row) => !row.ended_at) ?? null;

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        department_id: '',
        pic_name: '',
        pic_phone: '',
        note: '',
        started_at: today(),
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/units/${unit.id}/assignments`, {
            preserveScroll: true,
            onSuccess: () => {
                reset('pic_name', 'pic_phone', 'note');
                clearErrors();
            },
        });
    };

    const end = () => {
        if (!active) return;
        setEnding(true);
        router.put(`/units/${unit.id}/assignments/${active.id}/end`, {}, {
            preserveScroll: true,
            onFinish: () => setEnding(false),
        });
    };

    return (
        <div className="space-y-3">
            {active ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Pemakaian aktif</p>
                            <p className="mt-1 truncate text-sm font-medium text-slate-900">{active.department ?? 'Tanpa divisi'}</p>
                            <p className="text-xs text-slate-500">
                                {active.pic_name || 'Tanpa PIC'} · mulai {formatDate(active.started_at)}
                            </p>
                            {active.note && <p className="mt-1 text-xs text-slate-500">{active.note}</p>}
                        </div>
                        {canEdit && (
                            <Button type="button" variant="secondary" className="shrink-0 text-xs" onClick={end} loading={ending}>
                                Akhiri
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-2.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <FormField compact label="Divisi / Departemen" error={errors.department_id}>
                            <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                                <option value="">Pilih divisi...</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                        <FormField compact label="Mulai dipakai" error={errors.started_at}>
                            <DateInput value={data.started_at} onChange={(e) => setData('started_at', e.target.value)} />
                        </FormField>
                        <FormField compact label="PIC" error={errors.pic_name}>
                            <TextInput value={data.pic_name} onChange={(e) => setData('pic_name', e.target.value)} placeholder="Nama penanggung jawab" />
                        </FormField>
                        <FormField compact label="Telp PIC" error={errors.pic_phone}>
                            <TextInput value={data.pic_phone} onChange={(e) => setData('pic_phone', e.target.value)} placeholder="08xx" />
                        </FormField>
                    </div>
                    <FormField compact label="Catatan" error={errors.note}>
                        <Textarea value={data.note} onChange={(e) => setData('note', e.target.value)} rows={2} placeholder="Keperluan pemakaian, mis. gudang peralatan" />
                    </FormField>
                    <Button type="submit" loading={processing} className="w-full justify-center text-xs">
                        Catat Pemakaian
                    </Button>
                </form>
            )}

            {history.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Riwayat</p>
                    <ul className="space-y-1.5">
                        {history.map((row) => (
                            <li key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs">
                                <span className="min-w-0 truncate text-slate-700">
                                    {row.department ?? 'Tanpa divisi'}
                                    {row.pic_name ? ` · ${row.pic_name}` : ''}
                                </span>
                                <span className="shrink-0 tabular-nums text-slate-400">
                                    {formatDate(row.started_at)} – {row.ended_at ? formatDate(row.ended_at) : 'sekarang'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
