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

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-5 flex-1 max-w-7xl w-full mx-auto">
                {/* Brand Header — Deep Navy #0F1E36 with Crisp High-Contrast Layout */}
                <div className="bg-[#0F1E36] text-white rounded-2xl border border-[#1E2D4A] shadow-md p-5 sm:p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Tenant Identity */}
                        <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
                            {tenant.logo_url ? (
                                <img
                                    src={tenant.logo_url}
                                    alt={`Logo ${tenant.name}`}
                                    className="w-18 h-18 sm:w-22 sm:h-22 rounded-xl bg-white object-contain p-2 shrink-0 border border-white/20 shadow-sm"
                                />
                            ) : (
                                <div
                                    className="w-18 h-18 sm:w-22 sm:h-22 rounded-xl bg-white/10 border border-white/20 text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-sm"
                                    aria-hidden="true"
                                >
                                    {initials(tenant.name)}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                                    {tenant.name}
                                </h1>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                            tenant.is_active
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-slate-700/60 text-slate-300 border border-slate-600'
                                        }`}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                tenant.is_active ? 'bg-emerald-400' : 'bg-slate-400'
                                            }`}
                                        />
                                        {tenant.is_active ? 'Tenant Aktif' : 'Nonaktif'}
                                    </span>

                                    {tenant.tenant_category?.name && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-400/20 text-amber-200 border border-amber-400/30">
                                            {tenant.tenant_category.name}
                                        </span>
                                    )}

                                    {tenant.product_category?.name && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-400/20 text-blue-200 border border-blue-400/30">
                                            {tenant.product_category.name}
                                        </span>
                                    )}

                                    {tenant.branch?.name && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-200 bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-md">
                                            <IconBuilding className="w-3.5 h-3.5 text-slate-300" />
                                            {tenant.branch.name}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                                    {tenant.legal_entity_name && (
                                        <span className="font-medium text-slate-200">{tenant.legal_entity_name}</span>
                                    )}
                                    {tenant.legal_entity_name && <span className="text-slate-400">·</span>}
                                    <span className="text-slate-300">Dokumen Legal {completeness}/6 Terisi</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Actions & QR Verification Asset */}
                        <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0">
                            <Link
                                href={`/tenants?search=${encodeURIComponent(tenant.name)}`}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors rounded-xl border border-white/20 focus-visible:outline-2 focus-visible:outline-white"
                            >
                                <IconEdit className="w-3.5 h-3.5 text-white/80" />
                                Kelola Master Tenant
                            </Link>

                            {unitQr && (
                                <button
                                    type="button"
                                    onClick={() => setQrModalOpen(true)}
                                    className="group inline-flex items-center gap-2.5 p-2 bg-white hover:bg-slate-50 transition-all rounded-xl shadow-xs text-left focus-visible:outline-2 focus-visible:outline-white"
                                    title="Klik untuk membuka & mencetak QR Unit"
                                >
                                    <img
                                        src={unitQr}
                                        alt={`QR ${unitCode}`}
                                        className="w-9 h-9 rounded bg-white p-0.5 border border-slate-200"
                                        loading="lazy"
                                    />
                                    <div className="pr-1.5">
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">QR Unit</p>
                                        <p className="text-xs font-bold text-[#0F1E36] font-mono flex items-center gap-1">
                                            {unitCode}
                                            <IconExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#0F1E36] transition-colors" />
                                        </p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 4 Corporate KPI Tiles — High Contrast & Readable */}
                    <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 rounded-xl p-3.5 transition-colors">
                            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 block">Unit &amp; Kontrak</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-white tabular-nums">{tenancies.length}</span>
                                <span className="text-xs font-medium text-slate-200">{activeTenancy ? 'Unit Aktif' : 'Tanpa Unit'}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 truncate font-mono">
                                {activeTenancy?.unit?.unit_code ? `Unit ${activeTenancy.unit.unit_code}` : 'Belum ada unit aktif'}
                            </p>
                        </div>

                        <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 rounded-xl p-3.5 transition-colors">
                            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 block">Masa Berlaku Sewa</span>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-xl sm:text-2xl font-bold font-mono text-white truncate tabular-nums">
                                    {activeTenancy?.days_remaining !== undefined && activeTenancy?.days_remaining !== null
                                        ? `${activeTenancy.days_remaining} Hari`
                                        : '—'}
                                </span>
                                {activeTenancy && (
                                    <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                            activeTenancy.days_remaining < 0
                                                ? 'bg-red-400'
                                                : activeTenancy.days_remaining <= 90
                                                ? 'bg-amber-400'
                                                : 'bg-emerald-400'
                                        }`}
                                    />
                                )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1 truncate">
                                {daysLabel(activeTenancy?.days_remaining)}
                            </p>
                        </div>

                        <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 rounded-xl p-3.5 transition-colors">
                            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 block">Pemeriksaan Sidak</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-white tabular-nums">{completedSidak}</span>
                                <span className="text-xs text-slate-300">/ {inspections.length} Selesai</span>
                            </div>
                            <p className="text-xs mt-1 truncate font-medium">
                                {flaggedSidak > 0 ? (
                                    <span className="text-red-300 font-semibold">{flaggedSidak} temuan perlu tindak lanjut</span>
                                ) : (
                                    <span className="text-slate-300">Kepatuhan terpantau baik</span>
                                )}
                            </p>
                        </div>

                        <div className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 rounded-xl p-3.5 transition-colors">
                            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 block">Perizinan Kerja</span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-white tabular-nums">{permits.length}</span>
                                <span className="text-xs text-slate-300">Surat Izin</span>
                            </div>
                            <p className="text-xs mt-1 truncate font-medium">
                                {pendingPermits > 0 ? (
                                    <span className="text-amber-300 font-semibold">{pendingPermits} menunggu persetujuan</span>
                                ) : (
                                    <span className="text-slate-300">Seluruh izin telah diproses</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2-Column Layout: Seamless Left Sidebar + Unified Right Canvas */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Left Sidebar — Single Unified Panel Container with Safe Top Clearance below Sticky Navbar (h-16 / 64px) */}
                    <aside className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-20 z-10">
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
                            {/* Navigation Items */}
                            <div className="p-3">
                                <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                    Menu Data Tenant
                                </div>
                                <nav className="space-y-1">
                                    {/* Profil & Kontrak (Unified View) */}
                                    <button
                                        type="button"
                                        onClick={() => selectTab('profile')}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'profile'
                                                ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <IconBuilding className={`w-4 h-4 ${activeTab === 'profile' ? 'text-white' : 'text-slate-500'}`} />
                                            <span>Profil &amp; Kontrak</span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                                                activeTab === 'profile'
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            Lengkap
                                        </span>
                                    </button>
                                </nav>

                                <div className="mt-3 pt-3 border-t border-slate-100 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                    Log Operasional
                                </div>
                                <nav className="space-y-1">
                                    {/* Inspeksi Sidak */}
                                    <button
                                        type="button"
                                        onClick={() => selectTab('inspections')}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'inspections'
                                                ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <IconClipboard className={`w-4 h-4 ${activeTab === 'inspections' ? 'text-white' : 'text-slate-500'}`} />
                                            <span>Inspeksi Sidak</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {flaggedSidak > 0 && (
                                                <span className="w-2 h-2 rounded-full bg-red-500" title={`${flaggedSidak} temuan terbuka`} />
                                            )}
                                            <span
                                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                                                    activeTab === 'inspections'
                                                        ? 'bg-white/20 text-white font-bold'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {inspections.length}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Surat Izin Kerja */}
                                    <button
                                        type="button"
                                        onClick={() => selectTab('permits')}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'permits'
                                                ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <IconContract className={`w-4 h-4 ${activeTab === 'permits' ? 'text-white' : 'text-slate-500'}`} />
                                            <span>Surat Izin Kerja</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {pendingPermits > 0 && (
                                                <span className="w-2 h-2 rounded-full bg-amber-500" title={`${pendingPermits} antre persetujuan`} />
                                            )}
                                            <span
                                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                                                    activeTab === 'permits'
                                                        ? 'bg-white/20 text-white font-bold'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {permits.length}
                                            </span>
                                        </div>
                                    </button>
                                </nav>
                            </div>

                            {/* Integrated Quick PIC Section at Bottom of Sidebar */}
                            {primaryContact && (
                                <div className="border-t border-slate-100 bg-slate-50/70 p-3.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                            Kontak Cepat PIC
                                        </span>
                                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                            {primaryContact.contact_type || 'Narahubung'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 truncate">{primaryContact.name}</p>
                                    {primaryContact.title && (
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{primaryContact.title}</p>
                                    )}

                                    <div className="mt-2.5 flex items-center gap-1.5">
                                        {primaryContact.phone && (
                                            <>
                                                <a
                                                    href={`tel:${primaryContact.phone}`}
                                                    className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                                    title="Telepon PIC"
                                                >
                                                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    Panggil
                                                </a>
                                                {formatWaLink(primaryContact.phone) && (
                                                    <a
                                                        href={formatWaLink(primaryContact.phone)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 flex items-center justify-center gap-1 transition-colors shadow-2xs"
                                                        title="Chat WhatsApp"
                                                    >
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </>
                                        )}
                                        {primaryContact.email && (
                                            <a
                                                href={`mailto:${primaryContact.email}`}
                                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
                                                title="Kirim Email"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Right Main Content Canvas */}
                    <main className="min-w-0 flex-1 space-y-6">
                        {/* ========================================================= */}
                        {/* VIEW 1: PROFIL & KONTRAK (GABUNGAN DATA UTAMA LENGKAP)    */}
                        {/* ========================================================= */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* SECTION A: Legalitas & Profil Entitas Bisnis */}
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
                                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center shrink-0 border border-slate-200/60">
                                                <IconBuilding className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">Legalitas &amp; Profil Entitas Bisnis</h2>
                                                <p className="text-xs text-slate-500">Informasi perizinan resmi, perpajakan, dan domisili perusahaan</p>
                                            </div>
                                        </div>
                                        <Badge color={completeness >= 5 ? 'green' : 'yellow'} size="sm" variant="soft">
                                            {completeness}/6 Terisi
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <CorporateInfoRow
                                            label="Badan Hukum"
                                            value={tenant.legal_entity_name}
                                            fieldKey="legal_entity"
                                            onCopy={copyText}
                                            copiedKey={copiedKey}
                                            placeholder="Belum terisi"
                                        />

                                        <CorporateInfoRow
                                            label="Telepon Perusahaan"
                                            value={tenant.company_phone}
                                            fieldKey="phone"
                                            onCopy={copyText}
                                            copiedKey={copiedKey}
                                            isTel
                                            placeholder="Belum terisi"
                                        />

                                        <CorporateInfoRow
                                            label="Email Resmi"
                                            value={tenant.company_email}
                                            fieldKey="email"
                                            onCopy={copyText}
                                            copiedKey={copiedKey}
                                            isMail
                                            placeholder="Belum terisi"
                                        />

                                        <CorporateInfoRow
                                            label="Nomor NPWP"
                                            value={tenant.npwp_number}
                                            fieldKey="npwp"
                                            onCopy={copyText}
                                            copiedKey={copiedKey}
                                            mono
                                            placeholder="Belum diisi"
                                        />

                                        <CorporateInfoRow
                                            label="Nomor SIUP / NIB"
                                            value={tenant.siup_number}
                                            fieldKey="siup"
                                            onCopy={copyText}
                                            copiedKey={copiedKey}
                                            mono
                                            placeholder="Belum diisi"
                                        />

                                        <CorporateInfoRow
                                            label="Cabang Mall Penempatan"
                                            value={tenant.branch?.name}
                                            fieldKey="branch"
                                            placeholder="Semua Cabang"
                                        />

                                        <div className="sm:col-span-2">
                                            <CorporateInfoRow
                                                label="Alamat Kantor Pusat / Domisili"
                                                value={tenant.company_address}
                                                fieldKey="address"
                                                onCopy={copyText}
                                                copiedKey={copiedKey}
                                                placeholder="Belum ada alamat kantor yang diisi"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION B: Perjanjian Sewa & Unit Aktif */}
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
                                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center shrink-0 border border-slate-200/60">
                                                <IconStorefront className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">Perjanjian Sewa &amp; Unit Operasional</h2>
                                                <p className="text-xs text-slate-500">Masa berlaku kontrak, nilai sewa, termin pembayaran, dan spesifikasi unit</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                            {tenancies.length} Kontrak Terdata
                                        </span>
                                    </div>

                                    {tenancies.length === 0 ? (
                                        <EmptyState
                                            variant="empty"
                                            size="sm"
                                            title="Belum Ada Kontrak Sewa"
                                            description="Tenant ini belum memiliki data perjanjian sewa unit terdaftar di sistem."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {tenancies.map((c) => {
                                                const isActive = c.status === 'active';
                                                const progress = getTenancyProgress(c.start_date, c.end_date);

                                                return (
                                                    <div
                                                        key={c.id}
                                                        className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                                                            isActive
                                                                ? 'border-[#0F1E36]/30 bg-white ring-1 ring-[#0F1E36]/10'
                                                                : 'border-slate-200 bg-slate-50/50'
                                                        }`}
                                                    >
                                                        {/* Unit Header */}
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono text-xl font-bold text-slate-900">
                                                                        Unit {c.unit?.unit_code ?? '—'}
                                                                    </span>
                                                                    <Badge
                                                                        color={isActive ? 'green' : c.status === 'draft' ? 'gray' : 'red'}
                                                                        size="sm"
                                                                    >
                                                                        {isActive ? 'Aktif' : c.status === 'draft' ? 'Draft' : 'Berakhir'}
                                                                    </Badge>
                                                                    {c.is_current && (
                                                                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                                            Sedang Ditempati
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    {[
                                                                        c.unit?.floor ? `Lantai ${c.unit.floor}` : null,
                                                                        c.unit?.block ? `Blok ${c.unit.block}` : null,
                                                                        c.unit?.size ? `${c.unit.size} m²` : null,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(' · ') || 'Lokasi terdaftar'}
                                                                </p>
                                                            </div>

                                                            {c.contract_number && (
                                                                <span className="text-xs text-slate-600 font-mono bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md shrink-0 self-start">
                                                                    {c.contract_number}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Duration timeline */}
                                                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-slate-500">Masa Berlaku Sewa:</span>
                                                                <span className="font-semibold text-slate-800">
                                                                    {formatDateRange(c.start_date, c.end_date)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs mt-1">
                                                                <span className="text-slate-500">Status Waktu:</span>
                                                                <span
                                                                    className={`font-semibold ${
                                                                        c.days_remaining !== null && c.days_remaining < 0
                                                                            ? 'text-red-700'
                                                                            : c.days_remaining !== null && c.days_remaining <= 90
                                                                            ? 'text-amber-700'
                                                                            : 'text-emerald-800'
                                                                    }`}
                                                                >
                                                                    {daysLabel(c.days_remaining)}
                                                                </span>
                                                            </div>

                                                            {isActive && progress !== null && (
                                                                <div className="mt-2.5">
                                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className={`h-1.5 rounded-full ${
                                                                                progress >= 100
                                                                                    ? 'bg-red-500'
                                                                                    : progress >= 80
                                                                                    ? 'bg-amber-500'
                                                                                    : 'bg-[#0F1E36]'
                                                                            }`}
                                                                            style={{ width: `${progress}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                                                        <span>Mulai: {formatDateID(c.start_date)}</span>
                                                                        <span className="font-medium">{progress}% Masa Sewa Berjalan</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Financial details table */}
                                                        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                <dt className="text-[10px] uppercase font-bold text-slate-500">Nilai Sewa</dt>
                                                                <dd className="font-bold text-slate-900 font-mono mt-0.5">
                                                                    {rupiah(c.rent_value)}
                                                                    {c.rent_period && (
                                                                        <span className="font-normal text-slate-500 font-sans">/{c.rent_period}</span>
                                                                    )}
                                                                </dd>
                                                            </div>

                                                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                <dt className="text-[10px] uppercase font-bold text-slate-500">Service Charge</dt>
                                                                <dd className="font-bold text-slate-900 font-mono mt-0.5">{rupiah(c.service_charge)}</dd>
                                                            </div>

                                                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                <dt className="text-[10px] uppercase font-bold text-slate-500">Deposit</dt>
                                                                <dd className="font-bold text-slate-900 font-mono mt-0.5">{rupiah(c.deposit_value)}</dd>
                                                            </div>

                                                            {c.percentage_rent_rate && (
                                                                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                    <dt className="text-[10px] uppercase font-bold text-slate-500">Bagi Hasil</dt>
                                                                    <dd className="font-bold text-slate-900 font-mono mt-0.5">
                                                                        {c.percentage_rent_rate}%
                                                                        {c.percentage_rent_breakpoint && (
                                                                            <span className="block text-[10px] font-normal text-slate-500 font-sans">
                                                                                Break: {rupiah(c.percentage_rent_breakpoint)}
                                                                            </span>
                                                                        )}
                                                                    </dd>
                                                                </div>
                                                            )}

                                                            {c.payment_term && (
                                                                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                    <dt className="text-[10px] uppercase font-bold text-slate-500">Termin</dt>
                                                                    <dd className="font-medium text-slate-800 mt-0.5">{c.payment_term}</dd>
                                                                </div>
                                                            )}

                                                            {c.signed_date && (
                                                                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                                                                    <dt className="text-[10px] uppercase font-bold text-slate-500">Tanggal TTD</dt>
                                                                    <dd className="font-medium text-slate-800 mt-0.5">{formatDateID(c.signed_date)}</dd>
                                                                </div>
                                                            )}
                                                        </dl>

                                                        {c.contract_document_path && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                                <a
                                                                    href={`/storage/${c.contract_document_path}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1E36] hover:text-blue-700 hover:underline min-h-[36px]"
                                                                >
                                                                    <IconExternalLink className="w-3.5 h-3.5" />
                                                                    Buka Dokumen Perjanjian Sewa (PDF) →
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* SECTION C: Direktori Narahubung & Tim PIC */}
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
                                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center shrink-0 border border-slate-200/60">
                                                <IconContract className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">Direktori Narahubung &amp; Tim PIC</h2>
                                                <p className="text-xs text-slate-500">Daftar PIC operasional, pengelola, manajer toko, dan kontak darurat</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                            Total: {totalContacts} Kontak
                                        </span>
                                    </div>

                                    {totalContacts === 0 ? (
                                        <EmptyState
                                            variant="empty"
                                            size="sm"
                                            title="Belum Ada Kontak Narahubung"
                                            description="Belum ada nomor PIC atau narahubung yang didaftarkan untuk tenant ini."
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {Object.entries(contactsByType).map(([type, list]) => (
                                                <div key={type} className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/30">
                                                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                            {type} ({list.length})
                                                        </h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {list.map((c) => {
                                                            const waLink = formatWaLink(c.phone);

                                                            return (
                                                                <div
                                                                    key={c.id}
                                                                    className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs"
                                                                >
                                                                    <div>
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <p className="text-xs font-bold text-slate-900">{c.name}</p>
                                                                            {c.is_primary && (
                                                                                <Badge color="green" size="sm">
                                                                                    Utama
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {c.title && <p className="text-[11px] text-slate-500 mt-0.5">{c.title}</p>}
                                                                    </div>

                                                                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                                                                        {c.phone && (
                                                                            <>
                                                                                <a
                                                                                    href={`tel:${c.phone}`}
                                                                                    className="flex-1 min-h-[34px] px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-200/80"
                                                                                    title="Panggil nomor telepon ini"
                                                                                >
                                                                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                                    </svg>
                                                                                    Telepon
                                                                                </a>
                                                                                {waLink && (
                                                                                    <a
                                                                                        href={waLink}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="flex-1 min-h-[34px] px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-emerald-200/80"
                                                                                        title="Hubungi melalui WhatsApp"
                                                                                    >
                                                                                        WhatsApp
                                                                                    </a>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {c.email && (
                                                                            <a
                                                                                href={`mailto:${c.email}`}
                                                                                className="p-1.5 min-h-[34px] min-w-[34px] rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors border border-slate-200/80"
                                                                                title="Kirim pesan email"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                                </svg>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 2: INSPEKSI SIDAK — SINGLE UNIFIED DATA TABLE CARD   */}
                        {/* ========================================================= */}
                        {activeTab === 'inspections' && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                                {/* Unified Card Toolbar Header (Title + Filters + Search) */}
                                <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">Pemeriksaan &amp; Inspeksi Sidak</h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Log checklist inspeksi berkala, kondisi kepatuhan operasional, dan temuan fisik unit
                                            </p>
                                        </div>

                                        {/* Status Filter Pills */}
                                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSidakFilter('all');
                                                    setSidakPage(1);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    sidakFilter === 'all'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                                    sidakFilter === 'flagged'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    sidakFilter === 'completed'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-1 focus:ring-[#0F1E36] transition-all"
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
                                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                                                    <th className="py-3 px-4">Waktu &amp; Tanggal</th>
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
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                                {/* Unified Card Toolbar Header (Title + Filters + Search) */}
                                <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">Surat Izin Kerja &amp; Aktivitas</h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Pengajuan izin renovasi, fit-out, aktivitas malam, tenaga kerja dan verifikasi material
                                            </p>
                                        </div>

                                        {/* Status Filter Pills */}
                                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPermitFilter('all');
                                                    setPermitPage(1);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    permitFilter === 'all'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                                    permitFilter === 'pending'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    permitFilter === 'completed'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    permitFilter === 'rejected'
                                                        ? 'bg-[#0F1E36] text-white shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
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
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-1 focus:ring-[#0F1E36] transition-all"
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
                                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                                                    <th className="py-3 px-4">No. Izin Kerja</th>
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
                    </main>
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

function CorporateInfoRow({ label, value, fieldKey, onCopy, copiedKey, isTel, isMail, mono, placeholder }) {
    const isCopied = copiedKey === fieldKey;
    return (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 hover:bg-white hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{label}</span>
                {value && onCopy && (
                    <button
                        type="button"
                        onClick={() => onCopy(value, fieldKey)}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            isCopied ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Salin ke papan klip"
                    >
                        {isCopied ? 'Tersalin' : 'Salin'}
                    </button>
                )}
            </div>
            <div className="mt-1">
                {value ? (
                    isTel ? (
                        <a
                            href={`tel:${value}`}
                            className="text-xs font-semibold text-slate-800 hover:text-[#0F1E36] hover:underline"
                        >
                            {value}
                        </a>
                    ) : isMail ? (
                        <a
                            href={`mailto:${value}`}
                            className="text-xs font-semibold text-slate-800 hover:text-[#0F1E36] hover:underline truncate block"
                        >
                            {value}
                        </a>
                    ) : (
                        <p className={`text-xs text-slate-800 ${mono ? 'font-mono font-bold' : 'font-medium'}`}>{value}</p>
                    )
                ) : (
                    <p className="text-xs text-slate-400 italic">{placeholder ?? 'Belum diisi'}</p>
                )}
            </div>
        </div>
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
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100">
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
                    <p className="text-[10px] uppercase tracking-wide text-amber-800 font-bold">Kontraktor Eksternal</p>
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
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1.5">Daftar Tenaga Kerja</p>
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
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1.5">Daftar Material &amp; Peralatan</p>
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
