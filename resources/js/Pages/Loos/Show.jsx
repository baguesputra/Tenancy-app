import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import LooSectionForm from '@/Components/Loo/LooSectionForm';
import FilePreviewModal from '@/Components/Loo/FilePreviewModal';

const STATUS_COLORS = {
    draft: 'gray', legal_review: 'blue', accounting_review: 'yellow',
    tenant_mgmt_review: 'orange', measurement: 'purple', ba_handover: 'cyan',
    fitout: 'green', pre_handover: 'indigo', completed: 'green', cancelled: 'red',
};

const STATUS_LABELS = {
    draft: 'Draft', legal_review: 'Legal Review', accounting_review: 'Accounting Review',
    tenant_mgmt_review: 'Tenant Mgmt Review', measurement: 'Measurement',
    ba_handover: 'BA Handover', fitout: 'Fitout', pre_handover: 'Pre-Handover',
    completed: 'Completed', cancelled: 'Cancelled',
};

const STAGE_LABELS = {
    marketing: 'Marketing', legal: 'Legal', accounting: 'Accounting',
    tenant_mgmt: 'Tenant Mgmt', measurement: 'Measurement',
    ba_handover: 'BA Handover', fitout: 'Fitout', pre_handover: 'Pre-Handover',
};

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

function StateIcon({ state }) {
    if (state === 'submitted') {
        return (
            <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
            </svg>
        );
    }
    if (state === 'draft') {
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 mx-[3px]" aria-hidden="true" />;
    }
    return <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 shrink-0 mx-[3px]" aria-hidden="true" />;
}

