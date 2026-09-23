import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { useState, useRef } from 'react';
import FormSection from '@/Components/Form/FormSection';
import Badge from '@/Components/Badge';
import { formatDateID, formatDateRange, formatTimeRange } from '@/utils/format';

const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const sidakColor = { draft: 'gray', completed: 'green' };
const sidakLabel = { draft: 'Draft', completed: 'Selesai' };
const permitColor = { pending: 'yellow', completed: 'green', rejected: 'red' };
const permitLabel = { pending: 'Antre', completed: 'Selesai', rejected: 'Ditolak' };

const rupiah = (v) => v === null || v === undefined || v === '' ? '—' : `Rp ${Number(v).toLocaleString('id-ID')}`;

function daysLabel(days) {
    if (days === null || days === undefined) return 'Tanpa batas waktu';
    if (days < 0) return `Berakhir ${Math.abs(days)} hari lalu`;
    if (days === 0) return 'Berakhir hari ini';
    return `${days} hari tersisa`;
}

const detailTabs = [
    { key: 'ringkasan', label: 'Ringkasan' },
    { key: 'kontrak', label: 'Unit & Kontrak' },
    { key: 'sidak', label: 'Sidak' },
    { key: 'izin', label: 'Izin' },
    { key: 'kontak', label: 'Kontak' },
];

