import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import TextInput from '@/Components/Form/TextInput';
import Toggle from '@/Components/Form/Toggle';
import Badge from '@/Components/Badge';
import PageHeader from '@/Components/Settings/PageHeader';

export default function Index({ setting = {}, dayLabels = {}, summary = null }) {
    const form = useForm({
        enabled: setting?.enabled ?? true,
        windows: setting?.windows ?? {},
    });

    const setWindow = (day, field, value) => {
        form.setData('windows', {
            ...form.data.windows,
            [day]: { ...form.data.windows[day], [field]: value },
        });
    };

    const submit = (e) => {
        e.preventDefault();
        form.put('/settings/permit-scan', { preserveScroll: true });
    };

    return (
        <SettingsLayout>
            <div>
                <PageHeader
                    title="Jam Akses QR"
                    description="Batas jam scan QR surat izin kerja & keluar-masuk barang"
                    meta={<Badge color={form.data.enabled ? 'green' : 'gray'}>{form.data.enabled ? 'Pembatasan aktif' : 'Tanpa pembatasan'}</Badge>}
                />

                <form onSubmit={submit} className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                    <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                        <Toggle
                            label="Batasi akses QR sesuai jam di bawah"
                            description="Di luar jadwal, halaman scan menampilkan pesan QR tidak aktif."
                            checked={!!form.data.enabled}
                            onChange={(next) => form.setData('enabled', next)}
                        />
                        {summary && (
                            <p className="mt-3 inline-flex rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-600 ring-1 ring-inset ring-[#E2E5EA]">
                                {summary}
                            </p>
                        )}
                    </div>

                    <div className="hidden grid-cols-[8rem_4rem_1fr_1fr] items-center gap-4 border-b border-gray-100 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 sm:grid sm:px-5">
                        <span>Hari</span>
                        <span>Aktif</span>
                        <span>Buka</span>
                        <span>Tutup</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {Object.entries(dayLabels).map(([day, label]) => {
                            const window = form.data.windows?.[day] ?? { open: '22:10', close: '08:50', enabled: true };
                            const active = form.data.enabled && window.enabled;

                            return (
                                <div key={day} className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[8rem_4rem_1fr_1fr] sm:gap-4 sm:px-5">
                                    <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                                    <span className="flex items-center gap-2">
                                        <Toggle
                                            checked={!!window.enabled}
                                            disabled={!form.data.enabled}
                                            onChange={(next) => setWindow(day, 'enabled', next)}
                                            ariaLabel={`Aktifkan akses QR hari ${label}`}
                                        />
                                        <span className="text-xs text-gray-500 sm:hidden">Aktif</span>
                                    </span>
                                    <label className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="w-10 shrink-0 sm:hidden">Buka</span>
                                        <TextInput
                                            type="time"
                                            value={window.open ?? ''}
                                            onChange={(e) => setWindow(day, 'open', e.target.value)}
                                            disabled={!active}
                                            className="w-32"
                                            aria-label={`Jam buka ${label}`}
                                        />
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="w-10 shrink-0 sm:hidden">Tutup</span>
                                        <TextInput
                                            type="time"
                                            value={window.close ?? ''}
                                            onChange={(e) => setWindow(day, 'close', e.target.value)}
                                            disabled={!active}
                                            className="w-32"
                                            aria-label={`Jam tutup ${label}`}
                                        />
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <p className="text-[11px] text-gray-400">
                            Jam tutup pagi berlaku untuk sesi yang dibuka malam sebelumnya. Hari tanpa centang = akses QR tutup seharian.
                        </p>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </div>

                    <p aria-live="polite" className="px-4 pb-3 text-xs text-red-600 sm:px-5">
                        {form.recentlySuccessful ? 'Tersimpan.' : Object.values(form.errors)[0] ?? ''}
                    </p>
                </form>
            </div>
        </SettingsLayout>
    );
}