export default function Show({ loo, sectionConfigs = {}, canEditSections = [], canEditLoo = false, canCancel = false, files = [], transitions = [], options = {} }) {
    const [submitting, setSubmitting] = useState(false);
    const [openKey, setOpenKey] = useState(null);
    const [preview, setPreview] = useState(null);

    const terminal = ['completed', 'cancelled'].includes(loo.status);

    const sectionRows = Object.entries(sectionConfigs).map(([key, cfg]) => {
        const row = (loo.sections ?? []).find((s) => s.section_key === key);
        const state = row ? (row.is_submitted ? 'submitted' : 'draft') : 'none';
        return { key, cfg, row, state, editable: canEditSections.includes(key) };
    });

    const submittedCount = sectionRows.filter((r) => r.state === 'submitted').length;

    const jumpTo = (key, editable) => {
        if (editable) setOpenKey(key);
        const el = document.getElementById(`section-${key}`);
        if (!el) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    };

    const submitSection = ({ data, files }, submit) => {
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
        router.post(`/loos/${loo.id}/sections/${openKey}`, fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const changeStatus = (status) => {
        if (status === 'cancelled') {
            const reason = window.prompt('Alasan pembatalan:');
            if (!reason) return;
            const fd = new FormData();
            fd.append('status', status);
            fd.append('cancel_reason', reason);
            router.post(`/loos/${loo.id}/transition`, fd, {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            });
            return;
        }
        const fd = new FormData();
        fd.append('status', status);
        router.post(`/loos/${loo.id}/transition`, fd, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-6xl w-full mx-auto">
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-gray-900 truncate">{loo.loo_number}</h1>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'} · {loo.branch?.name ?? '—'}
                        </p>
                    </div>
                    <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="md">{STATUS_LABELS[loo.status] ?? loo.status}</Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">
                    <aside
                        className="order-first lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5"
                        aria-label="Progress per divisi"
                    >
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress Per Divisi</p>
                        {!terminal && (
                            <p className="text-xs text-gray-500 mt-1">
                                Review saat ini: <span className="font-medium text-[#0F1E36]">{STATUS_LABELS[loo.status] ?? loo.status}</span>
                            </p>
                        )}

                        <div className="mt-3 mb-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                <span>Section selesai</span>
                                <span className="font-medium text-gray-800">{submittedCount}/{sectionRows.length} disubmit</span>
                            </div>
                            <div
                                className="h-1.5 rounded-full bg-gray-100"
                                role="progressbar"
                                aria-valuenow={submittedCount}
                                aria-valuemin={0}
                                aria-valuemax={sectionRows.length}
                                aria-label="Bagian selesai"
                            >
                                    <div
                                    className="h-1.5 rounded-full bg-[#0F1E36] transition-all duration-300"
                                    style={{ width: `${sectionRows.length ? (submittedCount / sectionRows.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <ul className="mt-3 space-y-1">
                            {sectionRows.map(({ key, cfg, state, editable }) => {
                                const isActive = cfg.stage === loo.current_stage && !terminal;
                                const badge = SECTION_BADGE[state];
                                return (
                                    <li key={key}>
                                        <button
                                            type="button"
                                            onClick={() => jumpTo(key, editable)}
                                            className={`w-full flex items-center gap-2.5 min-h-11 px-2 rounded-lg text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] ${isActive ? 'bg-gray-50 ring-1 ring-[#0F1E36]' : ''}`}
                                            aria-label={`${cfg.label}, ${badge.label}${isActive ? ', review saat ini' : ''}`}
                                        >
                                            <StateIcon state={state} />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-medium text-gray-900 truncate">{cfg.label}</span>
                                                {isActive && <span className="block text-[10px] text-[#0F1E36] font-semibold uppercase">Review saat ini</span>}
                                            </span>
                                            <Badge color={badge.color} size="sm">{badge.label}</Badge>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    <div className="lg:order-1 min-w-0 space-y-4">
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informasi LOO</p>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div><dt className="text-gray-500">Tgl Terima LOO</dt><dd className="text-gray-900 font-medium">{loo.loo_received_date ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Pendistribusi</dt><dd className="text-gray-900 font-medium">{loo.loo_distributor ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Dibuat oleh</dt><dd className="text-gray-900 font-medium">{loo.marketing?.name ?? '—'}</dd></div>
                                <div><dt className="text-gray-500">Kategori</dt><dd className="text-gray-900 font-medium">{loo.tenantCategory?.name ?? '—'}</dd></div>
                            </dl>
                        </div>

                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">File LOO</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setPreview({ url: f.url, label: f.label, type: f.type })}
                                        className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50 min-h-11 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
                                    >
                                        <span className="text-sm font-medium text-[#0F1E36] truncate">{f.label}</span>
                                        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
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

                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Section</p>
                            <div className="space-y-2">
                                {sectionRows.map(({ key, cfg, row, state, editable }) => {
                                    const isOpen = openKey === key;
                                    const badge = SECTION_BADGE[state];
                                    return (
                                        <div key={key} id={`section-${key}`} className="scroll-mt-24 border border-[#E2E5EA] rounded-xl">
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <StateIcon state={state} />
                                                    <span className="text-sm font-medium text-gray-800 truncate">{cfg.label}</span>
                                                    <span className="text-xs text-gray-400 hidden sm:inline">{STAGE_LABELS[cfg.stage] ?? cfg.stage}</span>
                                                    <Badge color={badge.color} size="sm">{badge.label}</Badge>
                                                </div>
                                                {editable && (
                                                    <Button variant="secondary" onClick={() => setOpenKey(isOpen ? null : key)}>
                                                        {isOpen ? 'Tutup' : row ? 'Lihat / Ubah' : 'Isi'}
                                                    </Button>
                                                )}
                                            </div>
                                            {isOpen && editable && (
                                                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                                                    <LooSectionForm
                                                        looId={loo.id}
                                                        sectionKey={key}
                                                        config={cfg}
                                                        section={row}
                                                        options={options}
                                                        submitting={submitting}
                                                        onSubmit={submitSection}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Riwayat ({loo.history?.length ?? 0})</p>
                            <div className="space-y-3">
                                {(loo.history ?? []).map((h) => (
                                    <div key={h.id} className="flex items-start gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-[#0F1E36] mt-1.5 shrink-0" aria-hidden="true" />
                                        <div>
                                            <p className="text-gray-900 font-medium">{ACTION_LABELS[h.action] ?? h.action}</p>
                                            {h.to_status && <p className="text-xs text-gray-500">{h.from_status} → {h.to_status}</p>}
                                            <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('id-ID')}{h.user ? ` · ${h.user.name}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                                {(loo.history?.length ?? 0) === 0 && <p className="text-sm text-gray-400">Belum ada riwayat.</p>}
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {canEditLoo && loo.status === 'draft' && (
                                <Link href={`/loos/${loo.id}/edit`}>
                                    <Button variant="secondary">Edit</Button>
                                </Link>
                            )}
                            {transitions.map((t) => t.direction === 'back' ? (
                                <Button key={t.value} variant="secondary" onClick={() => changeStatus(t.value)} loading={submitting}>
                                    Kembalikan ke {t.label}
                                </Button>
                            ) : (
                                <Button key={t.value} onClick={() => changeStatus(t.value)} loading={submitting}>
                                    {t.label}
                                </Button>
                            ))}
                            {canCancel && !terminal && (
                                <Button variant="danger" onClick={() => changeStatus('cancelled')} loading={submitting}>
                                    Batalkan
                                </Button>
                            )}
                            <Link href="/loos">
                                <Button variant="secondary">← Kembali</Button>
                            </Link>
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
            </div>
        </AppLayout>
    );
}