export default function Show({ tenant, tenancies = [], inspections = [], permits = [], contactsByType = {}, unitQr, filters = {} }) {
    const [activeTab, setActiveTab] = useState('ringkasan');
    const [expandedSidakId, setExpandedSidakId] = useState(null);
    const [sidakCache, setSidakCache] = useState({});
    const [sidakLoading, setSidakLoading] = useState(false);
    const [expandedPermitId, setExpandedPermitId] = useState(null);
    const [permitCache, setPermitCache] = useState({});
    const [permitLoading, setPermitLoading] = useState(false);
    const tabRefs = useRef({});

    const onTabKeyDown = (e, idx) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (idx + (e.key === 'ArrowRight' ? 1 : detailTabs.length - 1)) % detailTabs.length;
        setActiveTab(detailTabs[next].key);
        tabRefs.current[detailTabs[next].key]?.focus();
    };

    const backHref = `/tenant-profiles${toQuery(filters)}`;
    const activeTenancy = tenant.active_tenancy ?? tenancies.find((t) => t.status === 'active');
    const unitCode = activeTenancy?.unit?.unit_code ?? '—';
    const completedSidak = inspections.filter((i) => i.status === 'completed').length;
    const flaggedSidak = inspections.filter((i) => i.is_flagged).length;
    const pendingPermits = permits.filter((p) => p.status === 'pending').length;
    const completeness = ['npwp_number', 'siup_number', 'company_phone', 'company_email', 'company_address', 'legal_entity_name']
        .filter((k) => tenant[k]).length;

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors w-fit rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali ke Profile Tenant
                </Link>

                <div className="mt-3 bg-[#0F1E36] text-white rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                            {tenant.logo_url ? (
                                <img src={tenant.logo_url} alt={`Logo ${tenant.name}`} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white object-contain p-2 shrink-0" />
                            ) : (
                                <span className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 text-white text-2xl sm:text-3xl font-bold flex items-center justify-center shrink-0" aria-hidden="true">{initials(tenant.name)}</span>
                            )}
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{tenant.name}</h1>
                                {tenant.legal_entity_name && <p className="text-xs text-white/60 truncate mt-0.5">{tenant.legal_entity_name}</p>}
                                <p className="text-sm text-white/80 mt-1 font-mono">{unitCode}</p>
                            </div>
                        </div>
                        {unitQr && (
                            <div className="flex sm:flex-col items-center gap-2 shrink-0 bg-white rounded-xl p-2.5 w-fit">
                                <img src={unitQr} alt={`QR ${unitCode}`} className="w-20 h-20" loading="lazy" />
                                <p className="text-[10px] text-gray-500 font-mono">Scan unit</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        <Badge color={tenant.is_active ? 'green' : 'gray'} variant="soft" size="sm">{tenant.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                        {tenant.tenant_category?.name && <Badge color="coral" variant="soft" size="sm">{tenant.tenant_category.name}</Badge>}
                        {tenant.product_category?.name && <Badge color="blue" variant="soft" size="sm">{tenant.product_category.name}</Badge>}
                        {tenant.branch?.name && <Badge color="gray" variant="soft" size="sm">{tenant.branch.name}</Badge>}
                        <Badge color={completeness >= 5 ? 'green' : 'yellow'} variant="soft" size="sm">Data {completeness}/6 lengkap</Badge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <Stat label="Kontrak" value={tenancies.length} />
                        <Stat label="Sidak Selesai" value={completedSidak} alert={flaggedSidak > 0} sub={flaggedSidak > 0 ? `${flaggedSidak} perhatian` : null} />
                        <Stat label="Izin Antre" value={pendingPermits} />
                        <Stat label="Total Izin" value={permits.length} />
                    </dl>
                    <Link
                        href={`/tenants?search=${encodeURIComponent(tenant.name)}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors rounded focus-visible:outline-2 focus-visible:outline-white min-h-[44px]"
                    >
                        Edit di Master Tenant →
                    </Link>
                </div>

                <div className="sticky top-14 z-10 mt-4 bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-1.5">
                    <div className="flex gap-1 overflow-x-auto bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Detail tenant">
                        {detailTabs.map((t, idx) => {
                            const count = t.key === 'kontrak' ? tenancies.length : t.key === 'sidak' ? inspections.length : t.key === 'izin' ? permits.length : null;
                            const dot = t.key === 'sidak' && flaggedSidak > 0 ? 'bg-red-500' : t.key === 'izin' && pendingPermits > 0 ? 'bg-amber-500' : null;
                            const selected = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    ref={(el) => { tabRefs.current[t.key] = el; }}
                                    role="tab"
                                    aria-selected={selected}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setActiveTab(t.key)}
                                    onKeyDown={(e) => onTabKeyDown(e, idx)}
                                    className={`flex-1 min-w-[96px] min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${selected ? 'bg-white shadow-sm text-[#0F1E36]' : 'text-gray-500 hover:text-gray-800 active:bg-gray-200/60'}`}
                                >
                                    {t.label}
                                    {count !== null && <span className="tabular-nums text-[11px] opacity-70">{count}</span>}
                                    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4" role="tabpanel" aria-label={detailTabs.find((t) => t.key === activeTab)?.label}>
                    {activeTab === 'ringkasan' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                            <FormSection title="Identitas & Legalitas">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <InfoRow label="Badan hukum" value={tenant.legal_entity_name} />
                                    <InfoRow label="Telepon" value={tenant.company_phone} />
                                    <InfoRow label="Email" value={tenant.company_email} />
                                    <InfoRow label="Alamat" value={tenant.company_address} full />
                                    <InfoRow label="NPWP" value={tenant.npwp_number} mono missing="Belum diisi" />
                                    <InfoRow label="SIUP" value={tenant.siup_number} mono missing="Belum diisi" />
                                </div>
                            </FormSection>

                            <div className="space-y-4">
                                <FormSection title="Unit Aktif">
                                    {activeTenancy ? (
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold text-gray-900 font-mono">{activeTenancy.unit?.unit_code ?? '—'}</p>
                                                <Badge color="green" size="sm">Aktif</Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{formatDateRange(activeTenancy.start_date, activeTenancy.end_date)}</p>
                                        </div>
                                    ) : (
                                        <Empty text="Tanpa unit aktif." />
                                    )}
                                </FormSection>

                                <FormSection title={`Sidak Terakhir (${inspections.length})`}>
                                    <MiniList
                                        empty={inspections.length === 0}
                                        emptyText="Belum pernah disidak."
                                        items={inspections.slice(0, 2).map((i) => ({
                                            title: i.template_name,
                                            sub: `${i.session_started_at ? formatDateID(i.session_started_at) : '—'} · ${i.answered}/${i.total} terjawab`,
                                            badge: <Badge color={i.session_status === 'in_progress' ? 'yellow' : sidakColor[i.status] ?? 'gray'} size="sm">{i.session_status === 'in_progress' ? 'Penyidakan' : sidakLabel[i.status] ?? i.status}</Badge>,
                                        }))}
                                    />
                                    {inspections.length > 2 && <TabLink onClick={() => setActiveTab('sidak')} label={`Lihat semua ${inspections.length} sidak →`} />}
                                </FormSection>

                                <FormSection title={`Izin Terakhir (${permits.length})`}>
                                    <MiniList
                                        empty={permits.length === 0}
                                        emptyText="Belum ada surat izin."
                                        items={permits.slice(0, 2).map((p) => ({
                                            title: p.permit_number,
                                            mono: true,
                                            sub: `${p.job_type ?? '—'} — ${p.request_date ? formatDateID(p.request_date) : '—'}`,
                                            badge: <Badge color={permitColor[p.status] ?? 'gray'} size="sm">{permitLabel[p.status] ?? p.status}</Badge>,
                                        }))}
                                    />
                                    {permits.length > 2 && <TabLink onClick={() => setActiveTab('izin')} label={`Lihat semua ${permits.length} izin →`} />}
                                </FormSection>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kontak' && (
                        <FormSection title="Kontak & Akses Portal">
                            {Object.keys(contactsByType).length === 0 && <Empty text="Belum ada kontak." />}
                            {Object.entries(contactsByType).map(([type, list]) => (
                                <div key={type} className="mb-3 last:mb-0">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">{type}</p>
                                    <div className="space-y-1.5">
                                        {list.map((c) => (
                                            <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
                                                <p className="text-xs font-semibold text-gray-900">{c.name} <span className="font-normal text-gray-400">· {c.position || '—'}</span></p>
                                                <p className="text-xs text-gray-500 mt-0.5">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 mt-2">
                                <p className="text-[10px] uppercase tracking-wide text-gray-400">Akun portal tenant</p>
                                {tenant.tenant_user ? (
                                    <p className="text-xs text-gray-800 mt-0.5 font-mono">{tenant.tenant_user.username} · {tenant.tenant_user.is_active ? 'Aktif' : 'Nonaktif'}</p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-0.5">Belum punya akun portal</p>
                                )}
                            </div>
                        </FormSection>
                    )}

                    {activeTab === 'kontrak' && (
                        <FormSection title={`Unit & Kontrak (${tenancies.length})`}>
                    {tenancies.length === 0 && <Empty text="Belum ada kontrak." />}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                        {tenancies.map((c) => (
                            <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-gray-900 font-mono">{c.unit?.unit_code ?? '—'}</p>
                                    <Badge color={c.status === 'active' ? 'green' : c.status === 'draft' ? 'gray' : c.status === 'ended' ? 'yellow' : 'red'} size="sm">
                                        {c.status === 'active' ? 'Aktif' : c.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{formatDateRange(c.start_date, c.end_date)}</p>
                                <p className={`text-xs mt-0.5 font-medium ${c.days_remaining !== null && c.days_remaining < 0 ? 'text-red-600' : c.days_remaining !== null && c.days_remaining <= 90 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {daysLabel(c.days_remaining)}
                                </p>
                                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                    <Money label="Sewa" value={c.rent_value} period={c.rent_period} />
                                    <Money label="Service charge" value={c.service_charge} />
                                    <Money label="Deposit" value={c.deposit_value} />
                                    <Money label="Bagi hasil" value={c.percentage_rent_rate ? `${c.percentage_rent_rate}%` : null} sub={c.percentage_rent_breakpoint ? `Breakpoint ${rupiah(c.percentage_rent_breakpoint)}` : null} raw />
                                    <InfoMini label="Termin" value={c.payment_term} />
                                    <InfoMini label="TTD" value={c.signed_date ? formatDateID(c.signed_date) : null} />
                                </dl>
                                {(c.unit?.size || c.unit?.floor) && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        {[c.unit?.size ? `${c.unit.size} m²` : null, c.unit?.floor ? `Lt. ${c.unit.floor}` : null, c.unit?.block ? `Blok ${c.unit.block}` : null].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                                {c.notes && <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 mt-2 whitespace-pre-wrap">{c.notes}</p>}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {c.contract_number && <span className="text-[11px] text-gray-400 font-mono">{c.contract_number}</span>}
                                    {c.contract_document_path && (
                                        <a href={`/storage/${c.contract_document_path}`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[#2F6FED] hover:underline rounded">Lihat dokumen →</a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                        </FormSection>
                    )}

                    {activeTab === 'sidak' && (
                        <FormSection title={`Riwayat Sidak (${inspections.length})`}>
                    {inspections.length === 0 && <Empty text="Belum pernah disidak." />}
                    <div className="space-y-2">
                        {inspections.map((i) => {
                            const open = expandedSidakId === i.id;
                            const cached = sidakCache[i.id];
                            return (
                                <div key={i.id} className={`rounded-xl border transition-colors ${open ? 'border-[#0F1E36]/30 bg-blue-50/30' : 'border-gray-100 bg-gray-50/60'}`}>
                                    <button
                                        onClick={() => toggleSidak(i.id)}
                                        aria-expanded={open}
                                        className="w-full text-left px-4 py-3.5 min-h-[56px] focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded-xl"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{i.template_name}</p>
                                            <span className="flex items-center gap-1.5 shrink-0">
                                                <Badge color={i.session_status === 'in_progress' ? 'yellow' : sidakColor[i.status] ?? 'gray'} size="sm">
                                                    {i.session_status === 'in_progress' ? 'Penyidakan' : sidakLabel[i.status] ?? i.status}
                                                </Badge>
                                                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {i.session_started_at ? formatDateID(i.session_started_at) : '—'}
                                            {i.session_officer ? ` · Petugas ${i.session_officer}` : ''} · {i.answered}/{i.total} terjawab
                                            {i.is_flagged ? ' · ⚠ Perlu perhatian' : ''}
                                        </p>
                                    </button>
                                    {open && (
                                        <div className="px-4 pb-4">
                                            {sidakLoading && !cached && <SkeletonLines rows={5} />}
                                            {cached === null && <p className="text-xs text-red-500 text-center py-4">Gagal memuat. Coba tutup lalu buka lagi.</p>}
                                            {cached && <SidakBody cached={cached} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                        </FormSection>
                    )}

                    {activeTab === 'izin' && (
                        <FormSection title={`Riwayat Izin (${permits.length})`}>
                    {permits.length === 0 && <Empty text="Belum ada surat izin." />}
                    <div className="space-y-2">
                        {permits.map((p) => {
                            const open = expandedPermitId === p.id;
                            const cached = permitCache[p.id];
                            return (
                                <div key={p.id} className={`rounded-xl border transition-colors ${open ? 'border-[#0F1E36]/30 bg-blue-50/30' : 'border-gray-100 bg-gray-50/60'}`}>
                                    <button
                                        onClick={() => togglePermit(p.id)}
                                        aria-expanded={open}
                                        className="w-full text-left px-4 py-3.5 min-h-[56px] focus-visible:outline-2 focus-visible:outline-[#0F1E36] rounded-xl"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 font-mono truncate">{p.permit_number}</p>
                                            <span className="flex items-center gap-1.5 shrink-0">
                                                {p.is_expired && <Badge color="red" size="sm">Kedaluwarsa</Badge>}
                                                <Badge color={permitColor[p.status] ?? 'gray'} size="sm">{permitLabel[p.status] ?? p.status}</Badge>
                                                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate">
                                            {p.job_type ?? '—'} — {p.request_date ? formatDateID(p.request_date) : '—'}
                                            {(p.workers_total ?? 0) > 0 ? ` · 👷 ${p.workers_present}/${p.workers_total}` : ''}
                                            {(p.goods_total ?? 0) > 0 ? ` · 📦 ${p.goods_verified}/${p.goods_total}` : ''}
                                        </p>
                                    </button>
                                    {open && (
                                        <div className="px-4 pb-4">
                                            {permitLoading && !cached && <SkeletonLines rows={4} />}
                                            {cached === null && <p className="text-xs text-red-500 text-center py-4">Gagal memuat. Coba tutup lalu buka lagi.</p>}
                                            {cached && <PermitBody permit={cached} />}
                                            <Link
                                                href={`/permit-requests/${p.id}`}
                                                className="mt-2 inline-flex items-center text-xs font-medium text-[#0F1E36] hover:underline rounded min-h-[44px]"
                                            >
                                                Buka halaman izin →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </FormSection>
                    )}
                </div>
            </div>
        </AppLayout>
    );

    function toggleSidak(id) {
        if (expandedSidakId === id) { setExpandedSidakId(null); return; }
        setExpandedSidakId(id);
        if (sidakCache[id]) return;
        setSidakLoading(true);
        fetch(`/tenant-profiles/${tenant.id}/inspections/${id}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => setSidakCache((prev) => ({ ...prev, [id]: d })))
            .catch(() => setSidakCache((prev) => ({ ...prev, [id]: null })))
            .finally(() => setSidakLoading(false));
    }

    function togglePermit(id) {
        if (expandedPermitId === id) { setExpandedPermitId(null); return; }
        setExpandedPermitId(id);
        if (permitCache[id]) return;
        setPermitLoading(true);
        fetch(`/tenant-profiles/${tenant.id}/permits/${id}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => setPermitCache((prev) => ({ ...prev, [id]: d.permit })))
            .catch(() => setPermitCache((prev) => ({ ...prev, [id]: null })))
            .finally(() => setPermitLoading(false));
    }
}

function toQuery(filters) {
    const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return params ? `?${params}` : '';
}

function Stat({ label, value, alert, sub }) {
    return (
        <div className="rounded-xl bg-white/10 px-2 py-2.5">
            <dt className="text-[10px] uppercase tracking-wide text-white/50">{label}</dt>
            <dd className="text-lg font-bold tabular-nums flex items-center justify-center gap-1.5">
                {value}
                {alert && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B] animate-pulse" aria-label="Perlu perhatian" />}
            </dd>
            {sub && <p className="text-[10px] text-white/60 mt-0.5">{sub}</p>}
        </div>
    );
}

function InfoRow({ label, value, mono, missing, full }) {
    return (
        <div className={`rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 ${full ? 'sm:col-span-2' : ''}`}>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
            {value ? (
                <p className={`text-xs text-gray-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
            ) : (
                <p className="text-xs text-amber-600 italic mt-0.5">{missing ?? '—'}</p>
            )}
        </div>
    );
}

function Money({ label, value, period, sub, raw }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-xs font-semibold text-gray-800 tabular-nums mt-0.5">
                {raw ? value : rupiah(value)}{period ? <span className="font-normal text-gray-400"> /{period}</span> : null}
            </p>
            {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
        </div>
    );
}

function InfoMini({ label, value }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-xs text-gray-700 mt-0.5">{value}</p>
        </div>
    );
}

function Empty({ text }) {
    return <p className="text-xs text-gray-400 text-center py-6">{text}</p>;
}

function MiniList({ empty, emptyText, items }) {
    if (empty) return <Empty text={emptyText} />;
    return (
        <div className="space-y-1.5">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
                    <div className="min-w-0">
                        <p className={`text-xs font-semibold text-gray-900 truncate ${item.mono ? 'font-mono' : ''}`}>{item.title}</p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.sub}</p>
                    </div>
                    {item.badge}
                </div>
            ))}
        </div>
    );
}

function TabLink({ onClick, label }) {
    return (
        <button
            onClick={onClick}
            className="mt-2 inline-flex items-center text-xs font-medium text-[#0F1E36] hover:underline rounded min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
        >
            {label}
        </button>
    );
}

function SkeletonLines({ rows = 4 }) {
    return (
        <div className="space-y-2.5 py-2" aria-label="Memuat…" role="status">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className={`h-3 rounded-lg bg-gray-200 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
                    <div className="mt-1.5 h-3 w-1/3 rounded-lg bg-gray-100" />
                </div>
            ))}
        </div>
    );
}

function SidakBody({ cached }) {
    const failed = cached.inspection?.failed_count ?? 0;
    const photos = cached.inspection?.photo_count ?? 0;
    return (
        <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {cached.inspection?.session_officer && <span>Petugas: <span className="font-medium text-gray-700">{cached.inspection.session_officer}</span></span>}
                {cached.inspection?.session_ended_at && cached.inspection?.session_started_at && (
                    <span>Durasi sesi: {cached.inspection.session_started_at} → {cached.inspection.session_ended_at}</span>
                )}
                <span className={failed > 0 ? 'text-red-600 font-medium' : ''}>{failed} item gagal</span>
                <span>{photos} foto</span>
            </div>
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
                                            <img src={photo.url} alt="Foto bukti sidak" loading="lazy" className="w-20 h-20 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200" />
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
    );
}

function PermitBody({ permit }) {
    return (
        <div className="space-y-3 pt-1 text-xs">
            {(permit.activity_types ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {permit.activity_types.map((a) => <Badge key={a} color="blue" size="sm">{String(a).replaceAll('_', ' ')}</Badge>)}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InfoMini label="Jadwal kerja" value={`${formatDateRange(permit.work_start_date, permit.work_end_date)} · ${formatTimeRange(permit.work_start_time, permit.work_end_time)}`} />
                <InfoMini label="Lokasi kerja" value={permit.location_snapshot ?? [permit.floor_snapshot, permit.block_snapshot, permit.unit_number_snapshot].filter(Boolean).join(' / ')} />
                <InfoMini label="PIC" value={[permit.pic_name, permit.pic_phone].filter(Boolean).join(' · ')} />
                <InfoMini label="Rute akses" value={permit.access_route} />
            </div>
            {permit.is_external && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Kontraktor eksternal</p>
                    <p className="text-xs text-amber-900 mt-0.5">{[permit.contractor_company, permit.contractor_pic, permit.contractor_phone].filter(Boolean).join(' · ') || '—'}</p>
                </div>
            )}
            {permit.notes && <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap">{permit.notes}</p>}
            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Pekerja hadir</p>
                    <p className="text-base font-bold tabular-nums text-gray-800">{permit.workers_present ?? 0}/{permit.workers_total ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Barang terverifikasi</p>
                    <p className="text-base font-bold tabular-nums text-gray-800">{permit.goods_verified ?? 0}/{permit.goods_total ?? 0}</p>
                </div>
            </div>
            {(permit.workers_detail ?? []).length > 0 && (
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Pekerja</p>
                    <div className="space-y-1.5">
                        {permit.workers_detail.map((w) => (
                            <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
                                <p className="text-xs text-gray-800 truncate">{w.name}{w.mismatch_note ? <span className="text-red-500"> · {w.mismatch_note}</span> : null}</p>
                                <Badge color={w.is_present ? 'green' : 'gray'} size="sm">{w.is_present ? 'Hadir' : 'Absen'}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {(permit.goods_detail ?? []).length > 0 && (
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Barang</p>
                    <div className="space-y-1.5">
                        {permit.goods_detail.map((g) => (
                            <div key={g.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2">
                                {g.photo_url && <img src={g.photo_url} alt={g.description} loading="lazy" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-gray-800 truncate">{g.description}{g.quantity_note ? <span className="text-gray-400"> · {g.quantity_note}</span> : null}</p>
                                    {g.mismatch_note && <p className="text-[11px] text-red-500">{g.mismatch_note}</p>}
                                </div>
                                <Badge color={g.is_verified ? 'green' : 'gray'} size="sm">{g.is_verified ? 'OK' : 'Cek'}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {(permit.approvals ?? []).length > 0 && (
                <ol className="relative pl-5 space-y-2.5">
                    <span className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-100" aria-hidden="true" />
                    {permit.approvals.map((a, idx) => (
                        <li key={idx} className="relative text-xs">
                            <span className={`absolute -left-5 w-[14px] h-[14px] rounded-full ${a.status === 'approved' ? 'bg-[#1FA24C]' : a.status === 'rejected' ? 'bg-red-500' : 'bg-gray-200'}`} aria-hidden="true" />
                            <p className="font-medium text-gray-800">{a.label} · {a.status}</p>
                            {(a.approved_by || a.approved_at) && <p className="text-gray-400">{[a.approved_by, a.approved_at].filter(Boolean).join(' · ')}</p>}
                            {a.notes && <p className="text-gray-500 mt-0.5">{a.notes}</p>}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
