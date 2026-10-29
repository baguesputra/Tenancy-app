import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';
import EmptyState from '@/Components/EmptyState';
import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/Settings/PageHeader';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

const tabs = [
    { key: 'tenant', label: 'Kategori Tenant', prefix: 'tenant-categories' },
    { key: 'product', label: 'Kategori Produk', prefix: 'product-categories' },
];

export default function Index({ tenantCategories = [], productCategories = [] }) {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const [tab, setTab] = useState(params.get('tab') === 'product' ? 'product' : 'tenant');
    const [search, setSearch] = useState('');
    const [quickName, setQuickName] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const active = tabs.find((t) => t.key === tab);
    const lists = { tenant: tenantCategories, product: productCategories };
    const categories = lists[tab] ?? [];

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({ name: '', description: '' });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
        );
    }, [categories, search]);

    useEffect(() => { setSearch(''); setQuickName(''); }, [tab]);

    const openCreate = () => {
        setEditing(null);
        reset();
        clearErrors();
        setPanelOpen(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setData({ name: cat.name, description: cat.description ?? '' });
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: closePanel };
        editing ? put(`/${active.prefix}/${editing.id}`, options) : post(`/${active.prefix}`, options);
    };

    const quickAdd = (e) => {
        e.preventDefault();
        const name = quickName.trim();
        if (!name) return;
        router.post(`/${active.prefix}`, { name }, { preserveScroll: true, onSuccess: () => setQuickName('') });
    };

    const askDelete = (cat) => setConfirmDelete(cat);

    const confirmDeleteCategory = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/${active.prefix}/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
            },
        });
    };

    const switchTab = (key) => {
        setTab(key);
        window.history.replaceState(null, '', `/categories?tab=${key}`);
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 w-full">
                <PageHeader
                    title="Kategori"
                    description={`${tenantCategories.length} kategori tenant · ${productCategories.length} kategori produk`}
                    actions={
                        <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />}>
                            Tambah {tab === 'tenant' ? 'Kategori Tenant' : 'Kategori Produk'}
                        </Button>
                    }
                />

                <p id="category-tab-label" className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                    Jenis kategori
                </p>
                <div
                    className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[#E2E5EA] bg-gray-50 p-1"
                    role="group"
                    aria-labelledby="category-tab-label"
                >
                    {tabs.map((t) => {
                        const count = t.key === 'tenant' ? tenantCategories.length : productCategories.length;
                        const selected = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => switchTab(t.key)}
                                className={`min-h-[44px] rounded-lg px-4 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                                    selected
                                        ? 'bg-white font-semibold text-[#0F1E36] shadow-sm ring-1 ring-[#E2E5EA]'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t.label}
                                <span className={`ml-1.5 text-xs tabular-nums ${selected ? 'text-[#0F1E36]/60' : 'text-slate-400'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="mb-4 rounded-xl border border-[#E2E5EA] bg-white p-3 sm:p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="search-category" className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                                Cari di tab ini
                            </label>
                            <div className="relative mt-1.5">
                                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <TextInput
                                    id="search-category"
                                    placeholder="Nama atau keterangan…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Cari kategori"
                                    clearable
                                    debounceMs={0}
                                    className="!pl-9"
                                />
                            </div>
                        </div>
                        <form onSubmit={quickAdd} className="min-w-0 flex-1">
                            <label htmlFor="quick-add-name" className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">
                                Tambah cepat
                            </label>
                            <div className="mt-1.5 flex gap-2">
                                <TextInput
                                    id="quick-add-name"
                                    placeholder={`Ketik nama ${tab === 'tenant' ? 'kategori tenant' : 'kategori produk'} lalu Enter…`}
                                    value={quickName}
                                    onChange={(e) => setQuickName(e.target.value)}
                                    aria-label="Nama kategori baru"
                                    className="min-w-0 flex-1"
                                />
                                <Button type="submit" disabled={processing || !quickName.trim()} iconLeft={<IconPlus className="w-4 h-4" />} className="shrink-0">
                                    Tambah
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {filtered.length > 0 && (
                    <p className="mb-2 text-xs text-slate-400 tabular-nums" aria-live="polite">
                        {filtered.length} dari {categories.length} kategori · klik baris untuk edit
                    </p>
                )}
                <div className="hidden sm:block">
                    <DataTable columns={[
                        { key: 'name', label: 'Nama' },
                        { key: 'count', label: 'Pemakaian' },
                        { key: 'actions', label: '', className: 'w-20 text-right' },
                    ]}>
                        {filtered.map((cat) => {
                            const used = cat.tenants_count ?? 0;
                            const templates = cat.checklist_templates_count ?? 0;
                            const locked = used > 0;
                            return (
                            <tr
                                key={cat.id}
                                onClick={() => openEdit(cat)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(cat); } }}
                                tabIndex={0}
                                title="Klik untuk edit"
                                className={`group cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    editing?.id === cat.id ? 'bg-[#0F1E36]/5' : 'hover:bg-slate-50'
                                }`}
                            >
                                <td className="px-5 py-3.5">
                                    <p className="font-medium text-slate-900 line-clamp-1">{cat.name}</p>
                                    {cat.description ? (
                                        <p className="text-xs text-slate-500 mt-0.5 max-w-md line-clamp-2">{cat.description}</p>
                                    ) : (
                                        <p className="text-xs text-slate-400 mt-0.5 italic">Tanpa keterangan</p>
                                    )}
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="inline-flex items-center rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                                            {used} tenant
                                        </span>
                                        {tab === 'product' && templates > 0 && (
                                            <span className="inline-flex items-center rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">{templates} template</span>
                                        )}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); askDelete(cat); }}
                                        aria-label={locked ? `${cat.name} dipakai ${used} tenant, tidak bisa dihapus` : `Hapus ${cat.name}`}
                                        title={locked ? `Dipakai ${used} tenant — hapus diblokir server` : 'Hapus'}
                                        disabled={locked}
                                        className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:text-slate-300 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-5 py-6">
                                    <EmptyState
                                        variant={search ? 'search' : 'empty'}
                                        size="sm"
                                        title={search ? 'Tidak ada kategori yang cocok.' : 'Belum ada kategori di tab ini.'}
                                        description={search ? 'Coba kata kunci lain atau tambah baru di atas.' : `Klik Tambah ${tab === 'tenant' ? 'Kategori Tenant' : 'Kategori Produk'} untuk data pertama.`}
                                        action={search ? (
                                            <Button variant="secondary" onClick={() => setSearch('')} className="!py-2 text-xs">
                                                Reset pencarian
                                            </Button>
                                        ) : (
                                            <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />} className="!py-2 text-xs">
                                                Tambah {tab === 'tenant' ? 'Kategori Tenant' : 'Kategori Produk'}
                                            </Button>
                                        )}
                                    />
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {filtered.map((cat) => {
                        const used = cat.tenants_count ?? 0;
                        const templates = cat.checklist_templates_count ?? 0;
                        return (
                            <div
                                key={cat.id}
                                onClick={() => openEdit(cat)}
                                className="bg-white rounded-xl border border-[#E2E5EA] p-4 active:bg-slate-50 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{cat.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{cat.description || 'Tanpa keterangan'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); askDelete(cat); }}
                                        disabled={used > 0}
                                        aria-label={`Hapus ${cat.name}`}
                                        className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:text-slate-300 shrink-0"
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="inline-flex items-center rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">{used} tenant</span>
                                    {tab === 'product' && templates > 0 && (
                                        <span className="inline-flex items-center rounded-md border border-[#E2E5EA] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">{templates} template</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="bg-white rounded-xl border border-[#E2E5EA] px-5 py-6">
                            <EmptyState
                                variant={search ? 'search' : 'empty'}
                                size="sm"
                                title={search ? 'Tidak ada kategori yang cocok.' : 'Belum ada kategori di tab ini.'}
                                description={search ? 'Coba kata kunci lain atau tambah baru di atas.' : `Klik Tambah ${tab === 'tenant' ? 'Kategori Tenant' : 'Kategori Produk'} untuk data pertama.`}
                                action={search ? (
                                    <Button variant="secondary" onClick={() => setSearch('')} className="!py-2 text-xs">
                                        Reset pencarian
                                    </Button>
                                ) : (
                                    <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />} className="!py-2 text-xs">
                                        Tambah {tab === 'tenant' ? 'Kategori Tenant' : 'Kategori Produk'}
                                    </Button>
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editing ? 'Edit Kategori' : `Tambah ${active.label}`}
                subtitle={editing ? editing.name : 'Lengkapi nama dan keterangan'}
                icon={editing ? <IconEdit className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="category-form" loading={processing} className="flex-1 justify-center">
                            {editing ? 'Simpan Perubahan' : 'Tambah'}
                        </Button>
                    </div>
                }
            >
                <form id="category-form" onSubmit={submit}>
                    <FormSection variant="drawer" title={active.label} description={tab === 'product' ? 'Dipakai tenant dan template checklist' : 'Dipakai mengelompokkan tenant'}>
                        <FormField compact label="Nama Kategori" error={errors.name} required>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="cth. Anchor" />
                        </FormField>
                        <FormField compact label="Keterangan" error={errors.description}>
                            <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} placeholder="Jelaskan maksud kategori ini…" />
                        </FormField>
                        {editing && (
                            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                Dipakai {editing.tenants_count ?? 0} tenant
                                {tab === 'product' ? ` · ${editing.checklist_templates_count ?? 0} template checklist` : ''}.
                                Hapus diblokir server selama masih dipakai.
                            </p>
                        )}
                    </FormSection>
                </form>
            </SlideOver>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteCategory}
                loading={deleting}
                title="Hapus Kategori?"
                confirmLabel="Ya, Hapus"
                confirmVariant="danger"
                note="Kategori terhapus permanen dan tidak bisa dibatalkan. Kategori yang masih dipakai akan ditolak server."
            >
                <ConfirmRow label="Nama" value={confirmDelete?.name} />
                <ConfirmRow label="Dipakai" value={confirmDelete ? `${confirmDelete.tenants_count ?? 0} tenant` : ''} />
            </ConfirmModal>
        </AppLayout>
    );
}
