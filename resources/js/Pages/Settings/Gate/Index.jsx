import AppLayout from '@/Layouts/AppLayout';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import { IconRefresh } from '@/Components/Icons';
import { formatDateID } from '@/utils/format';

function StatusGate({ status }) {
    if (!status?.adaToken) return <Badge color="red">Token belum diisi</Badge>;
    return status.terhubung ? <Badge color="green">Terhubung</Badge> : <Badge color="yellow">Tidak terjangkau</Badge>;
}

function ringkas(log) {
    if (log.kind === 'master') return `${log.count_departemen} dept · ${log.count_divisi} divisi · ${log.count_jabatan} jabatan`;
    if (log.kind === 'karyawan') return `${log.count_baru} baru · ${log.count_diperbarui} update · ${log.count_gagal} gagal`;
    return `${log.count_baru} baru · ${log.count_diperbarui} update · ${log.count_departemen} dept`;
}

export default function Index({ gateStatus, summary = {}, companies = [], branches = [], history = [] }) {
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const canSync = isSuperAdmin || permissions.includes('gate.sync');

    const form = useForm({ company_id: '', limit: '', dry_run: false });

    const kirim = (dry) => {
        form.setData('dry_run', dry);
        form.post('/settings/gate/sync', { preserveScroll: true });
    };

    const stats = [
        { label: 'User dari Gate', value: `${summary.usersGate ?? 0}/${summary.users ?? 0}` },
        { label: 'Dept · Divisi · Jabatan', value: `${summary.departments ?? 0} · ${summary.divisions ?? 0} · ${summary.positions ?? 0}` },
        { label: 'Cabang tertaut', value: `${branches.filter((b) => b.gate_id).length}/${branches.length}` },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-5xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Sinkronisasi Gate</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Master + karyawan Gate jadi user (role staff)</p>
                    </div>
                    <StatusGate status={gateStatus} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {stats.map((s) => (
                        <div key={s.label} className="text-left bg-white rounded-xl border border-[#E2E5EA] px-4 py-3">
                            <span className="block text-xs text-gray-500">{s.label}</span>
                            <span className="block text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-4">
                    <div className="flex flex-col lg:flex-row gap-2">
                        <SelectInput value={form.data.company_id} onChange={(e) => form.setData('company_id', e.target.value)} className="lg:w-64" aria-label="Perusahaan Gate">
                            <option value="">Semua Perusahaan</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                        <TextInput value={form.data.limit} onChange={(e) => form.setData('limit', e.target.value)} placeholder="Limit (opsional)" className="lg:w-40" aria-label="Batas jumlah" />
                        <div className="flex gap-2">
                            <Button onClick={() => kirim(false)} disabled={!canSync || form.processing} iconLeft={<IconRefresh className="w-4 h-4" />}>
                                {form.processing ? 'Menyinkron…' : 'Sinkron Sekarang'}
                            </Button>
                            <Button variant="secondary" onClick={() => kirim(true)} disabled={!canSync || form.processing}>
                                Pratinjau
                            </Button>
                        </div>
                    </div>
                    {form.errors.gate && <p className="text-xs text-red-600 mt-2">{form.errors.gate}</p>}
                    {!canSync && <p className="text-xs text-amber-600 mt-2">Butuh permission gate.sync untuk sinkron.</p>}
                </div>

                <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Perusahaan ↔ Cabang</h2>
                    <div className="mt-2 space-y-1.5">
                        {companies.map((c) => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50/70 px-3 py-2">
                                <p className="text-xs text-gray-700 truncate">{c.name} <span className="text-gray-400 font-mono">({c.code ?? '—'})</span></p>
                                {c.branch ? <Badge color="green" size="sm">{c.branch}</Badge> : <Badge color="yellow" size="sm">belum tertaut</Badge>}
                            </div>
                        ))}
                        {companies.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{gateStatus?.terhubung ? 'Tidak ada data.' : 'Gate tidak terjangkau — cek token.'}</p>}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E5EA] divide-y divide-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 px-4 pt-4 pb-2">Riwayat Sinkron{history.length ? ` (${history.length})` : ''}</h2>
                    {history.length === 0 && <p className="px-4 py-8 text-center text-xs text-gray-400">Belum ada riwayat sinkron.</p>}
                    {history.map((h) => (
                        <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 capitalize">
                                    {h.kind === 'semua' ? 'Master + Karyawan' : h.kind}{h.is_dry_run ? ' · pratinjau' : ''}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{ringkas(h)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{h.user?.name ?? '—'} · {h.created_at ? formatDateID(h.created_at) : '—'}</p>
                            </div>
                            <Badge color={h.count_gagal > 0 ? 'yellow' : 'green'} size="sm">{h.count_gagal > 0 ? `${h.count_gagal} gagal` : 'OK'}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
