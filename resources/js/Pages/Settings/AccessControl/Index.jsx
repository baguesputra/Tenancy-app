import AppLayout from '@/Layouts/AppLayout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import SlideOver from '@/Components/SlideOver';
import { IconEdit } from '@/Components/Icons';

import initials from '@/utils/initials';
const roleColor = (role) => {
    if (role === 'super_admin' || role === 'admin') return 'red';
    if (role === 'manager') return 'blue';
    if (role?.endsWith('_staff')) return 'green';
    return 'gray';
};

export default function Index({ roles = [], permissions = [], groups = [], authRoles = [], protectedPermissions = [], tenantCategories = [], masterScopes = {} }) {
    const { errors } = usePage().props;
    const [searchText, setSearchText] = useState('');
    const [panelRoleId, setPanelRoleId] = useState(null);
    const [panelTab, setPanelTab] = useState('permissions');
    const [selected, setSelected] = useState([]);
    const [initial, setInitial] = useState([]);
    const [scopeRows, setScopeRows] = useState([]);
    const [scopeInitial, setScopeInitial] = useState([]);
    const [panelSearch, setPanelSearch] = useState('');
    const [collapsed, setCollapsed] = useState({});
    const [saving, setSaving] = useState(false);

    const panelRole = roles.find((r) => r.id === panelRoleId) ?? null;

    const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(searchText.trim().toLowerCase()));

    const roleModules = (role) => {
        const labels = [];
        groups.forEach((g) => {
            if (g.permissions.some((p) => role.permissions.includes(p))) labels.push(g.label);
        });
        return labels;
    };

    const scopeSummary = (role) => {
        const rows = masterScopes[role.id] ?? [];
        const view = rows.filter((r) => r.can_view).length;
        const create = rows.filter((r) => r.can_create).length;
        const edit = rows.filter((r) => r.can_edit).length;
        if (view + create + edit === 0) return null;
        const catName = (r) => {
            const name = r.tenant_category_id ? (tenantCategories.find((c) => String(c.id) === String(r.tenant_category_id))?.name ?? `#${r.tenant_category_id}`) : 'Semua';
            return (r.mode === 'exclude' ? 'kecuali ' : '') + name;
        };
        const detail = rows.filter((r) => r.can_view || r.can_create || r.can_edit).map(catName).join(', ');
        return { view, create, edit, detail };
    };

    const openPanel = (role) => {
        setSelected([...role.permissions]);
        setInitial([...role.permissions]);
        const rows = (masterScopes[role.id] ?? []).map((s) => ({
            tenant_category_id: s.tenant_category_id ?? '',
            mode: s.mode ?? 'include',
            can_view: !!s.can_view,
            view_own_only: !!s.view_own_only,
            can_create: !!s.can_create,
            can_edit: !!s.can_edit,
            edit_own_only: !!s.edit_own_only,
        }));
        if (rows.length === 0) rows.push({ tenant_category_id: '', mode: 'include', can_view: false, view_own_only: false, can_create: false, can_edit: false, edit_own_only: false });
        setScopeRows(rows);
        setScopeInitial(JSON.parse(JSON.stringify(rows)));
        setPanelTab('permissions');
        setPanelSearch('');
        setCollapsed({});
        setPanelRoleId(role.id);
    };

    const closePanel = () => setPanelRoleId(null);

    const isSelfRole = panelRole && authRoles.includes(panelRole.name);
    const isLocked = (perm) => isSelfRole && protectedPermissions.includes(perm) && initial.includes(perm);

    const togglePermission = (perm) => {
        if (isLocked(perm)) return;
        setSelected((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    const toggleGroup = (group) => {
        const rest = group.permissions.filter((p) => !isLocked(p));
        const allSelected = rest.length > 0 && rest.every((p) => selected.includes(p));
        setSelected((prev) => {
            const next = prev.filter((p) => !rest.includes(p));
            return allSelected ? next : [...next, ...rest];
        });
    };

    const dirty = [...selected].sort().join('|') !== [...initial].sort().join('|');
    const scopeDirty = JSON.stringify(scopeRows) !== JSON.stringify(scopeInitial);

    const save = () => {
        if (!panelRole || !dirty) return;
        setSaving(true);
        router.put(`/settings/access-control/${panelRole.id}`, { permissions: selected }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: closePanel,
        });
    };

    const saveScopes = () => {
        if (!panelRole || !scopeDirty) return;
        setSaving(true);
        router.put(`/settings/access-control/${panelRole.id}/scopes`, {
            scopes: scopeRows.map((r) => ({ ...r, tenant_category_id: r.tenant_category_id || null, mode: r.mode || 'include' })),
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: closePanel,
        });
    };

    const updateScopeRow = (idx, field, value) => {
        setScopeRows((prev) => {
            const next = prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
            if ((field === 'tenant_category_id' || field === 'mode') && next[idx].tenant_category_id !== '') {
                const dup = next.findIndex((r, i) => i !== idx && String(r.tenant_category_id) === String(next[idx].tenant_category_id) && (r.mode || 'include') === (next[idx].mode || 'include'));
                if (dup !== -1) next.splice(dup, 1);
            }
            return next;
        });
    };
    const addScopeRow = () => setScopeRows((prev) => [...prev, { tenant_category_id: '', mode: 'include', can_view: false, view_own_only: false, can_create: false, can_edit: false, edit_own_only: false }]);
    const removeScopeRow = (idx) => setScopeRows((prev) => prev.filter((_, i) => i !== idx));

    const q = panelSearch.trim().toLowerCase();
    const visibleGroups = groups
        .map((g) => ({ ...g, permissions: g.permissions.filter((p) => p.toLowerCase().includes(q)) }))
        .filter((g) => g.permissions.length > 0);

    const selectedCount = selected.length;

    const stats = [
        { label: 'Total Role', value: roles.length, dot: 'bg-[#0F1E36]' },
        { label: 'Total Permission', value: permissions.length, dot: 'bg-blue-500' },
        { label: 'Modul', value: groups.length, dot: 'bg-emerald-500' },
    ];

    const columns = [
        { key: 'role', label: 'Role' },
        { key: 'modules', label: 'Cakupan Modul' },
        { key: 'count', label: 'Akses', className: 'text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="mb-5">
                    <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Hak Akses</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Atur permission per role · Super Admin selalu akses penuh · klik baris untuk kelola</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {stats.map((s) => (
                        <div key={s.label} className="text-left bg-white rounded-xl border border-[#E2E5EA] px-4 py-3">
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                                {s.label}
                            </span>
                            <span className="block text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                        </div>
                    ))}
                </div>

                <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <TextInput
                            placeholder="Cari role..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="!pl-9"
                            aria-label="Cari role"
                        />
                    </div>
                </div>

                <DataTable columns={columns}>
                    {filteredRoles.map((role) => {
                        const modules = roleModules(role);
                        const scope = scopeSummary(role);
                        return (
                            <tr
                                key={role.id}
                                onClick={() => openPanel(role)}
                                className={`group cursor-pointer transition-colors ${panelRoleId === role.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                            >
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-10 h-10 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                            {initials(role.name)}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-medium text-gray-900 truncate">
                                                {role.name}
                                                {authRoles.includes(role.name) && <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Role Anda</span>}
                                            </span>
                                            <span className="block text-xs text-gray-400 truncate">{role.users_count ?? 0} user</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    {modules.length > 0 ? (
                                        <span className="flex flex-wrap gap-1.5">
                                            {modules.slice(0, 3).map((m) => (
                                                <Badge key={m} color="gray">{m}</Badge>
                                            ))}
                                            {modules.length > 3 && <span className="text-xs text-gray-400">+{modules.length - 3}</span>}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-300 italic">Tanpa akses</span>
                                    )}
                                    {scope && (
                                        <span className="block text-xs text-gray-400 mt-1.5">
                                            Batasan: {scope.detail} · L{scope.view}/T{scope.create}/U{scope.edit}
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <Badge color={role.permissions.length > 0 ? 'blue' : 'gray'}>{role.permissions.length} akses</Badge>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredRoles.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-5 py-12 text-center text-sm text-gray-400">
                                Tidak ada role yang cocok.
                            </td>
                        </tr>
                    )}
                </DataTable>

                <SlideOver
                    open={!!panelRole}
                    onClose={closePanel}
                    title="Hak Akses"
                    subtitle={panelRole?.name}
                    icon={<IconEdit className="w-4 h-4" />}
                    footer={
                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                            {panelTab === 'permissions' ? (
                                <Button type="button" onClick={save} disabled={!dirty} loading={saving} className="flex-1 justify-center">
                                    Simpan Perubahan{dirty ? ` (${Math.abs(selectedCount - initial.length)} berubah)` : ''}
                                </Button>
                            ) : (
                                <Button type="button" onClick={saveScopes} disabled={!scopeDirty} loading={saving} className="flex-1 justify-center">
                                    Simpan Batasan{scopeDirty ? ' (berubah)' : ''}
                                </Button>
                            )}
                        </div>
                    }
                >
                    {panelRole && (
                        <>
                            <div className="bg-white rounded-xl border border-[#E2E5EA] p-4 mb-3 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <span className="w-20 h-20 rounded-2xl bg-[#0F1E36] text-white text-xl font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                        {initials(panelRole.name)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-base font-semibold text-gray-900 truncate">{panelRole.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{panelRole.users_count ?? 0} user · {selectedCount}/{permissions.length} akses dipilih</p>
                                        <div className="mt-1.5">
                                            <Badge color={roleColor(panelRole.name)}>{panelRole.name}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {errors.permissions && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-3" role="alert">
                                    {errors.permissions}
                                </p>
                            )}

                            {isSelfRole && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 mb-3">
                                    Ini role Anda sendiri — permission kunci tidak bisa dicabut demi keamanan.
                                </p>
                            )}

                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
                                {[['permissions', 'Permission'], ['scopes', 'Batasan Master']].map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setPanelTab(key)}
                                        className={`flex-1 text-xs font-medium rounded-lg px-3 py-2 transition-colors ${panelTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {panelTab === 'scopes' ? (
                                <>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Kosong = tanpa batas (lihat semua). Tenancy: 1 baris “Semua kecuali Open Counter”. Marketing: 1 baris “Hanya Open Counter”. Tanpa baris Lihat = data disembunyikan walau permission ada.
                                    </p>
                                    {scopeRows.map((row, idx) => (
                                        <div key={idx} className="rounded-xl border border-[#E2E5EA] bg-white p-3 mb-2.5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-gray-700">Kategori {idx + 1}</span>
                                                {scopeRows.length > 1 && (
                                                    <button type="button" onClick={() => removeScopeRow(idx)} className="text-xs text-red-500 hover:text-red-700 rounded">Hapus</button>
                                                )}
                                            </div>
                                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-2">
                                                {[['include', 'Hanya ini'], ['exclude', 'Kecuali ini']].map(([key, label]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => updateScopeRow(idx, 'mode', key)}
                                                        className={`flex-1 text-xs font-medium rounded-md px-2 py-1.5 transition-colors ${((row.mode || 'include') === key) ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            <select
                                                value={row.tenant_category_id}
                                                onChange={(e) => updateScopeRow(idx, 'tenant_category_id', e.target.value ? Number(e.target.value) : '')}
                                                className="w-full text-sm border border-[#E2E5EA] rounded-lg px-2.5 py-2 mb-2"
                                            >
                                                {(row.mode || 'include') === 'include' && <option value="">Semua Kategori</option>}
                                                {(row.mode || 'include') === 'exclude' && <option value="">Pilih kategori...</option>}
                                                {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                                    <span className="text-xs font-medium text-gray-700">Lihat</span>
                                                    <Checkbox label="" checked={row.can_view} onChange={() => updateScopeRow(idx, 'can_view', !row.can_view)} aria-label="Boleh lihat" />
                                                </div>
                                                {row.can_view && (
                                                    <div className="flex items-center justify-between rounded-lg px-3 py-2 pl-6">
                                                        <span className="text-xs text-gray-500">Hanya buatan sendiri</span>
                                                        <Checkbox label="" checked={row.view_own_only} onChange={() => updateScopeRow(idx, 'view_own_only', !row.view_own_only)} aria-label="Lihat hanya buatan sendiri" />
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                                    <span className="text-xs font-medium text-gray-700">Tambah</span>
                                                    <Checkbox label="" checked={row.can_create} onChange={() => updateScopeRow(idx, 'can_create', !row.can_create)} aria-label="Boleh tambah" />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                                    <span className="text-xs font-medium text-gray-700">Ubah</span>
                                                    <Checkbox label="" checked={row.can_edit} onChange={() => updateScopeRow(idx, 'can_edit', !row.can_edit)} aria-label="Boleh ubah" />
                                                </div>
                                                {row.can_edit && (
                                                    <div className="flex items-center justify-between rounded-lg px-3 py-2 pl-6">
                                                        <span className="text-xs text-gray-500">Hanya buatan sendiri</span>
                                                        <Checkbox label="" checked={row.edit_own_only} onChange={() => updateScopeRow(idx, 'edit_own_only', !row.edit_own_only)} aria-label="Ubah hanya buatan sendiri" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={addScopeRow} className="text-xs w-full justify-center border-dashed">+ Tambah Kategori</Button>
                                </>
                            ) : (
                            <>
                            <div className="relative mb-3">
                                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <TextInput
                                    placeholder="Cari permission..."
                                    value={panelSearch}
                                    onChange={(e) => setPanelSearch(e.target.value)}
                                    className="!pl-9"
                                    aria-label="Cari permission"
                                />
                            </div>

                            {visibleGroups.map((group) => {
                                const rest = group.permissions.filter((p) => !isLocked(p));
                                const allSelected = rest.length > 0 && rest.every((p) => selected.includes(p));
                                const picked = group.permissions.filter((p) => selected.includes(p)).length;
                                const hasLocked = group.permissions.some((p) => isLocked(p));
                                const expanded = collapsed[group.key] !== true;
                                return (
                                    <FormSection
                                        key={group.key}
                                        variant="drawer"
                                        title={`${group.label} (${picked}/${group.permissions.length})`}
                                        description={hasLocked ? 'Sebagian dikunci — role Anda sendiri' : null}
                                        collapsible
                                        expanded={expanded}
                                        onToggle={() => setCollapsed((prev) => ({ ...prev, [group.key]: expanded }))}
                                    >
                                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 mb-2">
                                            <span className="text-xs font-medium text-gray-700">Pilih semua {group.label}</span>
                                            <Checkbox
                                                label=""
                                                checked={allSelected}
                                                onChange={() => toggleGroup(group)}
                                                aria-label={`Pilih semua ${group.label}`}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            {group.permissions.map((perm) => (
                                                <div key={perm} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${isLocked(perm) ? 'bg-amber-50/60' : 'hover:bg-gray-50'}`}>
                                                    <Checkbox
                                                        label={perm}
                                                        checked={selected.includes(perm)}
                                                        disabled={isLocked(perm)}
                                                        onChange={() => togglePermission(perm)}
                                                    />
                                                    {isLocked(perm) && (
                                                        <span className="text-[10px] font-semibold text-amber-600 shrink-0">DIKUNCI</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </FormSection>
                                );
                            })}
                            {visibleGroups.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-8">Tidak ada permission yang cocok.</p>
                            )}
                            </>
                            )}
                        </>
                    )}
                </SlideOver>
            </div>
        </AppLayout>
    );
}

