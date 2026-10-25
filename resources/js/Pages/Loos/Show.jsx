import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import LooSectionForm from '@/Components/Loo/LooSectionForm';
import FilePreviewModal from '@/Components/Loo/FilePreviewModal';
import Modal from '@/Components/Modal';

const STAGE_LABELS = {
    marketing: 'Pengisian Divisi',
    pre_handover: 'Pengukuran Ulang',
    ba_handover: 'Sebelum Fitout',
    fitout: 'Setelah Fitout',
    completed: 'Selesai',
};

const STATUS_LABELS = {
    draft: 'Draft',
    pengisian_divisi: 'Pengisian Divisi',
    pengukuran_ulang: 'Pengukuran Ulang',
    sebelum_fitout: 'Sebelum Fitout',
    setelah_fitout: 'Setelah Fitout',
    completed: 'Completed',
    cancelled: 'Cancelled',
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

const PHASE_STATE = {
    done: { color: 'green', label: 'Selesai' },
    active: { color: 'blue', label: 'Sedang diisi' },
    locked: { color: 'gray', label: 'Terkunci' },
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

const ACTION_LABELS = {
    created: 'Dibuat', cover_uploaded: 'Cover diupload', isi_uploaded: 'Isi diupload',
    section_filled: 'Section diisi', status_changed: 'Status diubah',
    termin_created: 'Termin dibuat', termin_paid: 'Termin dibayar',
    measurement_recorded: 'Measurement dicatat', ba_created: 'BA dibuat',
    fitout_started: 'Fitout dimulai', fitout_checklist_updated: 'Checklist diupdate',
    fitout_completed: 'Fitout selesai', pre_handover_submitted: 'Pre-handover disubmit',
    handover_completed: 'Handover selesai', cancelled: 'Dibatalkan',
};

export default function Show({ loo, sectionConfigs = {}, canEditSections = [], visibleSectionKeys = null, canEditLoo = false, canCancel = false, files = [], progress = null, options = {} }) {
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

    const submitSection = (key) => ({ data, files }, submit) => {
        setSubmitting(true);
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v === null || v === undefined) return;
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
                {/* Back Link */}
                <Link href="/loos" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 mb-4 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Kembali ke Daftar LOO
                </Link>

                {/* Header: title + badge + actions */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 truncate">{loo.loo_number}</h1>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'} · {loo.branch?.name ?? '—'} · {loo.unit?.unit_code ?? '-'}
                        </p>
                    </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {canEditLoo && loo.status === 'draft' && <Link href={`/loos/${loo.id}/edit`}><Button variant="secondary">Edit</Button></Link>}
                        {fitoutVisible && <Link href={`/loos/${loo.id}/fitout`}><Button variant="secondary">Checklist Fitout</Button></Link>}
                        {canCancel && !terminal && <Button variant="danger" onClick={() => setCancelModal(true)}>Batalkan</Button>}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
                    {/* Sidebar: Status LOO + Riwayat */}
                    <aside
                        className="order-first lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4"
                        aria-label="Sidebar LOO"
                    >
                        {/* Kartu Status LOO (pipeline + progres per fase) */}
                        {progress && (
                            <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status LOO</p>
                                    <span className="text-xs text-gray-500">LOO diupload {progress.days_since_upload} hari lalu</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge color={STATUS_COLORS[progress.status] ?? 'gray'} size="sm">
                                        {STATUS_LABELS[progress.status] ?? progress.status}
                                    </Badge>
                                    {!terminal && <span className="text-sm text-gray-600">{progress.summary}</span>}
                                </div>

                                <ol className="mt-4 space-y-3">
                                    {progress.phases.map((phase, i) => {
                                        const meta = PHASE_STATE[phase.state] ?? PHASE_STATE.locked;
                                        return (
                                            <li key={phase.key} className="border-l-2 border-gray-100 pl-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">{i + 1}. {phase.label}</span>
                                                    <Badge color={meta.color} size="sm">{meta.label}</Badge>
                                                </div>
                                                {phase.state === 'active' && (
                                                    <ul className="mt-2 space-y-1">
                                                        {phase.sections.map((s) => (
                                                            <li key={s.key} className="text-xs text-gray-600">
                                                                <span className="font-medium text-gray-800">{s.label}</span>
                                                                {' — '}
                                                                {s.state === 'submitted'
                                                                    ? 'disubmit'
                                                                    : s.state === 'draft'
                                                                        ? `draft, sisa ${s.remaining} field`
                                                                        : 'belum diisi'}
                                                                {s.state !== 'none' && s.updated_days_ago != null && (
                                                                    <span className="text-gray-400"> · diubah {s.updated_days_ago} hari lalu</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {phase.state === 'locked' && (
                                                    <p className="text-xs text-gray-400 mt-1">Terkunci sampai tahap sebelumnya selesai.</p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}

                        {/* Kartu Riwayat di Sidebar */}
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Riwayat ({loo.history?.length ?? 0})
                            </p>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {(loo.history ?? []).map((h) => (
                                    <div key={h.id} className="flex items-start gap-2.5 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-[#0F1E36] mt-1 shrink-0" aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-gray-900 font-medium truncate">{ACTION_LABELS[h.action] ?? h.action}</p>
                                            {h.to_status && <p className="text-[11px] text-gray-500 truncate">{h.from_status} → {h.to_status}</p>}
                                            <p className="text-[11px] text-gray-400 mt-0.5">{new Date(h.created_at).toLocaleString('id-ID')}{h.user ? ` · ${h.user.name}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                                {(loo.history?.length ?? 0) === 0 && <p className="text-xs text-gray-400">Belum ada riwayat.</p>}
                            </div>
                        </div>
                    </aside>

                    {/* Main Column */}
                    <div className="lg:order-1 min-w-0 space-y-4">
                        {/* Informasi LOO */}
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informasi LOO</p>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div><dt className="text-gray-500">Tgl Terima LOO</dt><dd className="text-gray-900 font-medium">{loo.loo_received_date ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Pendistribusi</dt><dd className="text-gray-900 font-medium">{loo.loo_distributor ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Dibuat oleh</dt><dd className="text-gray-900 font-medium">{loo.marketing?.name ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Kategori</dt><dd className="text-gray-900 font-medium">{loo.tenantCategory?.name ?? '—'}</dd></div>
                            </dl>
                        </div>

                        {/* File LOO */}
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">File LOO</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setPreview({ url: f.url, label: f.label, type: f.type })}
                                        className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50 min-h-11 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
                                    >
                                        <span className="text-sm font-medium text-[#0F1E36] truncate">{f.label}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                                            Preview
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </span>
                                    </button>
                                ))}
                                {files.length === 0 && <p className="text-sm text-gray-400">Belum ada file.</p>}
                            </div>
                        </div>

                        {/* Form Divisi Tab */}
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto" role="tablist" aria-label="Form per divisi">
                                {tabRows.map(({ key, label, state }) => {
                                    const badge = SECTION_BADGE[state];
                                    const selected = key === activeTab;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveTab(key)}
                                            className={`flex items-center gap-2 px-4 min-h-11 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] ${
                                                selected
                                                    ? 'border-[#0F1E36] text-[#0F1E36]'
                                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                            }`}
                                        >
                                            {label}
                                            <Badge color={badge.color} size="sm">{badge.label}</Badge>
                                        </button>
                                    );
                                })}
                            </div>

                            {current && (
                                <div role="tabpanel" aria-label={`Form ${current.label}`}>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <p className="text-sm font-medium text-gray-800">{current.cfg.label}</p>
                                        <span className="text-xs text-gray-500">{STAGE_LABELS[current.cfg.stage] ?? current.cfg.stage}</span>
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
                    <p className="text-sm text-gray-600 mb-4">Alasan pembatalan akan dicatat di riwayat. Lanjutkan?</p>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Alasan</label>
                    <textarea
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] mb-4"
                        rows={3}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Tulis alasan pembatalan..."
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setCancelModal(false)} disabled={submitting}>Kembali</Button>
                        <Button variant="danger" onClick={confirmCancel} loading={submitting}>Ya, Batalkan</Button>
                    </div>
                </Modal>
            </div>
        </AppLayout>
    );
}
