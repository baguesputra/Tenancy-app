import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import EmptyState from '@/Components/EmptyState';
import { formatDateID, formatDateRange, formatTimeRange } from '@/utils/format';
import initials from '@/utils/initials';
import {
    IconBuilding,
    IconStorefront,
    IconContract,
    IconClipboard,
    IconEdit,
    IconExternalLink,
} from '@/Components/Icons';

const sidakColor = { draft: 'gray', completed: 'green' };
const sidakLabel = { draft: 'Draft', completed: 'Selesai' };
const permitColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const permitLabel = { pending: 'Antre Persetujuan', completed: 'Selesai', rejected: 'Ditolak' };

const rupiah = (v) => (v === null || v === undefined || v === '' ? '—' : `Rp ${Number(v).toLocaleString('id-ID')}`);

function daysLabel(days) {
    if (days === null || days === undefined) return 'Tanpa Batas Waktu';
    if (days < 0) return `Berakhir ${Math.abs(days)} hari lalu`;
    if (days === 0) return 'Berakhir hari ini';
    return `${days} hari tersisa`;
}

function getTenancyProgress(startDate, endDate) {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function formatWaLink(phone) {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, '');
    const normalized = clean.startsWith('0') ? '62' + clean.slice(1) : clean.startsWith('62') ? clean : '62' + clean;
    return `https://wa.me/${normalized}`;
}

const validTabs = ['profile', 'inspections', 'permits'];

function initialTab() {
    if (typeof window === 'undefined') return 'profile';
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q === 'sidak') return 'inspections';
    if (q === 'izin') return 'permits';
    if (q === 'operasional') return 'inspections';
    if (q === 'ringkasan' || q === 'kontrak' || q === 'kontak') return 'profile';
    return validTabs.includes(q) ? q : 'profile';
}

const PAGE_SIZE = 8;

