import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm } from '@inertiajs/react';
import useCan from '@/hooks/useCan';
import { useState } from 'react';
import SelectInput from '@/Components/Form/SelectInput';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Form/Button';
import Checkbox from '@/Components/Form/Checkbox';
import Badge from '@/Components/Badge';
import PageHeader from '@/Components/Settings/PageHeader';
import StatTiles from '@/Components/Settings/StatTiles';
import { IconRefresh } from '@/Components/Icons';
import { formatDateID } from '@/utils/format';

function StatusGate({ status }) {
    if (!status?.adaToken) return <Badge color="red">Token belum diisi</Badge>;
    return status.terhubung ? <Badge color="green">Terhubung</Badge> : <Badge color="yellow">Tidak terjangkau</Badge>;
}

function ringkas(log) {
    if (log.kind === 'master') return `${log.count_departemen} dept · ${log.count_divisi} divisi · ${log.count_jabatan} jabatan`;
    if (log.kind === 'karyawan') return `${log.count_baru} baru · ${log.count_diperbarui} update · ${log.count_gagal} gagal${log.count_nonaktif ? ` · ${log.count_nonaktif} nonaktif` : ''}`;
    return `${log.count_baru} baru · ${log.count_diperbarui} update · ${log.count_departemen} dept${log.count_nonaktif ? ` · ${log.count_nonaktif} nonaktif` : ''}`;
}

function sumber(log) {
    if (log.source === 'jadwal') return ' · otomatis';
    if (log.source === 'login') return ' · login';
    return '';
}

