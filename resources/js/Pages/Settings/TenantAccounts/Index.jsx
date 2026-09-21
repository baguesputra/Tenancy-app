import AppLayout from '@/Layouts/AppLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import SelectInput from '@/Components/Form/SelectInput';
import TextInput from '@/Components/Form/TextInput';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SlideOver from '@/Components/SlideOver';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { IconPlus, IconEdit, IconRefresh } from '@/Components/Icons';

const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const randomPassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

export default function Index({ tenants, filters, withoutAccountCount, withAccountCount = 0 }) {
    const { flash } = usePage().props;
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [panel, setPanel] = useState(null);
    const [confirmToggle, setConfirmToggle] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [result, setResult] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ username: '', password: '' });

    useEffect(() => {
        if (flash?.credential) {
            setResult(flash.credential);
            setCopied(false);
        }
    }, [flash?.credential]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) {
                router.get('/settings/tenant-accounts', { ...filters, search: searchText || undefined }, { preserveState: true, preserveScroll: true, replace: true });
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const updateStatus = (status) => {
        router.get('/settings/tenant-accounts', { ...filters, status: status || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openCreate = (tenant) => {
        reset();
        clearErrors();
        setData({ username: '', password: randomPassword() });
        setShowPassword(false);
        setPanel({ type: 'create', tenant });
    };

    const openEdit = (tenant) => {
        reset();
        clearErrors();
        setData({ username: tenant.tenant_user?.username ?? '', password: '' });
        setShowPassword(false);
        setPanel({ type: 'edit', tenant });
    };

    const openPanel = (tenant) => {
        if (tenant.tenant_user) openEdit(tenant);
        else openCreate(tenant);
    };

    const closePanel = () => setPanel(null);

    const askToggle = (tenant) => setConfirmToggle(tenant);

    const confirmToggleActive = () => {
        if (!confirmToggle) return;
        setToggling(true);
        router.post(`/settings/tenant-accounts/${confirmToggle.id}/toggle-active`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setToggling(false);
                setConfirmToggle(null);
                if (panel?.tenant.id === confirmToggle.id) closePanel();
            },
        });
    };

    const submit = (e) => {
        e.preventDefault();
        if (!panel) return;
        const url = panel.type === 'create'
            ? `/settings/tenant-accounts/${panel.tenant.id}`
            : `/settings/tenant-accounts/${panel.tenant.id}/reset-password`;
        post(url, { preserveScroll: true, onSuccess: closePanel });
    };

    const bulkCreate = () => {
        if (confirm(`Buat akun untuk semua ${withoutAccountCount} tenant yang belum punya akun? Password dibuat acak dan tampil sekali.`)) {
            router.post('/settings/tenant-accounts/bulk-create', {}, { preserveScroll: true });
        }
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    const singleText = result && result.mode !== 'bulk'
        ? `${result.username} / ${result.password}`
        : '';

    const stats = [
        { key: '', label: 'Total Tenant', value: tenants.total, dot: 'bg-[#0F1E36]', active: !filters.status },
        { key: 'with_account', label: 'Punya Akun', value: withAccountCount, dot: 'bg-emerald-500', active: filters.status === 'with_account' },
        { key: 'without_account', label: 'Belum Punya Akun', value: withoutAccountCount, dot: 'bg-amber-500', active: filters.status === 'without_account' },
    ];

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'username', label: 'Username Portal' },
        { key: 'status', label: 'Status', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Akun Portal Tenant</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{tenants.total} tenant terdaftar · {withAccountCount} punya akun · klik baris untuk kelola</p>
                    </div>
                    {withoutAccountCount > 0 && (
                        <Button onClick={bulkCreate} iconLeft={<IconPlus className="w-4 h-4" />}>
                            Buat {withoutAccountCount} Akun Sekaligus
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {stats.map((s) => (
                        <button
                            key={s.label}
                            onClick={() => updateStatus(s.key)}
                            aria-pressed={s.active}
                            className={`text-left bg-white rounded-xl border px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${s.active ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300 hover:shadow-sm'}`}
                        >
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                                {s.label}
                            </span>
                            <span className="block text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                        </button>
                    ))}
                </div>

                {result && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 mb-4" role="status">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-emerald-800">
                                    {result.mode === 'created' && `Akun ${result.tenant_name} dibuat`}
                                    {result.mode === 'updated' && `Akun ${result.tenant_name} diperbarui`}
                                    {result.mode === 'bulk' && `${result.accounts.length} akun berhasil dibuat`}
                                </p>
                                <p className="text-xs text-emerald-700 mt-0.5">Catat sekarang — kredensial hanya tampil sekali dan tidak bisa dilihat lagi.</p>
                            </div>
                            <button onClick={() => setResult(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium shrink-0" aria-label="Tutup panel kredensial">
                                Tutup
                            </button>
                        </div>
                        {result.mode !== 'bulk' ? (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <code className="bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-sm font-mono text-gray-900">{result.username} / {result.password}</code>
                                <Button variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => copyText(singleText)}>
                                    {copied ? 'Tersalin' : 'Salin'}
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-2.5 bg-white border border-emerald-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">
                                {result.accounts.map((a) => (
                                    <div key={a.username} className="flex items-center justify-between gap-2 px-3 py-2">
                                        <span className="text-xs text-gray-500 truncate">{a.tenant_name}</span>
                                        <code className="text-xs font-mono text-gray-900 shrink-0">{a.username} / {a.password}</code>
                                    </div>
                                ))}
                            </div>
                        )}
                        {result.mode === 'bulk' && (
                            <Button
                                variant="secondary"
                                className="!px-3 !py-1.5 !text-xs mt-2.5"
                                onClick={() => copyText(result.accounts.map((a) => `${a.tenant_name}: ${a.username} / ${a.password}`).join('\n'))}
                            >
                                {copied ? 'Semua tersalin' : 'Salin semua'}
                            </Button>
                        )}
                    </div>
                )}

                <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <TextInput
                                placeholder="Cari nama tenant..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari nama tenant"
                            />
                        </div>
                        <SelectInput
                            value={filters.status ?? ''}
                            onChange={(e) => updateStatus(e.target.value)}
                            className="sm:w-56"
                            aria-label="Filter status akun"
                        >
                            <option value="">Semua Tenant</option>
                            <option value="with_account">Sudah Punya Akun</option>
                            <option value="without_account">Belum Punya Akun</option>
                        </SelectInput>
                    </div>
                </div>

                <DataTable columns={columns} footer={<Pagination meta={tenants} links={tenants.links} />}>
                    {tenants.data.map((tenant) => (
                        <tr
                            key={tenant.id}
                            onClick={() => openPanel(tenant)}
                            className={`group cursor-pointer transition-colors ${panel?.tenant.id === tenant.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                        >
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {tenant.logo_url ? (
                                        <img src={tenant.logo_url} alt={`Foto ${tenant.name}`} className="w-10 h-10 rounded-full object-cover bg-gray-50 border border-[#E2E5EA] shrink-0" loading="lazy" />
                                    ) : (
                                        <span className="w-10 h-10 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(tenant.name)}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block font-medium text-gray-900 truncate">{tenant.name}</span>
                                        <span className="block text-xs text-gray-400 truncate">{tenant.branch?.name ?? 'Tanpa cabang'}</span>
                                    </span>
                                </div>
                            </td>
                            <td className="px-5 py-3.5">
                                {tenant.tenant_user?.username
                                    ? <code className="text-sm font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">{tenant.tenant_user.username}</code>
                                    : <span className="text-sm text-gray-300 italic">Belum ada — klik untuk buat</span>}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                {tenant.tenant_user ? (
                                    <Badge color={tenant.tenant_user.is_active ? 'green' : 'gray'}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${tenant.tenant_user.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} aria-hidden="true" />
                                        {tenant.tenant_user.is_active ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                ) : (
                                    <Badge color="yellow">Belum Ada Akun</Badge>
                                )}
                            </td>
                        </tr>
                    ))}
                    {tenants.data.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-5 py-12 text-center text-sm text-gray-400">
                                Tidak ada tenant yang cocok.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <SlideOver
                    open={!!panel}
                    onClose={closePanel}
                    title={panel?.type === 'create' ? 'Buat Akun Portal' : 'Edit Kredensial'}
                    subtitle={panel?.tenant.name}
                    icon={panel?.type === 'create' ? <IconPlus className="w-4 h-4" /> : <IconEdit className="w-4 h-4" />}
                    footer={
                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                            <Button type="submit" form="tenant-account-form" loading={processing} className="flex-1 justify-center">
                                {panel?.type === 'create' ? 'Buat Akun' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    }
                >
                    <form id="tenant-account-form" onSubmit={submit}>
                        <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-3 shadow-sm">
                            <div className="flex items-center gap-4">
                                {panel?.tenant.logo_url ? (
                                    <img src={panel.tenant.logo_url} alt={`Foto ${panel.tenant.name}`} className="w-20 h-20 rounded-2xl object-cover bg-gray-50 border border-[#E2E5EA] shrink-0" />
                                ) : (
                                    <span className="w-20 h-20 rounded-2xl bg-[#0F1E36] text-white text-xl font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                        {initials(panel?.tenant.name)}
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-gray-900 truncate">{panel?.tenant.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{panel?.tenant.branch?.name ?? 'Tanpa cabang'}</p>
                                    <div className="mt-1.5">
                                        {panel?.tenant.tenant_user ? (
                                            <Badge color={panel.tenant.tenant_user.is_active ? 'green' : 'gray'}>
                                                {panel.tenant.tenant_user.is_active ? 'Akun aktif' : 'Akun nonaktif'}
                                            </Badge>
                                        ) : (
                                            <Badge color="yellow">Belum ada akun</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <FormSection variant="drawer" title="Kredensial Portal" description="Username unik, password minimal 8 karakter">
                            <FormField compact label="Username" error={errors.username} required hint="Huruf, angka, strip, underscore. Kosongkan untuk otomatis dari nama tenant.">
                                <TextInput value={data.username} onChange={(e) => setData('username', e.target.value)} placeholder={panel?.type === 'edit' ? panel?.tenant.tenant_user?.username : 'cth: tokobunga'} autoComplete="off" />
                            </FormField>
                            <FormField
                                compact
                                label={panel?.type === 'create' ? 'Password' : 'Password Baru'}
                                error={errors.password}
                                hint={panel?.type === 'create' ? 'Minimal 8 karakter. Kosongkan untuk password acak.' : 'Minimal 8 karakter. Kosongkan jika tidak ingin ganti password.'}
                                required={panel?.type === 'create'}
                            >
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <TextInput
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            className="!pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-700"
                                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                        >
                                            {showPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <Button type="button" variant="secondary" className="!px-3" onClick={() => setData('password', randomPassword())} aria-label="Generate password acak">
                                        <IconRefresh className="w-4 h-4" />
                                    </Button>
                                </div>
                            </FormField>
                        </FormSection>

                        {panel?.type === 'edit' && (
                            <FormSection variant="drawer" title="Status Akun" description="Nonaktif blokir login portal tanpa hapus kredensial">
                                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                                    <span className="text-xs font-medium text-gray-700">
                                        {panel.tenant.tenant_user?.is_active ? 'Akun aktif' : 'Akun nonaktif'}
                                    </span>
                                    <Button type="button" variant={panel.tenant.tenant_user?.is_active ? 'danger' : 'secondary'} className="!py-1.5 !text-xs" onClick={() => askToggle(panel.tenant)}>
                                        {panel.tenant.tenant_user?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </Button>
                                </div>
                            </FormSection>
                        )}
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={!!confirmToggle}
                    onClose={() => setConfirmToggle(null)}
                    onConfirm={confirmToggleActive}
                    loading={toggling}
                    title={confirmToggle?.tenant_user?.is_active ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}
                    confirmLabel={confirmToggle?.tenant_user?.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
                    confirmVariant={confirmToggle?.tenant_user?.is_active ? 'danger' : 'success'}
                    note={confirmToggle?.tenant_user?.is_active
                        ? 'Tenant tidak bisa login portal sampai akun diaktifkan lagi. Kredensial tetap tersimpan.'
                        : 'Tenant bisa login portal lagi dengan kredensial yang tersimpan.'}
                >
                    <ConfirmRow label="Tenant" value={confirmToggle?.name} />
                    <ConfirmRow label="Username" value={confirmToggle?.tenant_user?.username} />
                </ConfirmModal>
            </div>
        </AppLayout>
    );
}
