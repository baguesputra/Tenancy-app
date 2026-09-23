import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState, useEffect, Fragment } from 'react';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { formatDateID } from '@/utils/format';

const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const statusColor = { draft: 'gray', completed: 'green' };
const statusLabel = { draft: 'Draft', completed: 'Selesai' };
const permitColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const permitLabel = { pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak' };
const tabs = [
    { key: 'units', label: 'Unit & Kontrak' },
    { key: 'sidak', label: 'Sidak' },
    { key: 'permits', label: 'Izin' },
    { key: 'contact', label: 'Kontak' },
];

export default function Index({ tenants, filters = {}, productCategories = [] }) {
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeTab, setActiveTab] = useState('units');
    const [expandedSidakId, setExpandedSidakId] = useState(null);
    const [sidakCache, setSidakCache] = useState({});
    const [sidakLoading, setSidakLoading] = useState(false);

    const updateFilter = (key, value) => {
        router.get('/tenant-profiles', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!selectedId) { setDetail(null); return; }
        setLoadingDetail(true);
        fetch(`/tenant-profiles/${selectedId}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => setDetail(d))
            .catch(() => setDetail(null))
            .finally(() => setLoadingDetail(false));
    }, [selectedId]);

    const hasFilter = filters.search || filters.product_category_id || filters.status;
    const resetFilters = () => {
        setSearchText('');
        router.get('/tenant-profiles', {}, { preserveScroll: true, replace: true });
    };

    const scrollToDetail = (id) => {
        requestAnimationFrame(() => {
            document.getElementById(`profile-detail-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    };

    const pick = (id) => {
        if (selectedId === id) {
            setSelectedId(null);
            setExpandedSidakId(null);
            return;
        }
        setSelectedId(id);
        setActiveTab('units');
        setExpandedSidakId(null);
        scrollToDetail(id);
    };

    const toggleSidak = (inspectionId) => {
        if (expandedSidakId === inspectionId) {
            setExpandedSidakId(null);
            return;
        }
        setExpandedSidakId(inspectionId);
        if (sidakCache[inspectionId] || !selectedId) return;
        setSidakLoading(true);
        fetch(`/tenant-profiles/${selectedId}/inspections/${inspectionId}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => setSidakCache((prev) => ({ ...prev, [inspectionId]: d })))
            .catch(() => setSidakCache((prev) => ({ ...prev, [inspectionId]: null })))
            .finally(() => setSidakLoading(false));
    };

    const tenant = detail?.tenant ?? tenants.data.find((t) => t.id === selectedId) ?? null;
    const inspections = detail?.inspections ?? [];
    const tenancies = tenant?.tenancies ?? [];
    const permits = tenant?.permit_requests ?? tenant?.permitRequests ?? [];
    const activeTenancy = tenant?.active_tenancy ?? tenant?.activeTenancy ?? tenancies.find((t) => t.status === 'active');

    const detailProps = { tenant, activeTenancy, inspections, tenancies, permits, loading: loadingDetail, activeTab, setActiveTab, expandedSidakId, toggleSidak, sidakCache, sidakLoading };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto">
                <div className="mb-5">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Profile Tenant</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Cari tenant, klik barisnya — detail mengembang halus di bawahnya</p>
                </div>

                <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="flex flex-col lg:flex-row gap-2">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            <TextInput
                                placeholder="Cari nama / telepon / unit…"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari tenant"
                            />
                        </div>
                        <SelectInput
                            value={filters.product_category_id ?? ''}
                            onChange={(e) => updateFilter('product_category_id', e.target.value)}
                            className="lg:w-52"
                            aria-label="Filter kategori produk"
                        >
                            <option value="">Semua Kategori</option>
                            {productCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                        <SelectInput
                            value={filters.status ?? ''}
                            onChange={(e) => updateFilter('status', e.target.value)}
                            className="lg:w-40"
                            aria-label="Filter status"
                        >
                            <option value="">Aktif + Nonaktif</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </SelectInput>
                        {hasFilter && (
                            <button onClick={resetFilters} className="px-3 py-2 min-h-[40px] text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0">
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block">
                    <DataTable
                        columns={[
                            { key: 'name', label: 'Tenant' },
                            { key: 'unit', label: 'Unit Aktif' },
                            { key: 'stats', label: 'Sidak · Izin' },
                            { key: 'status', label: 'Status', className: 'text-right' },
                        ]}
                        footer={<Pagination meta={tenants} links={tenants.links} />}
                    >
                        {tenants.data.map((t) => {
                            const open = selectedId === t.id;
                            return (
                                <Fragment key={t.id}>
                                    <tr
                                        onClick={() => pick(t.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t.id); } }}
                                        tabIndex={0}
                                        aria-expanded={open}
                                        className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${open ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'}`}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {t.logo_url ? (
                                                    <img src={t.logo_url} alt={`Logo ${t.name}`} className="w-9 h-9 rounded-full object-contain bg-gray-50 border border-[#E2E5EA] p-0.5 shrink-0" loading="lazy" />
                                                ) : (
                                                    <span className="w-9 h-9 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{initials(t.name)}</span>
                                                )}
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-2">
                                                        <span className="block font-medium text-gray-900 truncate">{t.name}</span>
                                                        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </span>
                                                    <span className="block text-xs text-gray-400 truncate">{t.product_category?.name ?? t.productCategory?.name ?? '—'}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap font-mono">{t.active_tenancy?.unit?.unit_code ?? t.activeTenancy?.unit?.unit_code ?? '—'}</td>
                                        <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap tabular-nums">
                                            {t.inspections_completed_count ?? 0} sidak · {t.permits_pending_count ?? 0} antre
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-3 bg-blue-50/40">
                                                <div id={`profile-detail-${t.id}`} className="scroll-mt-24">
                                                    <DetailCard {...detailProps} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                        {tenants.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center">
                                    <p className="text-sm font-medium text-gray-700">Belum ada tenant ditemukan.</p>
                                    <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Belum ada data tenant.'}</p>
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {tenants.data.map((t) => {
                        const open = selectedId === t.id;
                        return (
                            <div key={t.id}>
                                <div
                                    onClick={() => pick(t.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t.id); } }}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={open}
                                    className={`bg-white rounded-2xl border p-4 shadow-sm active:bg-gray-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${open ? 'border-[#0F1E36] ring-1 ring-[#0F1E36] rounded-b-none border-b-0' : 'border-[#E2E5EA]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {t.logo_url ? (
                                            <img src={t.logo_url} alt={`Logo ${t.name}`} className="w-10 h-10 rounded-full object-contain bg-gray-50 border border-[#E2E5EA] p-0.5 shrink-0" loading="lazy" />
                                        ) : (
                                            <span className="w-10 h-10 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{initials(t.name)}</span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                                            <p className="text-xs text-gray-500 truncate font-mono">{t.active_tenancy?.unit?.unit_code ?? t.activeTenancy?.unit?.unit_code ?? 'Tanpa unit aktif'}</p>
                                        </div>
                                        <Badge color={t.is_active ? 'green' : 'gray'} size="sm">{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                                        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {open && (
                                    <div id={`profile-detail-${t.id}`} className="scroll-mt-24 bg-white rounded-2xl rounded-t-none border border-t-0 border-[#0F1E36] ring-1 ring-[#0F1E36] p-3 shadow-sm">
                                        <DetailCard {...detailProps} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {tenants.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">Belum ada tenant ditemukan.</p>
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-[#E2E5EA]">
                        <Pagination meta={tenants} links={tenants.links} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function DetailCard({ tenant, activeTenancy, inspections, tenancies, permits, loading, activeTab, setActiveTab, expandedSidakId, toggleSidak, sidakCache, sidakLoading }) {
    if (!tenant) {
        return (
            <div className="bg-white rounded-2xl border border-[#E2E5EA] p-8 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-700">Memuat detail…</p>
            </div>
        );
    }

    const unitCode = activeTenancy?.unit?.unit_code ?? activeTenancy?.unit_code ?? '—';
    const completedSidak = inspections.filter((i) => i.status === 'completed').length;
    const pendingPermits = permits.filter((p) => p.status === 'pending').length;

    return (
        <div className="space-y-4">
            <div className="bg-[#0F1E36] text-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3.5">
                    {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={`Logo ${tenant.name}`} className="w-14 h-14 rounded-2xl bg-white object-contain p-1 shrink-0" />
                    ) : (
                        <span className="w-14 h-14 rounded-2xl bg-white/10 text-white text-lg font-bold flex items-center justify-center shrink-0" aria-hidden="true">{initials(tenant.name)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold tracking-tight truncate">{tenant.name}</h2>
                        <p className="text-xs text-white/60 truncate mt-0.5 font-mono">{unitCode}</p>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge color={tenant.is_active ? 'green' : 'gray'} variant="soft" size="sm">{tenant.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    {(tenant.product_category?.name ?? tenant.productCategory?.name) && (
                        <Badge color="blue" variant="soft" size="sm">{tenant.product_category?.name ?? tenant.productCategory?.name}</Badge>
                    )}
                    {(tenant.branch?.name) && (
                        <Badge color="gray" variant="soft" size="sm">{tenant.branch.name}</Badge>
                    )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">Kontrak</dt>
                        <dd className="text-lg font-bold tabular-nums">{tenancies.length}</dd>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">Sidak OK</dt>
                        <dd className="text-lg font-bold tabular-nums">{completedSidak}</dd>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wide text-white/50">Izin Antre</dt>
                        <dd className="text-lg font-bold tabular-nums">{pendingPermits}</dd>
                    </div>
                </dl>
                <Link
                    href={`/tenants?search=${encodeURIComponent(tenant.name)}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors rounded focus-visible:outline-2 focus-visible:outline-white"
                >
                    Edit di Master Tenant →
                </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm overflow-hidden">
                <div className="flex gap-1 overflow-x-auto p-2" role="tablist" aria-label="Detail tenant">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={activeTab === t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`shrink-0 px-3 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${activeTab === t.key ? 'bg-[#0F1E36] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="px-4 pb-4 space-y-3">
                    {loading && <p className="text-xs text-gray-400 text-center py-6">Memuat detail…</p>}
                    {!loading && activeTab === 'units' && (
                        <div className="space-y-2">
                            {tenancies.length === 0 && <Empty text="Belum ada kontrak." />}
                            {tenancies.map((c) => (
                                <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900 font-mono">{c.unit?.unit_code ?? '—'}</p>
                                        <Badge color={statusColor[c.status] ?? 'gray'} size="sm">{c.status === 'active' ? 'Aktif' : c.status}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{c.start_date ? formatDateID(c.start_date) : '—'} s/d {c.end_date ? formatDateID(c.end_date) : 'sekarang'}</p>
                                    {c.contract_number && <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.contract_number}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && activeTab === 'sidak' && (
                        <div className="space-y-2">
                            {inspections.length === 0 && <Empty text="Belum pernah disidak." />}
                            {inspections.map((i) => {
                                const open = expandedSidakId === i.id;
                                const cached = sidakCache[i.id];
                                return (
                                    <div key={i.id} className={`rounded-xl border bg-gray-50/60 transition-colors ${open ? 'border-[#0F1E36]/30' : 'border-gray-100'}`}>
                                        <button
                                            onClick={() => toggleSidak(i.id)}
                                            aria-expanded={open}
                                            className="w-full text-left px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded-xl"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-gray-900 truncate">{i.template_name}</p>
                                                <span className="flex items-center gap-1.5 shrink-0">
                                                    <Badge color={i.session_status === 'in_progress' ? 'yellow' : statusColor[i.status] ?? 'gray'} size="sm">
                                                        {i.session_status === 'in_progress' ? 'Penyidakan' : statusLabel[i.status] ?? i.status}
                                                    </Badge>
                                                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {i.session_started_at ? formatDateID(i.session_started_at) : '—'} · {i.answered}/{i.total} terjawab
                                                {i.is_flagged ? ' · ⚠ Perlu perhatian' : ''}
                                            </p>
                                        </button>
                                        {open && (
                                            <div className="px-3.5 pb-3.5">
                                                {sidakLoading && !cached && <p className="text-xs text-gray-400 text-center py-4">Memuat detail sidak…</p>}
                                                {cached === null && <p className="text-xs text-red-500 text-center py-4">Gagal memuat. Coba tutup lalu buka lagi.</p>}
                                                {cached && (
                                                    <div className="space-y-3 pt-1">
                                                        {(cached.checklistSnapshot?.sections ?? []).map((section) => (
                                                            <FormSection key={section.id} variant="drawer" title={section.name}>
                                                                {(section.items ?? []).map((item) => (
                                                                    <div key={item.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <p className="text-xs font-medium text-gray-700">{item.label}</p>
                                                                            {item.answer?.value && (
                                                                                <Badge color={item.answer.value === item.option_negative ? 'red' : 'green'} size="sm">{item.answer.value}</Badge>
                                                                            )}
                                                                        </div>
                                                                        {item.answer?.note && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 mt-1.5">{item.answer.note}</p>}
                                                                        {(item.answer?.photos ?? []).length > 0 && (
                                                                            <div className="flex gap-1.5 flex-wrap mt-1.5">
                                                                                {item.answer.photos.map((photo) => (
                                                                                    <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                                                                        <img src={photo.url} alt="Foto bukti sidak" loading="lazy" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </FormSection>
                                                        ))}
                                                        {(cached.inspection?.other_notes || cached.inspection?.notes) && (
                                                            <FormSection variant="drawer" title="Catatan Petugas">
                                                                {cached.inspection.other_notes && <p className="text-xs text-gray-600 whitespace-pre-wrap mb-2"><span className="font-medium text-gray-700">Lain-lain: </span>{cached.inspection.other_notes}</p>}
                                                                {cached.inspection.notes && <p className="text-xs text-gray-600 whitespace-pre-wrap"><span className="font-medium text-gray-700">Keluhan/Saran: </span>{cached.inspection.notes}</p>}
                                                            </FormSection>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!loading && activeTab === 'permits' && (
                        <div className="space-y-2">
                            {permits.length === 0 && <Empty text="Belum ada surat izin." />}
                            {permits.slice(0, 20).map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/permit-requests/${p.id}`}
                                    className="block rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 hover:border-[#0F1E36]/30 hover:bg-blue-50/40 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-gray-900 font-mono truncate">{p.permit_number}</p>
                                        <Badge color={permitColor[p.status] ?? 'gray'} size="sm">{permitLabel[p.status] ?? p.status}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{p.job_type ?? '—'} — {p.request_date ? formatDateID(p.request_date) : '—'}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                    {!loading && activeTab === 'contact' && (
                        <div className="space-y-2">
                            <InfoRow label="Badan hukum" value={tenant.legal_entity_name} />
                            <InfoRow label="Telepon" value={tenant.company_phone} />
                            <InfoRow label="Email" value={tenant.company_email} />
                            <InfoRow label="Alamat" value={tenant.company_address} />
                            <InfoRow label="NPWP" value={tenant.npwp_number} mono />
                            <InfoRow label="SIUP" value={tenant.siup_number} mono />
                            {(tenant.contacts ?? []).map((c) => (
                                <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3">
                                    <p className="text-xs font-semibold text-gray-900">{c.name} <span className="font-normal text-gray-400">· {c.position}</span></p>
                                    <p className="text-xs text-gray-500 mt-0.5">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                                </div>
                            ))}
                            {(!tenant.company_phone && (tenant.contacts ?? []).length === 0) && <Empty text="Belum ada kontak." />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Empty({ text }) {
    return <p className="text-xs text-gray-400 text-center py-6">{text}</p>;
}

function InfoRow({ label, value, mono }) {
    if (!value) return null;
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`text-xs text-gray-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
}
