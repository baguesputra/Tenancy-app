import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import LooSectionForm from '@/Components/Loo/LooSectionForm';

const STATUS_LABELS = {
    draft: 'Draft',
    legal_review: 'Legal Review',
    accounting_review: 'Accounting Review',
    tenant_mgmt_review: 'Tenant Mgmt Review',
    measurement: 'Measurement',
    ba_handover: 'BA Handover',
    fitout: 'Fitout',
    pre_handover: 'Pre-Handover',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STAGE_COLORS = {
    ba_handover: 'cyan',
    fitout: 'green',
    pre_handover: 'indigo',
    completed: 'green',
    cancelled: 'red',
};

export default function FitoutChecklist({
    loo,
    preSection = null,
    postSection = null,
    preHandoverSection = null,
    preConfig = null,
    postConfig = null,
    preHandoverConfig = null,
    canEditPre = false,
    canEditPost = false,
    canEditPreHandover = false,
    editableDepartments = [],
    canGmAcknowledge = false,
}) {
    const [submitting, setSubmitting] = useState(false);
    
    // Tentukan active tab awal berdasarkan stage saat ini
    const initialTab = loo.current_stage === 'pre_handover' 
        ? 'pre_handover' 
        : (loo.current_stage === 'fitout' ? 'post' : 'pre');
    const [activeTab, setActiveTab] = useState(initialTab);

    const terminal = ['completed', 'cancelled'].includes(loo.status);

    const submitSection = ({ data, files }, submit, key) => {
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

    const acknowledgeGm = () => {
        setSubmitting(true);
        router.post(`/loos/${loo.id}/fitout/approve`, {}, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const preState = preSection ? (preSection.is_submitted ? 'submitted' : 'draft') : 'none';
    const postState = postSection ? (postSection.is_submitted ? 'submitted' : 'draft') : 'none';
    const preHandoverState = preHandoverSection ? (preHandoverSection.is_submitted ? 'submitted' : 'draft') : 'none';

    const gmApprovedPost = ! emptyValue(postSection?.data?.footer?.gm_approved);

    function emptyValue(val) {
        return val === null || val === undefined || val === false || val === '';
    }

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto">
                {/* Header Navigation */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Link href="/fitout-checklists" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                                ← Hub Checklist Operasional
                            </Link>
                            <span className="text-gray-300">/</span>
                            <span className="text-xs font-medium text-gray-500 truncate">{loo.loo_number}</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 truncate">
                            Checklist Operasional
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                            {loo.tenant?.name ?? loo.prospective_tenant_name ?? '—'} · {loo.branch?.name ?? '—'} · Unit: {loo.unit?.unit_code ?? '—'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/loos/${loo.id}`}>
                            <Button variant="secondary" size="sm">
                                Detail LOO
                            </Button>
                        </Link>
                        <Badge color={STAGE_COLORS[loo.status] ?? 'blue'} size="md">
                            {STATUS_LABELS[loo.status] ?? loo.status}
                        </Badge>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 gap-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pre')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'pre'
                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>1. Sebelum Fitout (BA)</span>
                        <Badge color={preState === 'submitted' ? 'green' : preState === 'draft' ? 'amber' : 'gray'} size="sm">
                            {preState === 'submitted' ? 'Disubmit' : preState === 'draft' ? 'Draft' : 'Belum'}
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('post')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'post'
                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>2. Setelah Fitout</span>
                        <Badge color={postState === 'submitted' ? 'green' : postState === 'draft' ? 'amber' : 'gray'} size="sm">
                            {postState === 'submitted' ? 'Disubmit' : postState === 'draft' ? 'Draft' : 'Belum'}
                        </Badge>
                        {gmApprovedPost && (
                            <span className="text-[10px] text-emerald-600 font-bold">✓ Approved GM</span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('pre_handover')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'pre_handover'
                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>3. Pre-Handover</span>
                        <Badge color={preHandoverState === 'submitted' ? 'green' : preHandoverState === 'draft' ? 'amber' : 'gray'} size="sm">
                            {preHandoverState === 'submitted' ? 'Disubmit' : preHandoverState === 'draft' ? 'Draft' : 'Belum'}
                        </Badge>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'pre' && (
                    <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Checklist Sebelum Selesai Fit Out</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Stage BA Handover — Verifikasi kesiapan dokumen, tagihan, dan area sebelum pengerjaan fit out.
                                </p>
                            </div>
                            <Badge color={preState === 'submitted' ? 'green' : preState === 'draft' ? 'amber' : 'gray'} size="sm">
                                {preState === 'submitted' ? 'Disubmit' : preState === 'draft' ? 'Draft' : 'Belum diisi'}
                            </Badge>
                        </div>

                        {preConfig ? (
                            <>
                                {(terminal || !canEditPre) && (
                                    <p className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
                                        Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.
                                    </p>
                                )}
                                <LooSectionForm
                                    looId={loo.id}
                                    sectionKey="fitout_checklist_pre"
                                    config={preConfig}
                                    section={preSection}
                                    options={{}}
                                    submitting={submitting}
                                    readOnly={terminal || !canEditPre}
                                    editableDepartments={editableDepartments}
                                    onSubmit={(args) => submitSection(args, args.submit ?? false, 'fitout_checklist_pre')}
                                />
                            </>
                        ) : (
                            <div className="py-8 text-center text-sm text-gray-500">
                                Checklist ini belum dapat diisi untuk stage saat ini.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'post' && (
                    <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Checklist Setelah Selesai Fit Out</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Stage Fitout — Verifikasi hasil pengerjaan 5 departemen (Legal, Finance, Tenancy, Engineering, Kontraktor).
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge color={postState === 'submitted' ? 'green' : postState === 'draft' ? 'amber' : 'gray'} size="sm">
                                    {postState === 'submitted' ? 'Disubmit' : postState === 'draft' ? 'Draft' : 'Belum diisi'}
                                </Badge>
                                {gmApprovedPost && (
                                    <Badge color="green" size="sm">Disetujui Deputy GM</Badge>
                                )}
                            </div>
                        </div>

                        {postConfig ? (
                            <>
                                {(terminal || !canEditPost) && (
                                    <p className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
                                        Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.
                                    </p>
                                )}
                                <LooSectionForm
                                    looId={loo.id}
                                    sectionKey="fitout_checklist_post"
                                    config={postConfig}
                                    section={postSection}
                                    options={{}}
                                    submitting={submitting}
                                    readOnly={terminal || !canEditPost}
                                    editableDepartments={editableDepartments}
                                    onSubmit={(args) => submitSection(args, args.submit ?? false, 'fitout_checklist_post')}
                                />
                            </>
                        ) : (
                            <div className="py-8 text-center text-sm text-gray-500">
                                Checklist ini belum dapat diisi (LOO belum mencapai stage Fitout).
                            </div>
                        )}

                        {canGmAcknowledge && !terminal && (
                            <div className="mt-6 pt-5 border-t border-gray-100 bg-gray-50/70 p-4 rounded-xl">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[#0F1E36]">Approval Deputy General Manager</p>
                                        <p className="text-xs text-gray-500">
                                            {gmApprovedPost 
                                                ? `Telah disetujui oleh ${postSection?.data?.footer?.gm_name ?? 'Deputy GM'}` 
                                                : 'Klik tombol di samping untuk mengesahkan checklist selesai fit out.'}
                                        </p>
                                    </div>
                                    <Button
                                        variant={gmApprovedPost ? 'secondary' : 'primary'}
                                        onClick={acknowledgeGm}
                                        loading={submitting}
                                        disabled={gmApprovedPost}
                                    >
                                        {gmApprovedPost ? '✓ Sudah Disetujui' : 'Approve Checklist Fitout'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pre_handover' && (
                    <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Pre-Handover Checklist</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Tahap pemeriksaan akhir sebelum serah terima final & opening.
                                </p>
                            </div>
                            <Badge color={preHandoverState === 'submitted' ? 'green' : preHandoverState === 'draft' ? 'amber' : 'gray'} size="sm">
                                {preHandoverState === 'submitted' ? 'Disubmit' : preHandoverState === 'draft' ? 'Draft' : 'Belum diisi'}
                            </Badge>
                        </div>

                        {preHandoverConfig ? (
                            <>
                                {(terminal || !canEditPreHandover) && (
                                    <p className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
                                        Mode lihat saja — section ini hanya bisa diisi oleh tim Tenant Management.
                                    </p>
                                )}
                                <LooSectionForm
                                    looId={loo.id}
                                    sectionKey="pre_handover"
                                    config={preHandoverConfig}
                                    section={preHandoverSection}
                                    options={{}}
                                    submitting={submitting}
                                    readOnly={terminal || !canEditPreHandover}
                                    editableDepartments={editableDepartments}
                                    onSubmit={(args) => submitSection(args, args.submit ?? false, 'pre_handover')}
                                />
                            </>
                        ) : (
                            <div className="py-8 text-center text-sm text-gray-500">
                                Section ini baru dapat diisi saat LOO mencapai stage Pre-Handover.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