export default function Show({ tenant, tenancies = [], inspections = [], permits = [], contactsByType = {}, unitQr, filters = {} }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // Modal Details for Inspections & Permits
    const [modalSidak, setModalSidak] = useState(null);
    const [sidakCache, setSidakCache] = useState({});
    const [sidakLoading, setSidakLoading] = useState(false);

    const [modalPermit, setModalPermit] = useState(null);
    const [permitCache, setPermitCache] = useState({});
    const [permitLoading, setPermitLoading] = useState(false);

    // Filter & Pagination States
    const [sidakSearch, setSidakSearch] = useState('');
    const [sidakFilter, setSidakFilter] = useState('all'); // 'all' | 'flagged' | 'completed'
    const [sidakPage, setSidakPage] = useState(1);

    const [permitSearch, setPermitSearch] = useState('');
    const [permitFilter, setPermitFilter] = useState('all'); // 'all' | 'pending' | 'completed' | 'rejected'
    const [permitPage, setPermitPage] = useState(1);

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    const selectTab = (key) => {
        setActiveTab(key);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState({}, '', url);
    };

    const copyText = (text, key) => {
        if (!text) return;
        navigator.clipboard?.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const openSidakModal = (i) => {
        setModalSidak(i);
        if (!sidakCache[i.id]) {
            setSidakLoading(true);
            fetch(`/tenant-profiles/${tenant.id}/inspections/${i.id}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((r) => r.json())
                .then((d) => setSidakCache((prev) => ({ ...prev, [i.id]: d })))
                .catch(() => setSidakCache((prev) => ({ ...prev, [i.id]: null })))
                .finally(() => setSidakLoading(false));
        }
    };

    const openPermitModal = (p) => {
        setModalPermit(p);
        if (!permitCache[p.id]) {
            setPermitLoading(true);
            fetch(`/tenant-profiles/${tenant.id}/permits/${p.id}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((r) => r.json())
                .then((d) => setPermitCache((prev) => ({ ...prev, [p.id]: d.permit })))
                .catch(() => setPermitCache((prev) => ({ ...prev, [p.id]: null })))
                .finally(() => setPermitLoading(false));
        }
    };

    const activeTenancy = tenant.active_tenancy ?? tenancies.find((t) => t.status === 'active');
    const unitCode = activeTenancy?.unit?.unit_code ?? '—';
    const completedSidak = inspections.filter((i) => i.status === 'completed').length;
    const flaggedSidak = inspections.filter((i) => i.is_flagged).length;
    const pendingPermits = permits.filter((p) => p.status === 'pending').length;
    const totalContacts = Object.values(contactsByType).reduce((acc, list) => acc + list.length, 0);

    const primaryContact = useMemo(() => {
        for (const list of Object.values(contactsByType)) {
            const found = list.find((c) => c.is_primary) || list.find((c) => c.phone);
            if (found) return found;
        }
        return null;
    }, [contactsByType]);

    const completenessFields = [
        { key: 'legal_entity_name', label: 'Badan Hukum' },
        { key: 'company_phone', label: 'Telepon Perusahaan' },
        { key: 'company_email', label: 'Email Perusahaan' },
        { key: 'company_address', label: 'Alamat Kantor' },
        { key: 'npwp_number', label: 'Nomor NPWP' },
        { key: 'siup_number', label: 'Nomor SIUP / NIB' },
    ];
    const completeness = completenessFields.filter((f) => tenant[f.key]).length;

    // Filtered & Paginated Inspections
    const filteredInspections = useMemo(() => {
        return inspections.filter((i) => {
            if (sidakFilter === 'flagged' && !i.is_flagged) return false;
            if (sidakFilter === 'completed' && i.status !== 'completed') return false;
            if (sidakSearch.trim()) {
                const q = sidakSearch.toLowerCase();
                const matchName = i.template_name && i.template_name.toLowerCase().includes(q);
                const matchOfficer = i.session_officer && i.session_officer.toLowerCase().includes(q);
                const matchStatus = i.status && i.status.toLowerCase().includes(q);
                if (!matchName && !matchOfficer && !matchStatus) return false;
            }
            return true;
        });
    }, [inspections, sidakFilter, sidakSearch]);

    const sidakTotalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
    const paginatedInspections = useMemo(() => {
        const start = (sidakPage - 1) * PAGE_SIZE;
        return filteredInspections.slice(start, start + PAGE_SIZE);
    }, [filteredInspections, sidakPage]);

    // Filtered & Paginated Permits
    const filteredPermits = useMemo(() => {
        return permits.filter((p) => {
            if (permitFilter === 'pending' && p.status !== 'pending') return false;
            if (permitFilter === 'completed' && p.status !== 'completed') return false;
            if (permitFilter === 'rejected' && p.status !== 'rejected') return false;
            if (permitSearch.trim()) {
                const q = permitSearch.toLowerCase();
                const matchNo = p.permit_number && p.permit_number.toLowerCase().includes(q);
                const matchJob = p.job_type && p.job_type.toLowerCase().includes(q);
                const matchPic = p.pic_name && p.pic_name.toLowerCase().includes(q);
                const matchVendor = p.contractor_company && p.contractor_company.toLowerCase().includes(q);
                if (!matchNo && !matchJob && !matchPic && !matchVendor) return false;
            }
            return true;
        });
    }, [permits, permitFilter, permitSearch]);

    const permitTotalPages = Math.max(1, Math.ceil(filteredPermits.length / PAGE_SIZE));
    const paginatedPermits = useMemo(() => {
        const start = (permitPage - 1) * PAGE_SIZE;
        return filteredPermits.slice(start, start + PAGE_SIZE);
    }, [filteredPermits, permitPage]);

    const tenancyProgress = getTenancyProgress(activeTenancy?.start_date, activeTenancy?.end_date);

    const printQr = () => {
        if (!unitQr) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR Code Unit ${unitCode} - ${tenant.name}</title>
                    <style>
                        body { font-family: "Inter", system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 92vh; margin: 0; color: #0F1E36; }
                        .card { border: 2px solid #0F1E36; border-radius: 12px; padding: 36px 44px; text-align: center; max-width: 360px; }
                        h2 { margin: 0 0 6px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
                        p.unit { margin: 0 0 16px; font-family: ui-monospace, monospace; font-size: 16px; font-weight: 700; color: #475569; }
                        img { width: 220px; height: 220px; display: block; margin: 0 auto; }
                        p.sub { margin: 18px 0 0; font-size: 11px; color: #64748B; font-weight: 500; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>${tenant.name}</h2>
                        <p class="unit">UNIT ${unitCode}</p>
                        <img src="${unitQr}" alt="QR Unit" />
                        <p class="sub">QR Code Verifikasi Resmi Operasional &amp; Sidak Unit</p>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const leaseTone = (days) => {
        if (days === null || days === undefined) return 'text-gray-900';
        if (days < 0) return 'text-red-700';
        if (days <= 90) return 'text-amber-700';
        return 'text-gray-900';
    };

    const tabs = [
        { key: 'profile', label: 'Profil' },
        { key: 'inspections', label: 'Sidak', count: inspections.length },
        { key: 'permits', label: 'Izin', count: permits.length },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-5 flex-1 max-w-7xl w-full mx-auto">
                <section className="overflow-hidden rounded-xl border border-[#E2E5EA]">
                <header className="flex flex-col gap-4 bg-[#0F1E36] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-4">
                        {tenant.logo_url ? (
                            <img
                                src={tenant.logo_url}
                                alt={`Logo ${tenant.name}`}
                                className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1.5"
                            />
                        ) : (
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-semibold text-white"
                                aria-hidden="true"
                            >
                                {initials(tenant.name)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold tracking-tight text-white">{tenant.name}</h1>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
                                <span className={tenant.is_active ? 'text-emerald-300' : 'text-white/50'}>
                                    {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                {tenant.tenant_category?.name && <span>{tenant.tenant_category.name}</span>}
                                {tenant.product_category?.name && <span>{tenant.product_category.name}</span>}
                                {tenant.branch?.name && <span>{tenant.branch.name}</span>}
                                {tenant.legal_entity_name && <span className="truncate">{tenant.legal_entity_name}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {unitQr && (
                            <button
                                type="button"
                                onClick={() => setQrModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-white py-1 pl-1 pr-3 text-left transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-white"
                            >
                                <img src={unitQr} alt={`QR ${unitCode}`} className="h-8 w-8 rounded" loading="lazy" />
                                <span>
                                    <span className="block text-xs text-gray-500">QR unit</span>
                                    <span className="block font-mono text-sm font-semibold text-gray-900">{unitCode}</span>
                                </span>
                            </button>
                        )}
                        <Link
                            href={`/tenants?search=${encodeURIComponent(tenant.name)}`}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/25 px-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <IconEdit className="h-3.5 w-3.5" />
                            Kelola master
                        </Link>
                    </div>
                </header>

                <dl className="grid grid-cols-2 gap-px border-t border-white/10 bg-[#E2E5EA] sm:grid-cols-4">
                    <div className="bg-white px-4 py-3">
                        <dt className="text-xs text-gray-500">Unit aktif</dt>
                        <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-gray-900">{activeTenancy?.unit?.unit_code ?? '—'}</dd>
                    </div>
                    <div className="bg-white px-4 py-3">
                        <dt className="text-xs text-gray-500">Sisa sewa</dt>
                        <dd className={`mt-1 text-xl font-semibold tabular-nums ${leaseTone(activeTenancy?.days_remaining)}`}>
                            {activeTenancy?.days_remaining !== undefined && activeTenancy?.days_remaining !== null
                                ? `${activeTenancy.days_remaining} hari`
                                : '—'}
                        </dd>
                    </div>
                    <div className="bg-white px-4 py-3">
                        <dt className="text-xs text-gray-500">Sidak selesai</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                            {completedSidak}
                            <span className="text-sm font-normal text-gray-400"> / {inspections.length}</span>
                            {flaggedSidak > 0 && <span className="ml-2 text-sm font-normal text-red-700">{flaggedSidak} temuan</span>}
                        </dd>
                    </div>
                    <div className="bg-white px-4 py-3">
                        <dt className="text-xs text-gray-500">Izin menunggu</dt>
                        <dd className={`mt-1 text-xl font-semibold tabular-nums ${pendingPermits > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                            {pendingPermits}
                            <span className="text-sm font-normal text-gray-400"> / {permits.length}</span>
                        </dd>
                    </div>
                </dl>
                </section>

                <div role="tablist" aria-label="Data tenant" className="mt-4 flex gap-1 border-b border-[#E2E5EA]">
                    {tabs.map((tab) => {
                        const selected = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                id={`tab-${tab.key}`}
                                aria-selected={selected}
                                aria-controls={`panel-${tab.key}`}
                                onClick={() => selectTab(tab.key)}
                                className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    selected
                                        ? 'border-[#0F1E36] font-semibold text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {tab.label}
                                {tab.count !== undefined && <span className="ml-1.5 tabular-nums text-gray-400">{tab.count}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-5">
                    {activeTab === 'profile' && (
                        <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="space-y-4">
                            <section className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                                <div className="flex items-baseline justify-between border-b border-[#E2E5EA] px-4 py-3">
                                    <h2 className="text-sm font-semibold text-gray-900">Legalitas</h2>
                                    <p className="text-xs text-gray-500">{completeness} dari 6 field terisi</p>
                                </div>
                                <dl>
                                    <CorporateInfoRow label="Badan hukum" value={tenant.legal_entity_name} fieldKey="legal_entity" onCopy={copyText} copiedKey={copiedKey} />
                                    <CorporateInfoRow label="Telepon" value={tenant.company_phone} fieldKey="phone" onCopy={copyText} copiedKey={copiedKey} isTel />
                                    <CorporateInfoRow label="Email" value={tenant.company_email} fieldKey="email" onCopy={copyText} copiedKey={copiedKey} isMail />
                                    <CorporateInfoRow label="NPWP" value={tenant.npwp_number} fieldKey="npwp" onCopy={copyText} copiedKey={copiedKey} mono />
                                    <CorporateInfoRow label="SIUP / NIB" value={tenant.siup_number} fieldKey="siup" onCopy={copyText} copiedKey={copiedKey} mono />
                                    <CorporateInfoRow label="Cabang" value={tenant.branch?.name} fieldKey="branch" />
                                    <CorporateInfoRow label="Alamat" value={tenant.company_address} fieldKey="address" onCopy={copyText} copiedKey={copiedKey} />
                                </dl>
                            </section>

                            <section className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                                <div className="border-b border-[#E2E5EA] px-4 py-3">
                                    <h2 className="text-sm font-semibold text-gray-900">Kontrak</h2>
                                </div>
                                {tenancies.length === 0 ? (
                                    <EmptyState variant="empty" size="sm" title="Belum ada kontrak" description="Tenant ini belum memiliki perjanjian sewa." />
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-[#E2E5EA] bg-gray-50 text-xs text-gray-500">
                                                <th className="px-4 py-2.5 font-medium">Unit</th>
                                                <th className="px-4 py-2.5 font-medium">Lokasi</th>
                                                <th className="px-4 py-2.5 font-medium">Masa sewa</th>
                                                <th className="px-4 py-2.5 font-medium">Sisa</th>
                                                <th className="px-4 py-2.5 text-right font-medium">Nilai sewa</th>
                                                <th className="px-4 py-2.5 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E2E5EA]">
                                            {tenancies.map((c) => (
                                                <ContractRow key={c.id} contract={c} />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>

                            <section className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                                <div className="border-b border-[#E2E5EA] px-4 py-3">
                                    <h2 className="text-sm font-semibold text-gray-900">Narahubung</h2>
                                </div>
                                {totalContacts === 0 ? (
                                    <EmptyState variant="empty" size="sm" title="Belum ada narahubung" description="Belum ada kontak yang didaftarkan untuk tenant ini." />
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-[#E2E5EA] bg-gray-50 text-xs text-gray-500">
                                                <th className="px-4 py-2.5 font-medium">Nama</th>
                                                <th className="px-4 py-2.5 font-medium">Jabatan</th>
                                                <th className="px-4 py-2.5 font-medium">Kelompok</th>
                                                <th className="px-4 py-2.5 font-medium">Kontak</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E2E5EA]">
                                            {Object.entries(contactsByType).flatMap(([type, list]) => list.map((c) => {
                                                const waLink = formatWaLink(c.phone);
                                                return (
                                                    <tr key={c.id}>
                                                        <td className="px-4 py-2.5 font-medium text-gray-900">
                                                            {c.name}
                                                            {c.is_primary && <span className="ml-2 text-xs font-normal text-emerald-700">Utama</span>}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-500">{c.title || '—'}</td>
                                                        <td className="px-4 py-2.5 text-gray-500">{type}</td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="flex items-center gap-3">
                                                                {c.phone && <a href={`tel:${c.phone}`} className="tabular-nums text-gray-900 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36]">{c.phone}</a>}
                                                                {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36]">WhatsApp</a>}
                                                                {c.email && <a href={`mailto:${c.email}`} className="text-gray-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36]">Email</a>}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }))}
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        </div>
                    )}

                        {/* ========================================================= */}
                        {/* VIEW 2: INSPEKSI SIDAK — SINGLE UNIFIED DATA TABLE CARD   */}
                        {/* ========================================================= */}
                        {activeTab === 'inspections' && (
                            <div role="tabpanel" id="panel-inspections" aria-labelledby="tab-inspections" className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                                <div className="space-y-3 border-b border-[#E2E5EA] p-4">
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                        <h2 className="text-sm font-semibold text-gray-900">Inspeksi sidak</h2>

                                        <div className="flex w-fit shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSidakFilter('all');
                                                    setSidakPage(1);
                                                }}
                                                className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    sidakFilter === 'all'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Semua ({inspections.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSidakFilter('flagged');
                                                    setSidakPage(1);
                                                }}
                                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    sidakFilter === 'flagged'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Ada Temuan ({flaggedSidak})
                                                {flaggedSidak > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSidakFilter('completed');
                                                    setSidakPage(1);
                                                }}
                                                className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    sidakFilter === 'completed'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Selesai ({completedSidak})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Integrated Search Bar inside same Card Header */}
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={sidakSearch}
                                            onChange={(e) => {
                                                setSidakSearch(e.target.value);
                                                setSidakPage(1);
                                            }}
                                            placeholder="Cari berdasarkan nama template, nama petugas, atau status inspeksi..."
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-1 focus:ring-[#0F1E36] transition-colors"
                                        />
                                        <svg
                                            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Table Body directly attached */}
                                {filteredInspections.length === 0 ? (
                                    <div className="p-8">
                                        <EmptyState
                                            variant="empty"
                                            size="sm"
                                            title="Tidak Ada Data Inspeksi"
                                            description={
                                                sidakSearch || sidakFilter !== 'all'
                                                    ? 'Tidak ditemukan data inspeksi sidak dengan kriteria pencarian ini.'
                                                    : 'Belum pernah dilakukan inspeksi sidak berkala pada unit tenant ini.'
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#E2E5EA] bg-gray-50 text-xs text-gray-500">
                                                    <th className="py-2.5 px-4 font-medium">Tanggal</th>
                                                    <th className="py-3 px-4">Template Pemeriksaan</th>
                                                    <th className="py-3 px-4">Petugas Pemeriksa</th>
                                                    <th className="py-3 px-4">Hasil Checklist</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedInspections.map((i) => (
                                                    <tr
                                                        key={i.id}
                                                        onClick={() => openSidakModal(i)}
                                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                                        title="Klik baris untuk membuka rincian hasil sidak"
                                                    >
                                                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono">
                                                            {i.session_started_at ? formatDateID(i.session_started_at) : '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-900 group-hover:text-[#0F1E36] transition-colors">
                                                                    {i.template_name}
                                                                </span>
                                                                {i.is_flagged && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                                        Temuan
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                                                            {i.session_officer || '—'}
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                                                            <span className="font-bold text-slate-800">{i.answered}</span>/{i.total} Terjawab
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            <Badge
                                                                color={i.session_status === 'in_progress' ? 'yellow' : sidakColor[i.status] ?? 'gray'}
                                                                size="sm"
                                                            >
                                                                {i.session_status === 'in_progress' ? 'Penyidakan' : sidakLabel[i.status] ?? i.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Pagination Footer Integrated at bottom of same card */}
                                {filteredInspections.length > PAGE_SIZE && (
                                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
                                        <span>
                                            Menampilkan <strong className="text-slate-900 font-mono">{(sidakPage - 1) * PAGE_SIZE + 1}</strong> -{' '}
                                            <strong className="text-slate-900 font-mono">
                                                {Math.min(sidakPage * PAGE_SIZE, filteredInspections.length)}
                                            </strong>{' '}
                                            dari <strong className="text-slate-900 font-mono">{filteredInspections.length}</strong> inspeksi
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={sidakPage === 1}
                                                onClick={() => setSidakPage((prev) => Math.max(1, prev - 1))}
                                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Sebelumnya
                                            </button>
                                            <span className="px-2 text-xs font-mono font-bold text-slate-700">
                                                Hal {sidakPage} / {sidakTotalPages}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={sidakPage >= sidakTotalPages}
                                                onClick={() => setSidakPage((prev) => Math.min(sidakTotalPages, prev + 1))}
                                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Selanjutnya →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 3: SURAT IZIN KERJA — SINGLE UNIFIED DATA TABLE CARD */}
                        {/* ========================================================= */}
                        {activeTab === 'permits' && (
                            <div role="tabpanel" id="panel-permits" aria-labelledby="tab-permits" className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                                <div className="space-y-3 border-b border-[#E2E5EA] p-4">
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                        <h2 className="text-sm font-semibold text-gray-900">Surat izin kerja</h2>

                                        <div className="flex w-fit shrink-0 flex-wrap items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPermitFilter('all');
                                                    setPermitPage(1);
                                                }}
                                                className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    permitFilter === 'all'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Semua ({permits.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPermitFilter('pending');
                                                    setPermitPage(1);
                                                }}
                                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    permitFilter === 'pending'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Antre Approval ({pendingPermits})
                                                {pendingPermits > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPermitFilter('completed');
                                                    setPermitPage(1);
                                                }}
                                                className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    permitFilter === 'completed'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Disetujui
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPermitFilter('rejected');
                                                    setPermitPage(1);
                                                }}
                                                className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                    permitFilter === 'rejected'
                                                        ? 'bg-[#0F1E36] font-semibold text-white'
                                                        : 'text-gray-500 hover:text-gray-900'
                                                }`}
                                            >
                                                Ditolak
                                            </button>
                                        </div>
                                    </div>

                                    {/* Integrated Search Bar inside same Card Header */}
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            value={permitSearch}
                                            onChange={(e) => {
                                                setPermitSearch(e.target.value);
                                                setPermitPage(1);
                                            }}
                                            placeholder="Cari berdasarkan nomor permit, jenis pekerjaan, PIC lapangan, atau vendor..."
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-1 focus:ring-[#0F1E36] transition-colors"
                                        />
                                        <svg
                                            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Table Body directly attached */}
                                {filteredPermits.length === 0 ? (
                                    <div className="p-8">
                                        <EmptyState
                                            variant="empty"
                                            size="sm"
                                            title="Tidak Ada Izin Kerja"
                                            description={
                                                permitSearch || permitFilter !== 'all'
                                                    ? 'Tidak ditemukan surat izin kerja dengan filter pencarian ini.'
                                                    : 'Belum ada surat izin kerja yang pernah diajukan untuk tenant ini.'
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-[#E2E5EA] bg-gray-50 text-xs text-gray-500">
                                                    <th className="py-2.5 px-4 font-medium">No. izin</th>
                                                    <th className="py-3 px-4">Pekerjaan &amp; Vendor</th>
                                                    <th className="py-3 px-4">Jadwal Pelaksanaan</th>
                                                    <th className="py-3 px-4">Tenaga Kerja</th>
                                                    <th className="py-3 px-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedPermits.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        onClick={() => openPermitModal(p)}
                                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                                        title="Klik baris untuk membuka rincian surat izin kerja"
                                                    >
                                                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 group-hover:text-[#0F1E36] transition-colors">
                                                            {p.permit_number}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-semibold text-slate-800">{p.job_type || 'Pekerjaan Umum'}</div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-sm">
                                                                {p.is_external ? `Vendor: ${p.contractor_company || 'Eksternal'}` : `PIC: ${p.pic_name || 'Internal'}`}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                                                            {formatDateRange(p.work_start_date, p.work_end_date)}
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                                                            {p.workers_total ?? 0} Pekerja
                                                        </td>
                                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                                            <Badge color={permitColor[p.status] ?? 'gray'} size="sm">
                                                                {permitLabel[p.status] ?? p.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Pagination Footer Integrated at bottom of same card */}
                                {filteredPermits.length > PAGE_SIZE && (
                                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
                                        <span>
                                            Menampilkan <strong className="text-slate-900 font-mono">{(permitPage - 1) * PAGE_SIZE + 1}</strong> -{' '}
                                            <strong className="text-slate-900 font-mono">
                                                {Math.min(permitPage * PAGE_SIZE, filteredPermits.length)}
                                            </strong>{' '}
                                            dari <strong className="text-slate-900 font-mono">{filteredPermits.length}</strong> surat izin
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={permitPage === 1}
                                                onClick={() => setPermitPage((prev) => Math.max(1, prev - 1))}
                                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Sebelumnya
                                            </button>
                                            <span className="px-2 text-xs font-mono font-bold text-slate-700">
                                                Hal {permitPage} / {permitTotalPages}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={permitPage >= permitTotalPages}
                                                onClick={() => setPermitPage((prev) => Math.min(permitTotalPages, prev + 1))}
                                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Selanjutnya →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                </div>
            </div>

            {/* MODAL 1: Detail Hasil Inspeksi Sidak */}
            {modalSidak && (
                <Modal
                    open={!!modalSidak}
                    onClose={() => setModalSidak(null)}
                    title={`Hasil Sidak — ${modalSidak.template_name}`}
                    icon={<IconClipboard className="w-4 h-4 text-[#0F1E36]" />}
                    maxWidth="max-w-2xl"
                >
                    <div className="p-1 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Waktu Pemeriksaan: <span className="font-mono text-slate-800 font-bold">{modalSidak.session_started_at ? formatDateID(modalSidak.session_started_at) : '—'}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Petugas: <span className="font-semibold text-slate-800">{modalSidak.session_officer || '—'}</span>
                                </p>
                            </div>
                            <Badge
                                color={modalSidak.session_status === 'in_progress' ? 'yellow' : sidakColor[modalSidak.status] ?? 'gray'}
                                size="sm"
                            >
                                {modalSidak.session_status === 'in_progress' ? 'Penyidakan' : sidakLabel[modalSidak.status] ?? modalSidak.status}
                            </Badge>
                        </div>

                        {sidakLoading && !sidakCache[modalSidak.id] ? (
                            <SkeletonLines rows={4} />
                        ) : sidakCache[modalSidak.id] ? (
                            <SidakBody cached={sidakCache[modalSidak.id]} />
                        ) : (
                            <p className="text-xs text-slate-500 italic py-4">Gagal memuat rincian inspeksi.</p>
                        )}
                    </div>
                </Modal>
            )}

            {/* MODAL 2: Detail Surat Izin Kerja */}
            {modalPermit && (
                <Modal
                    open={!!modalPermit}
                    onClose={() => setModalPermit(null)}
                    title={`Surat Izin Kerja — ${modalPermit.permit_number}`}
                    icon={<IconContract className="w-4 h-4 text-[#0F1E36]" />}
                    maxWidth="max-w-2xl"
                >
                    <div className="p-1 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Jenis Pekerjaan: <span className="font-semibold text-slate-800">{modalPermit.job_type || '—'}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tanggal Pengajuan: <span className="font-mono text-slate-800 font-bold">{modalPermit.request_date ? formatDateID(modalPermit.request_date) : '—'}</span>
                                </p>
                            </div>
                            <Badge color={permitColor[modalPermit.status] ?? 'gray'} size="sm">
                                {permitLabel[modalPermit.status] ?? modalPermit.status}
                            </Badge>
                        </div>

                        {permitLoading && !permitCache[modalPermit.id] ? (
                            <SkeletonLines rows={4} />
                        ) : permitCache[modalPermit.id] ? (
                            <PermitBody permit={permitCache[modalPermit.id]} />
                        ) : (
                            <p className="text-xs text-slate-500 italic py-4">Gagal memuat rincian perizinan kerja.</p>
                        )}
                    </div>
                </Modal>
            )}

            {/* MODAL 3: Perbesar & Cetak QR Code Unit */}
            {unitQr && (
                <Modal
                    open={qrModalOpen}
                    onClose={() => setQrModalOpen(false)}
                    title={`QR Code Verifikasi Unit — ${unitCode}`}
                    icon={<IconBuilding className="w-4 h-4 text-[#0F1E36]" />}
                    maxWidth="max-w-md"
                >
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <img src={unitQr} alt={`QR Code ${unitCode}`} className="w-56 h-56" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mt-4">{tenant.name}</h3>
                        <p className="text-sm font-mono font-bold text-slate-600 mt-0.5">Unit {unitCode}</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            Gunakan QR Code ini untuk scan verifikasi petugas sidak berkala, absensi tenaga kerja, dan izin kerja di lapangan.
                        </p>

                        <div className="flex items-center gap-2.5 mt-6 w-full">
                            <a
                                href={unitQr}
                                download={`QR-Unit-${unitCode}-${tenant.name}.svg`}
                                className="flex-1 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold text-white bg-[#0F1E36] hover:bg-[#1A2E4C] transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Unduh File SVG
                            </a>

                            <button
                                type="button"
                                onClick={printQr}
                                className="flex-1 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Cetak Langsung
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}

function CorporateInfoRow({ label, value, fieldKey, onCopy, copiedKey, isTel, isMail, mono }) {
    const isCopied = copiedKey === fieldKey;
    const valueClass = `text-sm text-gray-900 ${mono ? 'font-mono' : ''}`;

    return (
        <div className="grid grid-cols-1 gap-0.5 border-b border-[#E2E5EA] px-4 py-2.5 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="flex min-w-0 items-baseline gap-2">
                {value ? (
                    isTel ? (
                        <a href={`tel:${value}`} className={`${valueClass} underline-offset-2 hover:underline`}>{value}</a>
                    ) : isMail ? (
                        <a href={`mailto:${value}`} className={`${valueClass} truncate underline-offset-2 hover:underline`}>{value}</a>
                    ) : (
                        <span className={valueClass}>{value}</span>
                    )
                ) : (
                    <span className="text-sm text-gray-300">Belum diisi</span>
                )}
                {value && onCopy && (
                    <button
                        type="button"
                        onClick={() => onCopy(value, fieldKey)}
                        className={`shrink-0 rounded text-xs focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                            isCopied ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        {isCopied ? 'Tersalin' : 'Salin'}
                    </button>
                )}
            </dd>
        </div>
    );
}

function ContractRow({ contract: c }) {
    const isActive = c.status === 'active';
    const progress = getTenancyProgress(c.start_date, c.end_date);
    const [open, setOpen] = useState(isActive);
    const location = [c.unit?.floor ? `Lantai ${c.unit.floor}` : null, c.unit?.block ? `Blok ${c.unit.block}` : null, c.unit?.size ? `${c.unit.size} m²` : null]
        .filter(Boolean)
        .join(' · ');
    const statusLabel = isActive ? 'Aktif' : c.status === 'draft' ? 'Draft' : 'Berakhir';
    const statusColor = isActive ? 'green' : c.status === 'draft' ? 'gray' : 'red';
    const facts = [
        ['Masa sewa', formatDateRange(c.start_date, c.end_date)],
        ['Sisa waktu', daysLabel(c.days_remaining)],
        c.contract_number ? ['No. kontrak', c.contract_number] : null,
        c.rent_value ? ['Nilai sewa', `${rupiah(c.rent_value)}${c.rent_period ? ` / ${c.rent_period}` : ''}`] : null,
        c.service_charge ? ['Service charge', rupiah(c.service_charge)] : null,
        c.deposit_value ? ['Deposit', rupiah(c.deposit_value)] : null,
        c.percentage_rent_rate ? ['Bagi hasil', `${c.percentage_rent_rate}%${c.percentage_rent_breakpoint ? ` di atas ${rupiah(c.percentage_rent_breakpoint)}` : ''}`] : null,
        c.payment_term ? ['Termin', c.payment_term] : null,
        c.signed_date ? ['Tanggal TTD', formatDateID(c.signed_date)] : null,
    ].filter(Boolean);

    const leaseLeft = c.days_remaining;
    const leaseClass = leaseLeft !== null && leaseLeft !== undefined && leaseLeft < 0
        ? 'text-red-700'
        : leaseLeft !== null && leaseLeft !== undefined && leaseLeft <= 90
            ? 'text-amber-700'
            : 'text-gray-700';

    return (
        <>
            <tr
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
                }}
                tabIndex={0}
                aria-expanded={open}
                className="cursor-pointer hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
            >
                <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{c.unit?.unit_code ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{location || '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">{formatDateRange(c.start_date, c.end_date)}</td>
                <td className={`whitespace-nowrap px-4 py-2.5 ${leaseClass}`}>{daysLabel(c.days_remaining)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-900">
                    {c.rent_value ? rupiah(c.rent_value) : '—'}
                    {c.rent_period && <span className="text-gray-400"> / {c.rent_period}</span>}
                </td>
                <td className="px-4 py-2.5">
                    <Badge color={statusColor} size="sm">{statusLabel}</Badge>
                    {c.is_current && <span className="ml-2 text-xs text-gray-500">Ditempati</span>}
                </td>
            </tr>
            {open && (
                <tr className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                        {isActive && progress !== null && (
                            <div className="mb-2 max-w-xs">
                                <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className={`h-1 rounded-full ${progress >= 100 ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-[#0F1E36]'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-400">{progress}% masa sewa berjalan</p>
                            </div>
                        )}
                        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                            {facts.map(([label, value]) => (
                                <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-1">
                                    <dt className="text-sm text-gray-500">{label}</dt>
                                    <dd className="text-sm text-gray-900">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        {c.contract_document_path && (
                            <a
                                href={`/storage/${c.contract_document_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#0F1E36] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconExternalLink className="h-3.5 w-3.5" />
                                Dokumen perjanjian
                            </a>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

function SkeletonLines({ rows = 4 }) {
    return (
        <div className="space-y-2.5 py-2" aria-label="Memuat…" role="status">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className={`h-3 rounded-lg bg-slate-200 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
                    <div className="mt-1.5 h-3 w-1/3 rounded-lg bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

function SidakBody({ cached }) {
    const failed = cached.inspection?.failed_count ?? 0;
    const photos = cached.inspection?.photo_count ?? 0;
    return (
        <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                {cached.inspection?.session_officer && (
                    <span>
                        Petugas Pemeriksa: <span className="font-semibold text-slate-900">{cached.inspection.session_officer}</span>
                    </span>
                )}
                {cached.inspection?.session_ended_at && cached.inspection?.session_started_at && (
                    <span>
                        Waktu Sesi: {cached.inspection.session_started_at} → {cached.inspection.session_ended_at}
                    </span>
                )}
                <span className={failed > 0 ? 'text-red-700 font-bold' : 'text-slate-700'}>{failed} Item Temuan</span>
                <span>{photos} Foto Bukti</span>
            </div>

            {(cached.checklistSnapshot?.sections ?? []).map((section) => (
                <div key={section.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                    <h4 className="mb-2.5 border-b border-slate-100 pb-1.5 text-sm font-semibold text-slate-800">
                        {section.name}
                    </h4>
                    <div className="space-y-2.5">
                        {(section.items ?? []).map((item) => (
                            <div key={item.id} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-medium text-slate-700">{item.label}</p>
                                    {item.answer?.value && (
                                        <Badge
                                            color={item.answer.value === item.option_negative ? 'red' : 'green'}
                                            size="sm"
                                        >
                                            {item.answer.value}
                                        </Badge>
                                    )}
                                </div>
                                {item.answer?.note && (
                                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 mt-1.5">
                                        {item.answer.note}
                                    </p>
                                )}
                                {(item.answer?.photos ?? []).length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                                        {item.answer.photos.map((photo) => (
                                            <a
                                                key={photo.id}
                                                href={photo.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt="Foto bukti sidak"
                                                    loading="lazy"
                                                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {(cached.inspection?.other_notes || cached.inspection?.notes) && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-1.5">
                    <h4 className="font-bold text-slate-800">Catatan Khusus Petugas Pemeriksa:</h4>
                    {cached.inspection.other_notes && (
                        <p className="text-slate-600 whitespace-pre-wrap">
                            <span className="font-semibold text-slate-700">Lain-lain: </span>
                            {cached.inspection.other_notes}
                        </p>
                    )}
                    {cached.inspection.notes && (
                        <p className="text-slate-600 whitespace-pre-wrap">
                            <span className="font-semibold text-slate-700">Keluhan / Saran Tenant: </span>
                            {cached.inspection.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function PermitBody({ permit }) {
    return (
        <div className="space-y-3 pt-2 text-xs">
            {(permit.activity_types ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {permit.activity_types.map((a) => (
                        <Badge key={a} color="blue" size="sm">
                            {String(a).replaceAll('_', ' ')}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Jadwal Pelaksanaan</span>
                    <span className="font-medium text-slate-800">
                        {formatDateRange(permit.work_start_date, permit.work_end_date)} · {formatTimeRange(permit.work_start_time, permit.work_end_time)}
                    </span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lokasi Unit</span>
                    <span className="font-medium text-slate-800">
                        {permit.location_snapshot ??
                            [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot].filter(Boolean).join(' / ')}
                    </span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">PIC Lapangan</span>
                    <span className="font-medium text-slate-800">
                        {[permit.pic_name, permit.pic_phone].filter(Boolean).join(' · ')}
                    </span>
                </div>
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Rute Akses Gedung</span>
                    <span className="font-medium text-slate-800">{permit.access_route || '—'}</span>
                </div>
            </div>

            {permit.is_external && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                    <p className="text-xs font-medium text-amber-800">Kontraktor eksternal</p>
                    <p className="text-xs text-amber-950 mt-0.5">
                        {[permit.contractor_company, permit.contractor_pic, permit.contractor_phone].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>
            )}

            {permit.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {permit.notes}
                </p>
            )}

            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tenaga Kerja Terdaftar</p>
                    <p className="text-base font-bold font-mono text-slate-800">
                        {permit.workers_present ?? 0}/{permit.workers_total ?? 0}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Material Terverifikasi</p>
                    <p className="text-base font-bold font-mono text-slate-800">
                        {permit.goods_verified ?? 0}/{permit.goods_total ?? 0}
                    </p>
                </div>
            </div>

            {(permit.workers_detail ?? []).length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs text-slate-500">Tenaga kerja</p>
                    <div className="space-y-1.5">
                        {permit.workers_detail.map((w) => (
                            <div
                                key={w.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                            >
                                <p className="text-xs text-slate-800 truncate">
                                    {w.name}
                                    {w.mismatch_note ? <span className="text-red-600"> · {w.mismatch_note}</span> : null}
                                </p>
                                <Badge color={w.is_present ? 'green' : 'gray'} size="sm">
                                    {w.is_present ? 'Hadir' : 'Absen'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(permit.goods_detail ?? []).length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs text-slate-500">Material dan peralatan</p>
                    <div className="space-y-1.5">
                        {permit.goods_detail.map((g) => (
                            <div
                                key={g.id}
                                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                            >
                                {g.photo_url && (
                                    <img
                                        src={g.photo_url}
                                        alt={g.description}
                                        loading="lazy"
                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-800 truncate">
                                        {g.description}
                                        {g.quantity_note ? <span className="text-slate-400"> · {g.quantity_note}</span> : null}
                                    </p>
                                    {g.mismatch_note && <p className="text-[11px] text-red-600">{g.mismatch_note}</p>}
                                </div>
                                <Badge color={g.is_verified ? 'green' : 'gray'} size="sm">
                                    {g.is_verified ? 'OK' : 'Cek'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(permit.approvals ?? []).length > 0 && (
                <ol className="relative pl-5 space-y-2.5">
                    <span className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" aria-hidden="true" />
                    {permit.approvals.map((a, idx) => (
                        <li key={idx} className="relative text-xs">
                            <span
                                className={`absolute -left-5 w-[14px] h-[14px] rounded-full ${
                                    a.status === 'approved'
                                        ? 'bg-[#1FA24C]'
                                        : a.status === 'rejected'
                                        ? 'bg-red-500'
                                        : 'bg-slate-300'
                                }`}
                                aria-hidden="true"
                            />
                            <p className="font-semibold text-slate-800">
                                {a.label} · <span className="capitalize">{a.status}</span>
                            </p>
                            {(a.approved_by || a.approved_at) && (
                                <p className="text-slate-500">{[a.approved_by, a.approved_at].filter(Boolean).join(' · ')}</p>
                            )}
                            {a.notes && <p className="text-slate-500 mt-0.5">{a.notes}</p>}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
