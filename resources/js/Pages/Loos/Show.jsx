import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import LooSectionForm from '@/Components/Loo/LooSectionForm';

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

export default function Show({ loo, sectionConfigs = {}, canEditSections = [], canEditLoo = false, canCancel = false, transitions = [], options = {} }) {
    const [submitting, setSubmitting] = useState(false);
    const [openKey, setOpenKey] = useState(null);

    const sectionRows = Object.entries(sectionConfigs).map(([key, cfg]) => {
        const row = (loo.sections ?? []).find((s) => s.section_key === key);
        const state = row ? (row.is_submitted ? 'submitted' : 'draft') : 'none';
        return { key, cfg, row, state, editable: canEditSections.includes(key) };
    });

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
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-4xl w-full mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">{loo.loo_number}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'} · {loo.branch?.name ?? '—'}
                        </p>
                    </div>
                    <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="md">{STATUS_LABELS[loo.status] ?? loo.status}</Badge>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress Per Divisi</p>
                        {!['completed', 'cancelled'].includes(loo.status) && (
                            <span className="text-xs text-gray-500">Review saat ini: <span className="font-medium text-[#0F1E36]">{STATUS_LABELS[loo.status] ?? loo.status}</span></span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {sectionRows.map(({ key, cfg, state }) => {
                            const isActive = cfg.stage === loo.current_stage && !['completed', 'cancelled'].includes(loo.status);
                            const badge = SECTION_BADGE[state];
                            return (
                                <div key={key} className={`rounded-xl border p-3 ${isActive ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA]'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                                            <p className="text-xs text-gray-400">{STAGE_LABELS[cfg.stage] ?? cfg.stage}</p>
                                        </div>
                                        <Badge color={badge.color} size="sm">{badge.label}</Badge>
                                    </div>
                                    {isActive && <p className="text-[10px] text-[#0F1E36] font-semibold uppercase mt-2">Review saat ini</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informasi LOO</p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div><dt className="text-gray-500">Tgl Terima LOO</dt><dd className="text-gray-900 font-medium">{loo.loo_received_date ?? '—'}</dd></div>
                        <div><dt className="text-gray-500">Pendistribusi</dt><dd className="text-gray-900 font-medium">{loo.loo_distributor ?? '—'}</dd></div>
                        <div><dt className="text-gray-500">Dibuat oleh</dt><dd className="text-gray-900 font-medium">{loo.marketing?.name ?? '—'}</dd></div>
                        <div><dt className="text-gray-500">Kategori</dt><dd className="text-gray-900 font-medium">{loo.tenantCategory?.name ?? '—'}</dd></div>
                    </dl>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">File LOO</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {loo.cover_file_path && (
                            <a href={`/storage/${loo.cover_file_path}`} target="_blank" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                                <span className="text-sm font-medium text-[#0F1E36]">Cover LOO</span>
                                <span className="text-xs text-gray-400">↗</span>
                            </a>
                        )}
                        {loo.isi_file_path && (
                            <a href={`/storage/${loo.isi_file_path}`} target="_blank" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                                <span className="text-sm font-medium text-[#0F1E36]">Isi LOO</span>
                                <span className="text-xs text-gray-400">↗</span>
                            </a>
                        )}
                        {loo.loo_letter_file_path && (
                            <a href={`/storage/${loo.loo_letter_file_path}`} target="_blank" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                                <span className="text-sm font-medium text-[#0F1E36]">Surat LOO</span>
                                <span className="text-xs text-gray-400">↗</span>
                            </a>
                        )}
                        {loo.loo_proposal_file_path && (
                            <a href={`/storage/${loo.loo_proposal_file_path}`} target="_blank" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                                <span className="text-sm font-medium text-[#0F1E36]">Penawaran LOO</span>
                                <span className="text-xs text-gray-400">↗</span>
                            </a>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Section</p>
                    <div className="space-y-2">
                        {sectionRows.map(({ key, cfg, row, state, editable }) => {
                            const isOpen = openKey === key;
                            const badge = SECTION_BADGE[state];
                            return (
                                <div key={key} className="border border-[#E2E5EA] rounded-xl">
                                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
                                            <span className="text-xs text-gray-400">{STAGE_LABELS[cfg.stage] ?? cfg.stage}</span>
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

                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-5 mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Riwayat ({loo.history?.length ?? 0})</p>
                    <div className="space-y-3">
                        {(loo.history ?? []).map((h) => (
                            <div key={h.id} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[#0F1E36] mt-1.5 shrink-0" />
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
                    {transitions.map((t) => (
                        <Button key={t.value} onClick={() => changeStatus(t.value)} loading={submitting}>
                            {t.label}
                        </Button>
                    ))}
                    {canCancel && loo.status !== 'cancelled' && loo.status !== 'completed' && (
                        <Button variant="danger" onClick={() => changeStatus('cancelled')} loading={submitting}>
                            Batalkan
                        </Button>
                    )}
                    <Link href="/loos">
                        <Button variant="secondary">← Kembali</Button>
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}