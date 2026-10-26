import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import { IconChevronDown, IconFileText } from '@/Components/Icons';
import LooSectionForm from '@/Components/Loo/LooSectionForm';
import LooStatusCard from '@/Components/Loo/LooStatusCard';
import FilePreviewModal from '@/Components/Loo/FilePreviewModal';
import Modal from '@/Components/Modal';

const STAGE_LABELS = {
    marketing: 'Pengisian Divisi',
    pre_handover: 'Pengukuran Ulang',
    ba_handover: 'Sebelum Fitout',
    fitout: 'Setelah Fitout',
    completed: 'Selesai',
};

// Tab form per divisi. Section fitout (pre/post, pre_handover) tidak tampil
// di sini — dikerjakan lewat halaman khusus Checklist Fit Out.
const DIVISION_TABS = [
    { key: 'legalitas', label: 'Legal' },
    { key: 'biaya_termin', label: 'Accounting' },
    { key: 'manajemen_tenant', label: 'Tenant Mgmt' },
];

const SECTION_BADGE = {
    none: { color: 'gray', label: 'Belum diisi' },
    draft: { color: 'yellow', label: 'Draft' },
    submitted: { color: 'green', label: 'Disubmit' },
};

const STATUS_LABELS = {
    draft: 'Draft',
    pengisian_divisi: 'Pengisian Divisi',
    pengukuran_ulang: 'Pengukuran Ulang',
    sebelum_fitout: 'Sebelum Fitout',
    setelah_fitout: 'Setelah Fitout',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const STATUS_COLORS = {
    draft: 'gray',
    pengisian_divisi: 'blue',
    pengukuran_ulang: 'indigo',
    sebelum_fitout: 'cyan',
    setelah_fitout: 'amber',
    completed: 'green',
    cancelled: 'red',
};

const ACTION_LABELS = {
    created: 'Dibuat', cover_uploaded: 'Cover diupload', isi_uploaded: 'Isi diupload',
    section_filled: 'Section diisi', status_changed: 'Status diubah',
    termin_created: 'Termin dibuat', termin_paid: 'Termin dibayar',
    measurement_recorded: 'Measurement dicatat', ba_created: 'BA dibuat',
    fitout_started: 'Fitout dimulai', fitout_checklist_updated: 'Checklist diupdate',
    fitout_completed: 'Fitout selesai', pre_handover_submitted: 'Pre-handover disubmit',
    handover_completed: 'Handover selesai', cancelled: 'Dibatalkan',
};

// Satu baris dokumen (File LOO maupun Dokumen Pendukung) — dulu markup ini
// diduplikasi dua kali dengan ikon mata SVG yang sama.
function FileRow({ label, sub = null, type = 'image', onPreview }) {
    return (
        <div className="flex items-center gap-3 py-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 shrink-0" aria-hidden="true">
                <IconFileText className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900 truncate">{label}</span>
                {sub && <span className="block text-[11px] text-slate-500 truncate">{sub}</span>}
            </span>
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
                {type === 'pdf' ? 'PDF' : 'IMG'}
            </span>
            <button
                type="button"
                onClick={onPreview}
                aria-label={`Preview ${label}`}
                className="shrink-0 inline-flex items-center min-h-9 px-2.5 rounded-lg text-xs font-medium text-[#0F1E36] border border-slate-200 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
            >
                Preview
            </button>
        </div>
    );
}

// Satu baris riwayat (dipakai untuk 5 terbaru dan sisanya di <details>).
function HistoryRow({ item: h }) {
    return (
        <li className="flex items-start gap-2.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-[#0F1E36] mt-1 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-slate-900 font-medium truncate">{ACTION_LABELS[h.action] ?? h.action}</p>
                {h.to_status && <p className="text-[11px] text-slate-500 truncate">{h.from_status} → {h.to_status}</p>}
                <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(h.created_at).toLocaleString('id-ID')}{h.user ? ` · ${h.user.name}` : ''}
                </p>
            </div>
        </li>
    );
}