export default function Index({ gateStatus, summary = {}, companies = [], branches = [], history = [], setting = {} }) {
    const { can } = useCan();
    const canSync = can('gate.sync');

    const form = useForm({ company_id: '', limit: '', dry_run: false });
    const jadwal = useForm({
        schedule_enabled: setting?.schedule_enabled ?? true,
        karyawan_interval_minutes: setting?.karyawan_interval_minutes ?? 15,
        master_daily_at: (setting?.master_daily_at ?? '02:00').slice(0, 5),
        jit_enabled: setting?.jit_enabled ?? true,
        grace_miss_count: setting?.grace_miss_count ?? 2,
    });

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
        <SettingsLayout>
            <div>
                <PageHeader
                    title="Sinkronisasi Gate"
                    description="Master + karyawan Gate jadi user (role staff)"
                    actions={<StatusGate status={gateStatus} />}
                />

                <StatTiles items={stats} />

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 space-y-1">
                        <FormSection variant="drawer" title="Sinkron Manual" description="Tarik master terbaru dari Gate saat ini juga">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
                                <SelectInput value={form.data.company_id} onChange={(e) => form.setData('company_id', e.target.value)} aria-label="Perusahaan Gate">
                                    <option value="">Semua Perusahaan</option>
                                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                                <TextInput value={form.data.limit} onChange={(e) => form.setData('limit', e.target.value)} placeholder="Limit" aria-label="Batas jumlah" />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button onClick={() => kirim(false)} disabled={!canSync || form.processing} iconLeft={<IconRefresh className="w-4 h-4" />}>
                                    {form.processing ? 'Menyinkron…' : 'Sinkron Sekarang'}
                                </Button>
                                <Button variant="secondary" onClick={() => kirim(true)} disabled={!canSync || form.processing}>
                                    Pratinjau
                                </Button>
                            </div>
                            {form.errors.gate && <p className="mt-2 text-xs text-red-600">{form.errors.gate}</p>}
                            {!canSync && <p className="mt-2 text-xs text-amber-600">Butuh permission gate.sync untuk sinkron.</p>}
                        </FormSection>

                        <FormSection
                            variant="drawer"
                            title="Jadwal Otomatis"
                            action={<Badge color={jadwal.data.schedule_enabled ? 'green' : 'yellow'} size="sm">{jadwal.data.schedule_enabled ? 'Aktif' : 'Mati'}</Badge>}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <label className="block">
                                    <span className="block text-xs text-gray-500 mb-1">Karyawan tiap (mnt)</span>
                                    <TextInput type="number" min="5" max="1440" value={jadwal.data.karyawan_interval_minutes} onChange={(e) => jadwal.setData('karyawan_interval_minutes', e.target.value)} disabled={!canSync} aria-label="Interval karyawan" />
                                </label>
                                <label className="block">
                                    <span className="block text-xs text-gray-500 mb-1">Master jam</span>
                                    <TextInput type="time" value={jadwal.data.master_daily_at} onChange={(e) => jadwal.setData('master_daily_at', e.target.value)} disabled={!canSync} aria-label="Jam master" />
                                </label>
                                <label className="block">
                                    <span className="block text-xs text-gray-500 mb-1">Grace hilang (x)</span>
                                    <TextInput type="number" min="1" max="10" value={jadwal.data.grace_miss_count} onChange={(e) => jadwal.setData('grace_miss_count', e.target.value)} disabled={!canSync} aria-label="Grace resign" />
                                </label>
                                <div className="flex flex-col gap-1.5 justify-end">
                                    <Checkbox
                                        label="Jadwal"
                                        checked={!!jadwal.data.schedule_enabled}
                                        onChange={(e) => jadwal.setData('schedule_enabled', e.target.checked)}
                                        disabled={!canSync}
                                    />
                                    <Checkbox
                                        label="Sync saat login"
                                        checked={!!jadwal.data.jit_enabled}
                                        onChange={(e) => jadwal.setData('jit_enabled', e.target.checked)}
                                        disabled={!canSync}
                                    />
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <Button variant="secondary" onClick={() => jadwal.post('/settings/gate/jadwal', { preserveScroll: true })} disabled={!canSync || jadwal.processing}>
                                    {jadwal.processing ? 'Menyimpan…' : 'Simpan Jadwal'}
                                </Button>
                                {jadwal.errors.karyawan_interval_minutes && <p className="text-xs text-red-600">{jadwal.errors.karyawan_interval_minutes}</p>}
                                {jadwal.errors.master_daily_at && <p className="text-xs text-red-600">{jadwal.errors.master_daily_at}</p>}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">Jalan otomatis dari traffic web (tanpa cron). Sepi traffic = jadwal mundur sampai ada kunjungan.</p>
                        </FormSection>

                        <FormSection variant="drawer" title="Perusahaan ↔ Cabang">
                            <div className="space-y-1.5">
                                {companies.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50/70 px-3 py-2">
                                        <p className="min-w-0 text-xs text-gray-700 truncate">{c.name} <span className="text-gray-400 font-mono">({c.code ?? '—'})</span></p>
                                        <Badge color={c.branch ? 'green' : 'yellow'} size="sm">{c.branch ?? 'belum tertaut'}</Badge>
                                    </div>
                                ))}
                                {companies.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{gateStatus?.terhubung ? 'Tidak ada data.' : 'Gate tidak terjangkau — cek token.'}</p>}
                            </div>
                        </FormSection>
                    </div>

                    <div className="min-w-0 lg:sticky lg:top-[72px]">
                        <FormSection variant="drawer" title={`Riwayat Sinkron${history.length ? ` (${history.length})` : ''}`}>
                            {history.length === 0 && <p className="py-6 text-center text-xs text-gray-400">Belum ada riwayat sinkron.</p>}
                            {history.length > 0 && (
                                <div className="-mx-4 -mb-4 divide-y divide-gray-100">
                                    {history.map((h) => (
                                        <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 capitalize">
                                                    {h.kind === 'semua' ? 'Master + Karyawan' : h.kind}{h.is_dry_run ? ' · pratinjau' : ''}{sumber(h)}
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500 tabular-nums">{ringkas(h)}{h.scope ? ` · ${h.scope}` : ''}</p>
                                                <p className="mt-0.5 text-[11px] text-gray-400">{h.user?.name ?? '—'} · {h.created_at ? formatDateID(h.created_at) : '—'}</p>
                                            </div>
                                            <Badge color={h.count_gagal > 0 ? 'yellow' : 'green'} size="sm">{h.count_gagal > 0 ? `${h.count_gagal} gagal` : 'OK'}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </FormSection>
                    </div>
                </div>
            </div>
        </SettingsLayout>
    );
}
