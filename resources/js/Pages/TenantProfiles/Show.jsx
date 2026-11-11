import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import EmptyState from '@/Components/EmptyState';
import { formatDateID, formatDateRange, formatTimeRange } from '@/utils/format';
import initials from '@/utils/initials';
import {
    IconClipboard,
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

/* ───────── Inline SVG Icons ───────── */
const IconPhone = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

const IconMail = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const IconWhatsApp = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const IconBuilding = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
);

const IconDocument = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const IconMapPin = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const IconCopy = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const IconCheck = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const IconChevronDown = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const IconQrCode = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h2.25v2.25H13.5V13.5zm3 0h2.25v2.25H16.5V13.5zm-3 3h2.25v2.25H13.5V16.5zm3 0h2.25v2.25H16.5V16.5zm-1.5-3v-2.25h2.25V13.5H15z" />
    </svg>
);

const IconEdit = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const IconSearch = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const IconChevronLeft = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const IconChevronRight = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true" {...p}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

/* ───────── Numbered Pagination Helper ───────── */
function NumberedPagination({ page, totalPages, totalItems, pageSize, onPageChange, itemName = 'inspeksi' }) {
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalItems);

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        // Always show first page
        pages.push(1);

        let start = Math.max(2, page - 2);
        let end = Math.min(totalPages - 1, page + 2);

        // Adjust if we're near the edges
        if (page <= 4) {
            end = Math.min(totalPages - 1, maxVisible - 1);
        }
        if (page >= totalPages - 3) {
            start = Math.max(2, totalPages - (maxVisible - 2));
        }

        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');

        // Always show last page
        pages.push(totalPages);

        return pages;
    };

    return (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
                Menampilkan{' '}
                <strong className="text-slate-900 font-mono">{startItem}</strong> –{' '}
                <strong className="text-slate-900 font-mono">{endItem}</strong>{' '}
                dari <strong className="text-slate-900 font-mono">{totalItems}</strong>{' '}
                {itemName}
            </span>

            <div className="flex items-center gap-1">
                {/* Prev button */}
                <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Halaman sebelumnya"
                >
                    <IconChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers().map((p, idx) =>
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                                p === page
                                    ? 'bg-[#0F1E36] text-white'
                                    : 'hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next button */}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Halaman selanjutnya"
                >
                    <IconChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

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
    const [sidakFilter, setSidakFilter] = useState('all');
    const [sidakPage, setSidakPage] = useState(1);

    const [permitSearch, setPermitSearch] = useState('');
    const [permitFilter, setPermitFilter] = useState('all');
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
        { key: 'legal_entity_name', label: 'Badan Hukum', icon: 'building' },
        { key: 'company_phone', label: 'Telepon', icon: 'phone' },
        { key: 'company_email', label: 'Email', icon: 'mail' },
        { key: 'npwp_number', label: 'NPWP', icon: 'document' },
        { key: 'siup_number', label: 'SIUP/NIB', icon: 'document' },
        { key: 'branch_name', label: 'Cabang', icon: 'building' },
        { key: 'company_address', label: 'Alamat', icon: 'mapPin' },
    ];
    const legalFields = [
        { key: 'legal_entity_name', label: 'Badan Hukum', icon: 'building', copyable: true },
        { key: 'company_phone', label: 'Telepon', icon: 'phone', isTel: true, copyable: true },
        { key: 'company_email', label: 'Email', icon: 'mail', isMail: true, copyable: true },
        { key: 'npwp_number', label: 'NPWP', icon: 'document', mono: true, copyable: true },
        { key: 'siup_number', label: 'SIUP/NIB', icon: 'document', mono: true, copyable: true },
        { key: 'branch_value', label: 'Cabang', icon: 'building' },
        { key: 'company_address', label: 'Alamat', icon: 'mapPin', copyable: true },
    ];
    const completeness = legalFields.filter((f) => {
        const val = f.key === 'branch_value' ? tenant.branch?.name : tenant[f.key];
        return val;
    }).length;

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
        if (days === null || days === undefined) return 'text-white';
        if (days < 0) return 'text-red-400';
        if (days <= 90) return 'text-amber-400';
        return 'text-white';
    };

    const tabs = [
        { key: 'profile', label: 'Profil' },
        { key: 'inspections', label: 'Sidak', count: inspections.length },
        { key: 'permits', label: 'Izin', count: permits.length },
    ];

    /* ───────── Helper: render icon by name ───────── */
    const renderIcon = (name, className = 'w-[18px] h-[18px]') => {
        const cls = className;
        switch (name) {
            case 'building': return <IconBuilding className={cls} />;
            case 'phone': return <IconPhone className={cls} />;
            case 'mail': return <IconMail className={cls} />;
            case 'document': return <IconDocument className={cls} />;
            case 'mapPin': return <IconMapPin className={cls} />;
            default: return <IconDocument className={cls} />;
        }
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex-1 max-w-7xl w-full mx-auto space-y-5">

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* SECTION 1: HEADER HERO — White Card with Subtle Depth   */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <section className="bg-[#0F1E36] rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            {/* Left: Logo + Name + Meta + Quick Actions */}
                            <div className="flex gap-4 min-w-0">
                                {/* Logo */}
                                {tenant.logo_url ? (
                                    <img
                                        src={tenant.logo_url}
                                        alt={`Logo ${tenant.name}`}
                                        className="w-[120px] h-[120px] shrink-0 rounded-2xl border border-white/20 bg-white p-2.5 object-contain"
                                    />
                                ) : (
                                    <div
                                        className="flex w-[120px] h-[120px] shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-bold text-white"
                                        aria-hidden="true"
                                    >
                                        {initials(tenant.name)}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    {/* Name row */}
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-2xl font-bold text-white tracking-tight truncate">{tenant.name}</h1>
                                        <span className="flex items-center gap-1.5 text-xs font-medium">
                                            <span className={`w-2 h-2 rounded-full ${tenant.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                            <span className={tenant.is_active ? 'text-emerald-300' : 'text-slate-400'}>
                                                {tenant.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Meta pill badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {tenant.tenant_category?.name && (
                                            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {tenant.tenant_category.name}
                                            </span>
                                        )}
                                        {tenant.product_category?.name && (
                                            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {tenant.product_category.name}
                                            </span>
                                        )}
                                        {tenant.branch?.name && (
                                            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {tenant.branch.name}
                                            </span>
                                        )}
                                        {tenant.legal_entity_name && (
                                            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[200px]">
                                                {tenant.legal_entity_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Action Bar — only if primaryContact exists */}
                                    {primaryContact && (
                                        <div className="flex items-center gap-2 mt-3">
                                            {primaryContact.phone && (
                                                <a
                                                    href={`tel:${primaryContact.phone}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white"
                                                    title={`Telepon ${primaryContact.phone}`}
                                                >
                                                    <IconPhone className="w-[18px] h-[18px]" />
                                                    <span className="hidden sm:inline">{primaryContact.phone}</span>
                                                    <span className="sm:hidden">Telepon</span>
                                                </a>
                                            )}
                                            {primaryContact.phone && (() => { const wa = formatWaLink(primaryContact.phone); return wa ? (
                                                <a
                                                    href={wa}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-300 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white"
                                                    title="WhatsApp"
                                                >
                                                    <IconWhatsApp className="w-[18px] h-[18px]" />
                                                    <span className="hidden sm:inline">WhatsApp</span>
                                                </a>
                                            ) : null; })()}
                                            {primaryContact.email && (
                                                <a
                                                    href={`mailto:${primaryContact.email}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white"
                                                    title={`Email ${primaryContact.email}`}
                                                >
                                                    <IconMail className="w-[18px] h-[18px]" />
                                                    <span className="hidden sm:inline">{primaryContact.email}</span>
                                                    <span className="sm:hidden">Email</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: QR button + Kelola master */}
                            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                                {unitQr && (
                                    <button
                                        type="button"
                                        onClick={() => setQrModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-white backdrop-blur-sm"
                                    >
                                        <IconQrCode className="w-4 h-4" />
                                        QR Unit
                                    </button>
                                )}
                                <Link
                                    href={`/tenants?search=${encodeURIComponent(tenant.name)}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-white backdrop-blur-sm"
                                >
                                    <IconEdit className="w-3.5 h-3.5" />
                                    Kelola master
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Stat Grid — 4 individual stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 pt-0 sm:px-6 sm:pb-6">
                        {/* Card 1 — Unit Aktif */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:-translate-y-0.5 hover:bg-white/15 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                                <IconBuilding className="w-5 h-5 text-white/50" />
                                <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">Unit aktif</span>
                            </div>
                            <p className="text-xl font-bold font-mono tabular-nums text-white">
                                {activeTenancy?.unit?.unit_code ?? '—'}
                            </p>
                        </div>

                        {/* Card 2 — Sisa Sewa */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:-translate-y-0.5 hover:bg-white/15 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">Sisa sewa</span>
                            </div>
                            <p className={`text-xl font-bold font-mono tabular-nums ${leaseTone(activeTenancy?.days_remaining).replace('text-slate', 'text').replace('text-red', 'text-red').replace('text-amber', 'text-amber')}`}>
                                {activeTenancy?.days_remaining !== undefined && activeTenancy?.days_remaining !== null
                                    ? `${activeTenancy.days_remaining} hari`
                                    : '—'}
                            </p>
                        </div>

                        {/* Card 3 — Sidak */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:-translate-y-0.5 hover:bg-white/15 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                                <IconClipboard className="w-5 h-5 text-white/50" />
                                <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">Sidak</span>
                            </div>
                            <p className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                                {completedSidak}<span className="text-sm font-normal text-white/40">/{inspections.length}</span>
                                {flaggedSidak > 0 && <span className="ml-2 text-sm font-normal text-red-400">{flaggedSidak} temuan</span>}
                            </p>
                        </div>

                        {/* Card 4 — Izin */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:-translate-y-0.5 hover:bg-white/15 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">Izin</span>
                            </div>
                            <p className={`text-xl font-bold font-mono tabular-nums ${pendingPermits > 0 ? 'text-amber-300' : 'text-blue-300'}`}>
                                {pendingPermits}<span className="text-sm font-normal text-white/40">/{permits.length}</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* SECTION 2: TAB NAVIGATION — Segmented Pill Style         */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div role="tablist" aria-label="Data tenant" className="flex justify-start">
                    <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1">
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
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                        selected
                                            ? 'bg-white shadow-sm text-[#0F1E36]'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                                            selected ? 'bg-slate-200/70 text-slate-500' : 'bg-slate-200/50 text-slate-400'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TAB PANELS                                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="mt-5">
                    {/* ─────────── TAB: PROFIL ─────────── */}
                    {activeTab === 'profile' && (
                        <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="space-y-5">

                            {/* ---- LEGALITAS SECTION ---- */}
                            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Section header with progress bar */}
                                <div className="p-5 pb-4 space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <h2 className="text-base font-bold text-slate-900">Legalitas</h2>
                                        <p className="text-xs text-slate-500 font-medium">{completeness} dari 6 field terisi</p>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="bg-[#0F1E36] h-full rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${(completeness / 6) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* 2-Column Card Grid */}
                                <div className="px-5 pb-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {legalFields.map((field) => {
                                            const value = field.key === 'branch_value' ? tenant.branch?.name : tenant[field.key];
                                            const isEmpty = !value;
                                            const isCopied = copiedKey === field.key;

                                            return (
                                                <div
                                                    key={field.key}
                                                    className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        {renderIcon(field.icon)}
                                                        <span className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold block">
                                                            {field.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isEmpty ? (
                                                            <span className="text-slate-300 italic text-sm">Belum diisi</span>
                                                        ) : field.isTel ? (
                                                            <a
                                                                href={`tel:${value}`}
                                                                className="text-sm font-medium text-[#0F1E36] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                                            >
                                                                {value}
                                                            </a>
                                                        ) : field.isMail ? (
                                                            <a
                                                                href={`mailto:${value}`}
                                                                className="text-sm font-medium text-[#0F1E36] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] truncate max-w-[220px]"
                                                            >
                                                                {value}
                                                            </a>
                                                        ) : (
                                                            <span className={`text-sm font-medium text-slate-900 ${field.mono ? 'font-mono' : ''} ${!field.copyable ? 'truncate block max-w-[220px]' : ''}`}>
                                                                {value}
                                                            </span>
                                                        )}
                                                        {value && field.copyable && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(value, field.key)}
                                                                className={`shrink-0 p-1 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                                    isCopied
                                                                        ? 'text-emerald-600 bg-emerald-50'
                                                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                                }`}
                                                                title={isCopied ? 'Tersalin!' : 'Salin'}
                                                            >
                                                                {isCopied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>

                            {/* ---- KONTRAK SECTION ---- */}
                            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <h2 className="text-base font-bold text-slate-900">Kontrak</h2>
                                </div>
                                <div className="p-5 pt-0 divide-y divide-slate-100">
                                    {tenancies.length === 0 ? (
                                        <div className="p-8">
                                            <EmptyState variant="empty" size="sm" title="Belum ada kontrak" description="Tenant ini belum memiliki perjanjian sewa." />
                                        </div>
                                    ) : (
                                        tenancies.map((c) => <ContractCard key={c.id} contract={c} />)
                                    )}
                                </div>
                            </section>

                            {/* ---- NARAHUBUNG SECTION ---- */}
                            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <h2 className="text-base font-bold text-slate-900">Narahubung</h2>
                                </div>
                                <div className="p-5 pt-0">
                                    {totalContacts === 0 ? (
                                        <div className="p-8">
                                            <EmptyState variant="empty" size="sm" title="Belum ada narahubung" description="Belum ada kontak yang didaftarkan untuk tenant ini." />
                                        </div>
                                    ) : (
                                        Object.entries(contactsByType).map(([type, list]) => (
                                            <div key={type}>
                                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-5 first:mt-0 mb-2">
                                                    {type}
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {list.map((contact) => (
                                                        <ContactCard key={contact.id} contact={contact} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ─────────── TAB: SIDAK ─────────── */}
                    {activeTab === 'inspections' && (
                        <div role="tabpanel" id="panel-inspections" aria-labelledby="tab-inspections" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Header section */}
                            <div className="p-4 border-b border-slate-200 space-y-3">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <h2 className="text-base font-bold text-slate-900">Inspeksi sidak</h2>

                                    <div className="flex w-fit shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => { setSidakFilter('all'); setSidakPage(1); }}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                sidakFilter === 'all'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Semua ({inspections.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSidakFilter('flagged'); setSidakPage(1); }}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                sidakFilter === 'flagged'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Ada Temuan ({flaggedSidak})
                                            {flaggedSidak > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSidakFilter('completed'); setSidakPage(1); }}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                sidakFilter === 'completed'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Selesai ({completedSidak})
                                        </button>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        value={sidakSearch}
                                        onChange={(e) => { setSidakSearch(e.target.value); setSidakPage(1); }}
                                        placeholder="Cari berdasarkan nama template, nama petugas, atau status inspeksi..."
                                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-2 focus:ring-[#0F1E36]/10 transition-colors"
                                    />
                                    <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            {/* Table body */}
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
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80">
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Tanggal</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Template</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Petugas</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Hasil Checklist</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedInspections.map((i) => (
                                                    <tr
                                                        key={i.id}
                                                        onClick={() => openSidakModal(i)}
                                                        className={`py-4 px-4 hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                                                            i.is_flagged ? 'border-l-2 border-red-400' : ''
                                                        }`}
                                                        title="Klik baris untuk membuka rincian hasil sidak"
                                                    >
                                                        <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                                                            {i.session_started_at ? formatDateID(i.session_started_at) : '—'}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-900 group-hover:text-[#0F1E36] transition-colors text-sm">
                                                                    {i.template_name}
                                                                </span>
                                                                {i.is_flagged && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                                        Temuan
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap text-slate-700 text-sm">
                                                            {i.session_officer || '—'}
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-600 text-sm">
                                                            <span className="font-bold text-slate-800">{i.answered}</span>/{i.total} Terjawab
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap">
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

                                    {/* Numbered pagination */}
                                    {filteredInspections.length > PAGE_SIZE && (
                                        <NumberedPagination
                                            page={sidakPage}
                                            totalPages={sidakTotalPages}
                                            totalItems={filteredInspections.length}
                                            pageSize={PAGE_SIZE}
                                            onPageChange={setSidakPage}
                                            itemName="inspeksi"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ─────────── TAB: IZIN ─────────── */}
                    {activeTab === 'permits' && (
                        <div role="tabpanel" id="panel-permits" aria-labelledby="tab-permits" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Header section */}
                            <div className="p-4 border-b border-slate-200 space-y-3">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <h2 className="text-base font-bold text-slate-900">Surat izin kerja</h2>

                                    <div className="flex w-fit shrink-0 flex-wrap items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => { setPermitFilter('all'); setPermitPage(1); }}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                permitFilter === 'all'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Semua ({permits.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setPermitFilter('pending'); setPermitPage(1); }}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                permitFilter === 'pending'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Antre Approval ({pendingPermits})
                                            {pendingPermits > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setPermitFilter('completed'); setPermitPage(1); }}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                permitFilter === 'completed'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Disetujui
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setPermitFilter('rejected'); setPermitPage(1); }}
                                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                                permitFilter === 'rejected'
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            Ditolak
                                        </button>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        value={permitSearch}
                                        onChange={(e) => { setPermitSearch(e.target.value); setPermitPage(1); }}
                                        placeholder="Cari berdasarkan nomor permit, jenis pekerjaan, PIC lapangan, atau vendor..."
                                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0F1E36] focus:ring-2 focus:ring-[#0F1E36]/10 transition-colors"
                                    />
                                    <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            {/* Table body */}
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
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80">
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">No. izin</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Pekerjaan &amp; Vendor</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Jadwal</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Tenaga Kerja</th>
                                                    <th className="py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedPermits.map((p) => (
                                                    <tr
                                                        key={p.id}
                                                        onClick={() => openPermitModal(p)}
                                                        className={`py-4 px-4 hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                                                            p.status === 'pending' ? 'border-l-2 border-amber-400' : ''
                                                        }`}
                                                        title="Klik baris untuk membuka rincian surat izin kerja"
                                                    >
                                                        <td className="py-4 px-4 whitespace-nowrap font-mono font-bold text-slate-900 group-hover:text-[#0F1E36] transition-colors text-sm">
                                                            {p.permit_number}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="font-semibold text-slate-800 text-sm">{p.job_type || 'Pekerjaan Umum'}</div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-sm">
                                                                {p.is_external ? `Vendor: ${p.contractor_company || 'Eksternal'}` : `PIC: ${p.pic_name || 'Internal'}`}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap text-slate-600 text-sm">
                                                            {formatDateRange(p.work_start_date, p.work_end_date)}
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-700 text-sm">
                                                            {p.workers_total ?? 0} Pekerja
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap">
                                                            <Badge color={permitColor[p.status] ?? 'gray'} size="sm">
                                                                {permitLabel[p.status] ?? p.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Numbered pagination */}
                                    {filteredPermits.length > PAGE_SIZE && (
                                        <NumberedPagination
                                            page={permitPage}
                                            totalPages={permitTotalPages}
                                            totalItems={filteredPermits.length}
                                            pageSize={PAGE_SIZE}
                                            onPageChange={setPermitPage}
                                            itemName="surat izin"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODAL 1: Detail Hasil Inspeksi Sidak                       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {modalSidak && (
                <Modal
                    open={!!modalSidak}
                    onClose={() => setModalSidak(null)}
                    title={`Hasil Sidak — ${modalSidak.template_name}`}
                    icon={<IconClipboard className="w-4 h-4 text-[#0F1E36]" />}
                    maxWidth="max-w-3xl"
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

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODAL 2: Detail Surat Izin Kerja                           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {modalPermit && (
                <Modal
                    open={!!modalPermit}
                    onClose={() => setModalPermit(null)}
                    title={`Surat Izin Kerja — ${modalPermit.permit_number}`}
                    icon={<svg className="w-4 h-4 text-[#0F1E36]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
                    maxWidth="max-w-3xl"
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

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODAL 3: Perbesar & Cetak QR Code Unit                     */}
            {/* ═══════════════════════════════════════════════════════════ */}
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

/* ═══════════════════════════════════════════════════════════════════════ */
/* CONTRACT CARD — Replaces old ContractRow table row                  */
/* ═══════════════════════════════════════════════════════════════════════ */
function ContractCard({ contract: c }) {
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
        ? 'text-red-600'
        : leaseLeft !== null && leaseLeft !== undefined && leaseLeft <= 90
            ? 'text-amber-600'
            : 'text-slate-700';

    const progressColor = progress >= 100 ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-[#0F1E36]';

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
            {/* Card Header — clickable to expand */}
            <div
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
                tabIndex={0}
                role="button"
                aria-expanded={open}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div>
                        <p className="font-mono font-bold text-lg text-slate-900">{c.unit?.unit_code ?? '—'}</p>
                        <p className="text-slate-500 text-sm">{location || '—'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Badge color={statusColor} size="sm">{statusLabel}</Badge>
                    <IconChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Progress bar for active contracts */}
            {isActive && progress !== null && (
                <div className="px-4 pb-0">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`${progressColor} h-full rounded-full transition-all duration-300`} style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Summary row below header */}
            <div className="px-4 pb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <span>{formatDateRange(c.start_date, c.end_date)}</span>
                <span className={leaseClass}>{daysLabel(c.days_remaining)}</span>
                {c.rent_value && <span className="font-mono">{rupiah(c.rent_value)}{c.rent_period && <span className="text-slate-400 font-sans"> / {c.rent_period}</span>}</span>}
            </div>

            {/* Expanded detail — collapsible */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 mt-0 pt-3">
                    {isActive && progress !== null && (
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-500">Progress masa sewa</span>
                                <span className="text-xs font-mono font-bold text-slate-700">{progress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={`${progressColor} h-full rounded-full`} style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        {facts.map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-4 py-1.5">
                                <dt className="text-sm text-slate-500 shrink-0">{label}</dt>
                                <dd className="text-sm text-slate-900 font-medium text-right">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    {c.contract_document_path && (
                        <a
                            href={`/storage/${c.contract_document_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#0F1E36] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#0F1E36] font-medium"
                        >
                            <IconExternalLink className="h-3.5 w-3.5" />
                            Dokumen perjanjian
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* CONTACT CARD — Replaces old table row for contacts                   */
/* ═══════════════════════════════════════════════════════════════════════ */
function ContactCard({ contact: c }) {
    const waLink = formatWaLink(c.phone);

    return (
        <div className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all duration-200 relative ${
            c.is_primary ? 'border-l-[3px] border-l-emerald-500' : ''
        }`}>
            {/* Top row: Avatar + Name + Badge */}
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#0F1E36] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initials(c.name)}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                        {c.is_primary && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                Utama
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{c.title || '—'}</p>
                </div>
            </div>

            {/* Action buttons row */}
            <div className="flex gap-2 mt-3">
                {c.phone && (
                    <a
                        href={`tel:${c.phone}`}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        title={`Telepon ${c.phone}`}
                    >
                        <IconPhone className="w-[18px] h-[18px]" />
                    </a>
                )}
                {waLink && (
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        title="WhatsApp"
                    >
                        <IconWhatsApp className="w-[18px] h-[18px]" />
                    </a>
                )}
                {c.email && (
                    <a
                        href={`mailto:${c.email}`}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        title={`Email ${c.email}`}
                    >
                        <IconMail className="w-[18px] h-[18px]" />
                    </a>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* HELPER COMPONENTS (preserved from original)                          */
/* ═══════════════════════════════════════════════════════════════════════ */

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
