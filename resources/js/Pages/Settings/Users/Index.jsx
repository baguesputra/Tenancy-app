import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import SlideOver from '@/Components/SlideOver';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import PageHeader from '@/Components/Settings/PageHeader';
import StatTiles from '@/Components/Settings/StatTiles';
import { IconPlus, IconEdit, IconTrash, IconRefresh } from '@/Components/Icons';

import initials from '@/utils/initials';
const randomPassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};
const roleColor = (role) => {
    if (role === 'super_admin' || role === 'admin') return 'red';
    if (role === 'manager') return 'blue';
    if (role?.endsWith('_staff')) return 'green';
    return 'gray';
};

const branchGate = (branches, branchId) => branches.find((b) => String(b.id) === String(branchId))?.gate_id ?? null;
const cocokCabang = (branches, item, branchId) => {
    if (!branchId || !item.company_gate_id) return true;
    const gateId = branchGate(branches, branchId);
    return !!gateId && item.company_gate_id === gateId;
};
const opsiCabang = (branches, list, branchId) => list.filter((item) => cocokCabang(branches, item, branchId));

export default function Index({ users, filters = {}, summary = { total: 0 }, roles = [], departments = [], divisions = [], positions = [], branches = [] }) {
    const { auth } = usePage().props;
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [panel, setPanel] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '', employee_number: '', branch_id: '', department_id: '', division_id: '', position_id: '', role: '', password: '',
    });

    const labelOpsi = (list, item) => {
        if (list.filter((x) => x.name === item.name).length <= 1) return item.name;
        const bedaCabang = list.some((x) => x.company_gate_id && x.company_gate_id !== item.company_gate_id && x.name === item.name);
        const branch = branches.find((b) => b.gate_id === item.company_gate_id);
        if (bedaCabang && branch) return `${item.name} (${branch.name})`;
        const dept = departments.find((d) => d.id === item.department_id);
        return dept && dept.name !== item.name ? `${item.name} (${dept.name})` : item.name;
    };

    const deptOpsiFilter = opsiCabang(branches, departments, filters.branch_id);
    const divOpsiFilter = opsiCabang(branches, divisions, filters.branch_id);
    const posOpsiFilter = opsiCabang(branches, positions, filters.branch_id)
        .filter((p) => !filters.department_id || !p.department_id || String(p.department_id) === String(filters.department_id));

    const deptOpsiForm = opsiCabang(branches, departments, data.branch_id);
    const divOpsiForm = opsiCabang(branches, divisions, data.branch_id)
        .filter((d) => !data.department_id || !d.department_id || String(d.department_id) === String(data.department_id));
    const posOpsiForm = opsiCabang(branches, positions, data.branch_id)
        .filter((p) => !data.department_id || !p.department_id || String(p.department_id) === String(data.department_id))
        .filter((p) => !data.division_id || !p.division_id || String(p.division_id) === String(data.division_id));

    const pilihCabangForm = (value) => {
        const dept = opsiCabang(branches, departments, value).map((d) => String(d.id));
        const div = opsiCabang(branches, divisions, value).map((d) => String(d.id));
        const pos = opsiCabang(branches, positions, value).map((p) => String(p.id));
        setData({
            ...data,
            branch_id: value,
            department_id: dept.includes(String(data.department_id)) ? data.department_id : '',
            division_id: div.includes(String(data.division_id)) ? data.division_id : '',
            position_id: pos.includes(String(data.position_id)) ? data.position_id : '',
        });
    };

    const pilihDepartemenForm = (value) => {
        setData({ ...data, department_id: value, division_id: '', position_id: '' });
    };

    const pilihDivisiForm = (value) => {
        const cocok = opsiCabang(branches, positions, data.branch_id)
            .filter((p) => !value || !p.division_id || String(p.division_id) === String(value))
            .map((p) => String(p.id));
        setData({ ...data, division_id: value, position_id: cocok.includes(String(data.position_id)) ? data.position_id : '' });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) {
                router.get('/settings/users', { ...filters, search: searchText || undefined }, { preserveState: true, preserveScroll: true, replace: true });
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]);

    const updateFilter = (key, value) => {
        router.get('/settings/users', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasFilter = filters.search || filters.role || filters.branch_id || filters.department_id || filters.division_id || filters.position_id;
    const resetFilters = () => {
        setSearchText('');
        router.get('/settings/users', {}, { preserveScroll: true, replace: true });
    };

    const openCreate = () => {
        reset();
        clearErrors();
        setData({ name: '', employee_number: '', branch_id: '', department_id: '', division_id: '', position_id: '', role: '', password: randomPassword() });
        setShowPassword(false);
        setPanel({ type: 'create', user: null });
    };

    const openEdit = (user) => {
        reset();
        clearErrors();
        setData({
            name: user.name,
            employee_number: user.employee_number,
            branch_id: user.branch_id,
            department_id: user.department_id ?? '',
            division_id: user.division_id ?? '',
            position_id: user.position_id ?? '',
            role: user.roles[0]?.name ?? '',
            password: '',
        });
        setShowPassword(false);
        setPanel({ type: 'edit', user });
    };

    const closePanel = () => setPanel(null);

    const isSelf = (user) => String(user?.id) === String(auth.user?.id);

    const submit = (e) => {
        e.preventDefault();
        if (!panel) return;
        const options = { preserveScroll: true, onSuccess: closePanel };
        panel.type === 'create' ? post('/settings/users', options) : put(`/settings/users/${panel.user.id}`, options);
    };

    const askDelete = (user) => setConfirmDelete(user);

    const confirmDeleteUser = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/settings/users/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
                if (panel?.user?.id === confirmDelete.id) closePanel();
            },
        });
    };

    const stats = [
        { key: 'total', label: 'Total User', value: summary.total ?? users.total },
        { key: 'roles', label: 'Role Tersedia', value: roles.length },
        { key: 'branches', label: 'Cabang', value: branches.length },
    ];

    const columns = [
        { key: 'user', label: 'User' },
        { key: 'role', label: 'Role' },
        { key: 'org', label: 'Organisasi' },
        { key: 'company', label: 'Perusahaan' },
        { key: 'branch', label: 'Cabang', className: 'text-right' },
    ];

    return (
        <SettingsLayout>
            <div>
                <PageHeader
                    title="Manajemen User"
                    description={`${users.total} user terdaftar · klik baris untuk kelola`}
                    actions={<Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />}>Tambah User</Button>}
                />

                <StatTiles items={stats} />

                <div className="sticky top-16 z-10 mb-4 rounded-xl border border-[#E2E5EA] bg-white/95 p-3 shadow-sm backdrop-blur">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="relative min-w-0 sm:col-span-2 lg:col-span-3">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <TextInput
                                placeholder="Cari nama atau NIP..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari nama atau NIP user"
                            />
                        </div>
                        <SelectInput value={filters.role ?? ''} onChange={(e) => updateFilter('role', e.target.value)} aria-label="Filter role">
                            <option value="">Semua Role</option>
                            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </SelectInput>
                        <SelectInput value={filters.branch_id ?? ''} onChange={(e) => updateFilter('branch_id', e.target.value)} aria-label="Filter cabang">
                            <option value="">Semua Cabang</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.company_name ?? b.name}</option>)}
                        </SelectInput>
                        <SelectInput value={filters.department_id ?? ''} onChange={(e) => updateFilter('department_id', e.target.value)} aria-label="Filter departemen">
                            <option value="">Semua Departemen</option>
                            {deptOpsiFilter.map((d) => <option key={d.id} value={d.id}>{labelOpsi(departments, d)}</option>)}
                        </SelectInput>
                        <SelectInput value={filters.division_id ?? ''} onChange={(e) => updateFilter('division_id', e.target.value)} aria-label="Filter divisi">
                            <option value="">Semua Divisi</option>
                            {divOpsiFilter.map((d) => <option key={d.id} value={d.id}>{labelOpsi(divisions, d)}</option>)}
                        </SelectInput>
                        <SelectInput value={filters.position_id ?? ''} onChange={(e) => updateFilter('position_id', e.target.value)} aria-label="Filter jabatan">
                            <option value="">Semua Jabatan</option>
                            {posOpsiFilter.map((p) => <option key={p.id} value={p.id}>{labelOpsi(positions, p)}</option>)}
                        </SelectInput>
                        {hasFilter && (
                            <button onClick={resetFilters} className="justify-self-start rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                Reset
                            </button>
                        )}
                    </div>
                </div>
                <p aria-live="polite" className="sr-only">{users.total} user ditemukan</p>

                <div className="hidden sm:block">
                <DataTable columns={columns} footer={<Pagination meta={users} links={users.links} />}>
                    {users.data.map((user) => (
                        <tr
                            key={user.id}
                            onClick={() => openEdit(user)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(user); }
                            }}
                            tabIndex={0}
                            className={`group cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36] ${panel?.user?.id === user.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                        >
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {user.photo_url ? (
                                        <img src={user.photo_url} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0" loading="lazy" />
                                    ) : (
                                        <span className="w-10 h-10 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(user.name)}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block font-medium text-gray-900 truncate">
                                            {user.name}
                                            {isSelf(user) && <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Anda</span>}
                                        </span>
                                        <span className="block text-xs text-gray-400 truncate font-mono">{user.employee_number}</span>
                                    </span>
                                </div>
                            </td>
                            <td className="px-5 py-3.5">
                                <Badge color={roleColor(user.roles[0]?.name)}>{user.roles[0]?.name ?? '—'}</Badge>
                            </td>
                            <td className="px-5 py-3.5">
                                <span className="block text-sm text-gray-700">{user.department?.name ?? '—'}</span>
                                <span className="block text-xs text-gray-400">{[user.division?.name, user.position?.name].filter(Boolean).join(' · ') || '—'}</span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-500">{user.branch?.company_name ?? '—'}</td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-500 whitespace-nowrap">{user.branch?.name ?? '—'}</td>
                        </tr>
                    ))}
                    {users.data.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-5 py-12 text-center">
                                <p className="text-sm font-medium text-gray-700">Belum ada user ditemukan.</p>
                                <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah User untuk data pertama.'}</p>
                                {hasFilter && (
                                    <button onClick={resetFilters} className="mt-3 text-sm text-[#0F1E36] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded">
                                        Reset filter
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {users.data.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => openEdit(user)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(user); }
                            }}
                            tabIndex={0}
                            className="cursor-pointer rounded-xl border border-[#E2E5EA] bg-white p-4 active:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {user.photo_url ? (
                                    <img src={user.photo_url} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0" loading="lazy" />
                                ) : (
                                    <span className="w-10 h-10 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                        {initials(user.name)}
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {user.name}
                                        {isSelf(user) && <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Anda</span>}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate font-mono">{user.employee_number}</p>
                                </div>
                                <Badge color={roleColor(user.roles[0]?.name)} size="sm">{user.roles[0]?.name ?? '—'}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 truncate">
                                {[user.branch?.company_name, user.department?.name, user.division?.name, user.position?.name].filter(Boolean).join(' · ') || '—'} · {user.branch?.name ?? '—'}
                            </p>
                        </div>
                    ))}
                    {users.data.length === 0 && (
                        <div className="rounded-xl border border-[#E2E5EA] bg-white px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">Belum ada user ditemukan.</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah User untuk data pertama.'}</p>
                            {hasFilter ? (
                                <button onClick={resetFilters} className="text-sm text-[#0F1E36] font-medium hover:underline rounded">Reset filter</button>
                            ) : (
                                <Button onClick={openCreate} className="justify-center !py-3 min-h-[48px]">Tambah User</Button>
                            )}
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-[#E2E5EA]">
                        <Pagination meta={users} links={users.links} />
                    </div>
                </div>

                <SlideOver
                    open={!!panel}
                    onClose={closePanel}
                    title={panel?.type === 'create' ? 'Tambah User' : 'Edit User'}
                    subtitle={panel?.type === 'create' ? 'Lengkapi identitas dan hak akses' : panel?.user.name}
                    icon={panel?.type === 'create' ? <IconPlus className="w-4 h-4" /> : <IconEdit className="w-4 h-4" />}
                    footer={
                        <div className="flex gap-2">
                            {panel?.type === 'edit' && !isSelf(panel.user) && (
                                <Button type="button" variant="danger" onClick={() => askDelete(panel.user)} className="shrink-0" aria-label={`Hapus ${panel.user.name}`}>
                                    <IconTrash className="w-4 h-4" />
                                </Button>
                            )}
                            <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                            <Button type="submit" form="user-form" loading={processing} className="flex-1 justify-center">
                                {panel?.type === 'create' ? 'Tambah User' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    }
                >
                    <form id="user-form" onSubmit={submit}>
                        {panel?.type === 'edit' && panel.user?.gate_id && (
                            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mb-3">
                                User dari Gate — identitas & organisasi ikut sync, hanya role yang bisa diubah.
                            </p>
                        )}
                        <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-3 shadow-sm">
                            <div className="flex items-center gap-4">
                                {(panel?.user?.photo_url) ? (
                                    <img src={panel.user.photo_url} alt={panel?.user?.name ?? 'Foto user'} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                                ) : (
                                    <span className="w-20 h-20 rounded-2xl bg-[#0F1E36] text-white text-xl font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                        {initials(data.name || panel?.user?.name || '?')}
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-gray-900 truncate">{data.name?.trim() || panel?.user?.name || 'User baru'}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate font-mono">{data.employee_number || 'NIP belum diisi'}</p>
                                    <div className="mt-1.5">
                                        {data.role ? <Badge color={roleColor(data.role)}>{data.role}</Badge> : <Badge color="gray">Role belum dipilih</Badge>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {panel?.type === 'edit' && panel.user?.gate_id && (
                            <>
                                <FormSection variant="drawer" title="Identitas" description="Tersinkron dari Gate">
                                    <dl className="space-y-2 text-sm">
                                        <ConfirmRow label="Nama" value={panel.user.name} />
                                        <ConfirmRow label="NIP" value={panel.user.employee_number} />
                                        <ConfirmRow label="Email" value={panel.user.email} />
                                        <ConfirmRow label="Status" value={<Badge color="green">Aktif</Badge>} />
                                    </dl>
                                </FormSection>
                                <FormSection variant="drawer" title="Penempatan">
                                    <dl className="space-y-2 text-sm">
                                        <ConfirmRow label="Perusahaan" value={panel.user.branch?.company_name} />
                                        <ConfirmRow label="Cabang" value={panel.user.branch?.name} />
                                        <ConfirmRow label="Departemen" value={panel.user.department?.name} />
                                        <ConfirmRow label="Divisi" value={panel.user.division?.name} />
                                        <ConfirmRow label="Jabatan" value={panel.user.position?.name} />
                                    </dl>
                                </FormSection>
                            </>
                        )}

                        {!(panel?.type === 'edit' && panel.user?.gate_id) && (
                        <>
                        <FormSection variant="drawer" title="Identitas" description="Nama tampil dan nomor induk pegawai">
                            <FormField compact label="Nama" error={errors.name} required>
                                <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Nama lengkap" autoComplete="off" />
                            </FormField>
                            <FormField compact label="Employee Number" error={errors.employee_number} required>
                                <TextInput value={data.employee_number} onChange={(e) => setData('employee_number', e.target.value)} placeholder="TOP-000000" autoComplete="off" />
                            </FormField>
                        </FormSection>

                        <FormSection variant="drawer" title="Penempatan & Hak Akses" description="Cabang, departemen, dan role">
                            <FormField compact label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => pilihCabangForm(e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.company_name ?? b.name}</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField compact label="Departemen" error={errors.department_id} hint="Kosongkan jika tidak relevan (misal manager)">
                                <SelectInput value={data.department_id} onChange={(e) => pilihDepartemenForm(e.target.value)}>
                                    <option value="">Tidak ada</option>
                                    {deptOpsiForm.map((d) => <option key={d.id} value={d.id}>{labelOpsi(departments, d)}</option>)}
                                </SelectInput>
                            </FormField>
                            <div className="grid grid-cols-2 gap-2.5">
                                <FormField compact label="Divisi" error={errors.division_id}>
                                    <SelectInput value={data.division_id} onChange={(e) => pilihDivisiForm(e.target.value)}>
                                        <option value="">Tidak ada</option>
                                        {divOpsiForm.map((d) => <option key={d.id} value={d.id}>{labelOpsi(divisions, d)}</option>)}
                                    </SelectInput>
                                </FormField>
                                <FormField compact label="Jabatan" error={errors.position_id}>
                                    <SelectInput value={data.position_id} onChange={(e) => setData('position_id', e.target.value)}>
                                        <option value="">Tidak ada</option>
                                        {posOpsiForm.map((p) => <option key={p.id} value={p.id}>{labelOpsi(positions, p)}</option>)}
                                    </SelectInput>
                                </FormField>
                            </div>
                            <FormField compact label="Role" error={errors.role} required>
                                <SelectInput value={data.role} onChange={(e) => setData('role', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                </SelectInput>
                            </FormField>
                        </FormSection>
                        </>
                        )}

                        {panel?.type === 'edit' && panel.user?.gate_id && (
                            <FormSection variant="drawer" title="Hak Akses" description="Hanya role yang bisa diubah">
                                <FormField compact label="Role" error={errors.role} required>
                                    <SelectInput value={data.role} onChange={(e) => setData('role', e.target.value)}>
                                        <option value="">Pilih...</option>
                                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </SelectInput>
                                </FormField>
                            </FormSection>
                        )}

                        {!(panel?.type === 'edit' && panel.user?.gate_id) && (
                        <FormSection variant="drawer" title="Password" description={panel?.type === 'create' ? 'Minimal 8 karakter' : 'Kosongkan jika tidak ingin ganti'}>
                            <FormField
                                compact
                                label={panel?.type === 'create' ? 'Password' : 'Password Baru'}
                                error={errors.password}
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
                        )}

                        {panel?.type === 'edit' && isSelf(panel.user) && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                                Ini akun Anda sendiri — hapus diri dinonaktifkan demi keamanan.
                            </p>
                        )}
                    </form>
                </SlideOver>

                <ConfirmModal
                    open={!!confirmDelete}
                    onClose={() => setConfirmDelete(null)}
                    onConfirm={confirmDeleteUser}
                    loading={deleting}
                    title="Hapus User?"
                    confirmLabel="Ya, Hapus"
                    confirmVariant="danger"
                    note="User terhapus permanen dan tidak bisa login lagi. Tindakan ini tidak bisa dibatalkan."
                >
                    <ConfirmRow label="Nama" value={confirmDelete?.name} />
                    <ConfirmRow label="NIP" value={confirmDelete?.employee_number} />
                    <ConfirmRow label="Role" value={confirmDelete?.roles?.[0]?.name} />
                </ConfirmModal>
            </div>
        </SettingsLayout>
    );
}