// Strip metrik hairline (pola sama dengan halaman fitout & FloorPlan/Index).
function KpiStrip({ items = [] }) {
    return (
        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 rounded-lg border border-slate-200 overflow-hidden">
            {items.map((k) => (
                <div key={k.label} className="bg-white px-4 py-3">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{k.label}</dt>
                    <dd className="mt-1 flex items-baseline gap-1.5">
                        <span className={`${k.small ? 'text-sm font-semibold' : 'text-xl font-semibold tabular-nums'} text-slate-900 truncate`}>
                            {k.value}
                        </span>
                        {k.hint && <span className="text-xs text-slate-500 shrink-0">{k.hint}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export default function Show({ loo, sectionConfigs = {}, canEditSections = [], visibleSectionKeys = null, readOnlySections = {}, canEditLoo = false, canCancel = false, files = [], attachments = [], progress = null, options = {} }) {
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const terminal = ['completed', 'cancelled'].includes(loo.status);

    const allowedKeys = Array.isArray(visibleSectionKeys) ? visibleSectionKeys : DIVISION_TABS.map((t) => t.key);

    const tabRows = DIVISION_TABS
        .filter(({ key }) => allowedKeys.includes(key))
        .map(({ key, label }) => {
            const cfg = sectionConfigs[key];
            if (!cfg) return null;
            const row = (loo.sections ?? []).find((s) => s.section_key === key);
            const state = row ? (row.is_submitted ? 'submitted' : 'draft') : 'none';
            return { key, label, cfg, row, state, editable: canEditSections.includes(key) };
        })
        .filter(Boolean);

    const defaultTab = () => {
        const active = tabRows.find((t) => t.cfg.stage === loo.current_stage && t.editable);
        if (active) return active.key;
        const editable = tabRows.find((t) => t.editable);
        return (editable ?? tabRows[0])?.key ?? DIVISION_TABS[0].key;
    };

    const [activeTab, setActiveTab] = useState(defaultTab);
    const current = tabRows.find((t) => t.key === activeTab) ?? tabRows[0];

    // Shortcut checklist selalu tampil selama LOO belum terminal
    const fitoutVisible = !terminal;

    // Ringkasan progres lintas fase (hanya field yang punya hitungan).
    const allSections = (progress?.phases ?? []).flatMap((p) => p.sections ?? []);
    const filledItems = allSections.reduce((n, s) => n + s.filled, 0);
    const totalItems = allSections.reduce((n, s) => n + s.total, 0);
    const progressPct = totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0;

    const kpis = [
        { label: 'Tgl Terima LOO', value: loo.loo_received_date ?? '—', small: true },
        { label: 'Dibuat oleh', value: loo.marketing?.name ?? '—', small: true },
        { label: 'Kategori', value: loo.tenantCategory?.name ?? '—', small: true },
        { label: 'Progres pengisian', value: `${filledItems}/${totalItems}`, hint: `${progressPct}%` },
    ];

    // Riwayat: 5 terbaru tampil, sisanya di <details> (tanpa nested scroll).
    const history = [...(loo.history ?? [])].reverse();
    const recentHistory = history.slice(0, 5);
    const olderHistory = history.slice(5);

    const submitSection = (key) => ({ data, files }, submit) => {
        setSubmitting(true);
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v === null || v === undefined) return;
            // File sudah ditangani loop `files` di bawah. Kalau ikut di-JSON-kan ke
            // key yang sama, Laravel memprioritaskan $_POST atas $_FILES → "must be a file".
            if (v instanceof File || (Array.isArray(v) && v.some((x) => x instanceof File))) return;
            if (typeof v === 'object') fd.append(k, JSON.stringify(v));
            else fd.append(k, v);
        });
        Object.entries(files).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach((f) => fd.append(`${k}[]`, f));
            else fd.append(k, v);
        });
        fd.append('submit', submit ? '1' : '0');
        router.post(`/loos/${loo.id}/sections/${key}`, fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const confirmCancel = () => {
        setSubmitting(true);
        const fd = new FormData();
        fd.append('status', 'cancelled');
        fd.append('cancel_reason', cancelReason);
        router.post(`/loos/${loo.id}/transition`, fd, {
            preserveScroll: true,
            onFinish: () => { setSubmitting(false); setCancelModal(false); setCancelReason(''); },
        });
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-6xl w-full mx-auto">
                {/* Header record */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate tabular-nums">
                                {loo.loo_number}
                            </h1>
                            <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="sm">
                                {STATUS_LABELS[loo.status] ?? loo.status}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                            {loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'} · {loo.branch?.name ?? '—'} · Unit: {loo.unit?.unit_code ?? '—'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {canEditLoo && loo.status === 'draft' && <Link href={`/loos/${loo.id}/edit`}><Button variant="secondary">Edit</Button></Link>}
                        {fitoutVisible && <Link href={`/loos/${loo.id}/fitout`}><Button variant="secondary">Checklist Fitout</Button></Link>}
                        {canCancel && !terminal && <Button variant="danger" onClick={() => setCancelModal(true)}>Batalkan</Button>}
                    </div>
                </div>

                <KpiStrip items={kpis} />

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
                    {/* Sidebar: Status LOO + Riwayat */}
                    <aside
                        className="order-first lg:order-2 lg:sticky lg:top-20 space-y-4"
                        aria-label="Sidebar LOO"
                    >
                        {/* Kartu Status LOO (stepper pipeline + progres per fase) */}
                        {progress && <LooStatusCard progress={progress} loo={loo} sectionBadge={SECTION_BADGE} />}

                        {/* Riwayat: 5 terbaru + sisanya di <details> (tanpa nested scroll) */}
                        <div className="bg-white rounded-lg border border-slate-200 p-5">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Riwayat ({history.length})
                            </p>
                            {history.length === 0 ? (
                                <p className="text-xs text-slate-500">Belum ada riwayat.</p>
                            ) : (
                                <>
                                    <ol className="space-y-3">
                                        {recentHistory.map((h) => <HistoryRow key={h.id} item={h} />)}
                                    </ol>
                                    {olderHistory.length > 0 && (
                                        <details className="mt-3 group">
                                            <summary className="flex items-center gap-1.5 cursor-pointer list-none text-xs font-medium text-[#0F1E36] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] rounded">
                                                <IconChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                                                Lihat semua ({history.length})
                                            </summary>
                                            <ol className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                                                {olderHistory.map((h) => <HistoryRow key={h.id} item={h} />)}
                                            </ol>
                                        </details>
                                    )}
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Main Column */}
                    <div className="lg:order-1 min-w-0 space-y-4">
                        {/* Dokumen: File LOO + Dokumen Pendukung digabung */}
                        <div className="bg-white rounded-lg border border-slate-200 p-5">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dokumen</p>
                                <span className="text-xs text-slate-500 tabular-nums">
                                    {files.length + attachments.length} berkas
                                </span>
                            </div>

                            {files.length === 0 && attachments.length === 0 ? (
                                <p className="py-4 text-sm text-slate-500">Belum ada dokumen.</p>
                            ) : (
                                <>
                                    {files.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[11px] font-medium text-slate-500 mb-1">Dokumen LOO</p>
                                            <div className="divide-y divide-slate-200">
                                                {files.map((f) => (
                                                    <FileRow
                                                        key={f.key}
                                                        label={f.label}
                                                        type={f.type}
                                                        onPreview={() => setPreview({ url: f.url, label: f.label, type: f.type })}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {attachments.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-[11px] font-medium text-slate-500 mb-1">
                                                Dokumen Pendukung ({attachments.length})
                                            </p>
                                            <div className="divide-y divide-slate-200">
                                                {attachments.map((a) => (
                                                    <FileRow
                                                        key={a.id}
                                                        label={a.label}
                                                        sub={`${a.original_name}${a.uploader ? ` · ${a.uploader}` : ''}`}
                                                        type={a.type}
                                                        onPreview={() => setPreview({ url: a.url, label: a.label, type: a.type })}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Form Divisi Tab */}
                        <div className="bg-white rounded-lg border border-slate-200 p-5">
                            <div className="inline-flex max-w-full rounded-lg border border-slate-200 p-0.5 overflow-x-auto" role="group" aria-label="Form per divisi">
                                {tabRows.map(({ key, label, state }) => {
                                    const badge = SECTION_BADGE[state];
                                    const selected = key === activeTab;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => setActiveTab(key)}
                                            className={`flex items-center gap-2 px-3 min-h-11 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] ${
                                                selected
                                                    ? 'bg-[#0F1E36] text-white'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {label}
                                            <Badge color={badge.color} size="sm">{badge.label}</Badge>
                                        </button>
                                    );
                                })}
                            </div>

                            {current && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <p className="text-sm font-medium text-slate-900">{current.cfg.label}</p>
                                        <span className="text-xs text-slate-500">{STAGE_LABELS[current.cfg.stage] ?? current.cfg.stage}</span>
                                    </div>
                                    {current.editable && !terminal ? (
                                        <LooSectionForm
                                            looId={loo.id}
                                            sectionKey={current.key}
                                            config={current.cfg}
                                            section={current.row}
                                            options={options}
                                            submitting={submitting}
                                            onSubmit={submitSection(current.key)}
                                        />
                                    ) : readOnlySections[current.key] ? (
                                        <LooSectionForm
                                            looId={loo.id}
                                            sectionKey={current.key}
                                            config={current.cfg}
                                            section={current.row}
                                            options={options}
                                            previewFields={readOnlySections[current.key]}
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-500 py-4 text-center">
                                            {terminal
                                                ? 'LOO sudah selesai atau dibatalkan.'
                                                : 'Anda tidak memiliki izin mengisi form divisi ini.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <FilePreviewModal
                    open={!!preview}
                    onClose={() => setPreview(null)}
                    label={preview?.label ?? ''}
                    url={preview?.url ?? ''}
                    type={preview?.type ?? 'image'}
                />

                {/* Cancel Modal */}
                <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Batalkan LOO?">
                    <p className="text-sm text-slate-600 mb-4">Alasan pembatalan akan dicatat di riwayat. Lanjutkan?</p>
                    <label htmlFor="cancel-reason" className="block mb-1 text-sm font-medium text-slate-700">Alasan</label>
                    <textarea
                        id="cancel-reason"
                        aria-describedby="cancel-reason-hint"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] mb-4"
                        rows={3}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Tulis alasan pembatalan..."
                    />
                    <p id="cancel-reason-hint" className="sr-only">Alasan pembatalan wajib dicatat di riwayat LOO.</p>
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setCancelModal(false)} disabled={submitting}>Kembali</Button>
                        <Button variant="danger" onClick={confirmCancel} loading={submitting}>Ya, Batalkan</Button>
                    </div>
                </Modal>
            </div>
        </AppLayout>
    );
}
