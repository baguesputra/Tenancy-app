import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import LooSectionForm from '@/Components/Loo/LooSectionForm';

// Baris ringkas progress per dept: "Legal 3/5 · Finance 0/8". Dept milik
// user ditandai titik emerald agar terpantau tanpa scroll.
function DeptProgressRow({ rows = [], editableDepartments = [] }) {
    if (rows.length === 0) return null;
    return (
        <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Progress per departemen">
            {rows.map((r) => {
                const mine = (editableDepartments ?? []).includes(r.key);
                const done = r.total > 0 && r.filled >= r.total;
                return (
                    <span
                        key={r.key}
                        className={`inline-flex items-center gap-1.5 px-2.5 min-h-7 rounded-full text-xs border tabular-nums ${
                            done
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                    >
                        {mine && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />}
                        <span className="font-medium">{r.label}</span>
                        <span>{r.filled}/{r.total}</span>
                    </span>
                );
            })}
        </div>
    );
}

// Pesan untuk fase yang masih terkunci oleh pipeline.
function LockedNotice({ label }) {
    return (
        <div className="py-8 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-700">🔒 Terkunci</p>
            <p className="mt-1">{label} baru bisa diisi setelah tahap sebelumnya selesai.</p>
        </div>
    );
}

export default function FitoutChecklist({
    loo,
    preSection = null,
    postSection = null,
    preHandoverSection = null,
    preConfig = null,
    postConfig = null,
    preHandoverConfig = null,
    progress = null,
    canEditPre = false,
    canEditPost = false,
    canEditPreHandover = false,
    editableDepartments = [],
    canGmAcknowledge = false,
}) {
    const [submitting, setSubmitting] = useState(false);

    const phaseState = (key) => progress?.phases?.find((p) => p.key === key)?.state ?? null;
    const lockedPreHandover = phaseState('pengukuran_ulang') === 'locked';
    const lockedPre = phaseState('sebelum_fitout') === 'locked';
    const lockedPost = phaseState('setelah_fitout') === 'locked';

    // Tab awal = fase pertama yang belum terkunci.
    const lockedMap = { pre_handover: lockedPreHandover, pre: lockedPre, post: lockedPost };
    const initialTab = ['pre_handover', 'pre', 'post'].find((t) => !lockedMap[t]) ?? 'pre_handover';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [focusMine, setFocusMine] = useState(false);

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

    // Lompat ke blok dept + fokuskan kontrol pertama di dalamnya.
    const jumpToDept = (e, sectionKey, dept) => {
        e.preventDefault();
        const el = document.getElementById(`${sectionKey}-${dept}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => {
            el.querySelector('input, textarea, select')?.focus({ preventScroll: true });
        }, 450);
    };
    // Label departemen untuk chip lompat (diambil dari config).
    const deptLabel = (key) => [preConfig, postConfig]
        .flatMap((c) => c?.fields?.find((f) => f.type === 'checklist_table')?.departments ?? [])
        .find((d) => d.key === key)?.label ?? key;

    // Departemen yang bisa diisi user, dibatasi ke yang ada di config tab-nya.
    const deptKeys = (cfg) => (cfg?.fields?.find((f) => f.type === 'checklist_table')?.departments ?? []).map((d) => d.key);
    const editablePre = (editableDepartments ?? []).filter((d) => deptKeys(preConfig).includes(d));
    const editablePost = (editableDepartments ?? []).filter((d) => deptKeys(postConfig).includes(d));

    // Ringkasan progress per dept (terisi/total item) dari data tersimpan.
    const deptProgress = (config, sectionData) => (config?.fields
        ?.find((f) => f.type === 'checklist_table')
        ?.departments ?? []).map((d) => {
        const items = d.items ?? {};
        const total = Object.keys(items).length;
        const saved = sectionData?.checklist?.[d.key]?.items ?? {};
        const filled = Object.keys(items).filter(
            (k) => saved[k]?.status === 'Ok' || saved[k]?.status === 'Tidak'
        ).length;
        return { key: d.key, label: d.label, filled, total };
    });

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto scroll-smooth">
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
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 gap-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pre_handover')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'pre_handover'
                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>1. Pengukuran Ulang</span>
                        {lockedPreHandover && <span className="text-xs text-gray-400" aria-label="Terkunci">🔒</span>}
                        <Badge color={preHandoverState === 'submitted' ? 'green' : preHandoverState === 'draft' ? 'amber' : 'gray'} size="sm">
                            {preHandoverState === 'submitted' ? 'Disubmit' : preHandoverState === 'draft' ? 'Draft' : 'Belum'}
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('pre')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === 'pre'
                                ? 'border-[#0F1E36] text-[#0F1E36]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>2. Sebelum Fitout</span>
                        {lockedPre && <span className="text-xs text-gray-400" aria-label="Terkunci">🔒</span>}
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
                        <span>3. Setelah Fitout</span>
                        {lockedPost && <span className="text-xs text-gray-400" aria-label="Terkunci">🔒</span>}
                        <Badge color={postState === 'submitted' ? 'green' : postState === 'draft' ? 'amber' : 'gray'} size="sm">
                            {postState === 'submitted' ? 'Disubmit' : postState === 'draft' ? 'Draft' : 'Belum'}
                        </Badge>
                        {gmApprovedPost && (
                            <span className="text-[10px] text-emerald-600 font-bold">✓ Approved GM</span>
                        )}
                    </button>
                    {(editableDepartments ?? []).length > 0 && (
                        <button
                            type="button"
                            onClick={() => setFocusMine((v) => !v)}
                            aria-pressed={focusMine}
                            title="Redupkan ekstra bagian di luar wewenang Anda"
                            className={`ml-auto mb-2 px-3 min-h-9 rounded-full text-xs font-medium border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36] ${
                                focusMine
                                    ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            Fokus bagian saya{focusMine ? ' ✓' : ''}
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'pre' && (
                    <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Checklist Sebelum Selesai Fit Out</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Verifikasi kesiapan dokumen, tagihan, dan area sebelum pengerjaan fit out.
                                </p>
                            </div>
                            <Badge color={preState === 'submitted' ? 'green' : preState === 'draft' ? 'amber' : 'gray'} size="sm">
                                {preState === 'submitted' ? 'Disubmit' : preState === 'draft' ? 'Draft' : 'Belum diisi'}
                            </Badge>
                        </div>

                        {lockedPre ? (
                            <LockedNotice label="Checklist Sebelum Fitout" />
                        ) : preConfig ? (
                            <>
                                {(terminal || !canEditPre) && (
                                    <p className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
                                        Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.
                                    </p>
                                )}
                                {!terminal && canEditPre && editablePre.length > 0 && (
                                    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                                        <p className="text-xs text-blue-800 mb-2">
                                            Anda dapat mengisi bagian di bawah ini. Bagian lain hanya tampil untuk dilihat.
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {editablePre.map((dept) => (
                                                <a
                                                    key={dept}
                                                    href={`#fitout_checklist_pre-${dept}`}
                                                    onClick={(e) => jumpToDept(e, 'fitout_checklist_pre', dept)}
                                                    className="px-3 min-h-8 inline-flex items-center rounded-full bg-[#0F1E36] text-white text-xs font-medium hover:bg-[#1a2f52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
                                                >
                                                    Isi: {deptLabel(dept)}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <DeptProgressRow rows={deptProgress(preConfig, preSection?.data)} editableDepartments={editableDepartments} />
                                <LooSectionForm
                                    looId={loo.id}
                                    sectionKey="fitout_checklist_pre"
                                    config={preConfig}
                                    section={preSection}
                                    options={{}}
                                    submitting={submitting}
                                    readOnly={terminal || !canEditPre}
                                    editableDepartments={editableDepartments}
                                    focusMode={focusMine}
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

                        {lockedPost ? (
                            <LockedNotice label="Checklist Setelah Fitout" />
                        ) : postConfig ? (
                            <>
                                {(terminal || !canEditPost) && (
                                    <p className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
                                        Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.
                                    </p>
                                )}
                                {!terminal && canEditPost && editablePost.length > 0 && (
                                    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                                        <p className="text-xs text-blue-800 mb-2">
                                            Anda dapat mengisi bagian di bawah ini. Bagian lain hanya tampil untuk dilihat.
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {editablePost.map((dept) => (
                                                <a
                                                    key={dept}
                                                    href={`#fitout_checklist_post-${dept}`}
                                                    onClick={(e) => jumpToDept(e, 'fitout_checklist_post', dept)}
                                                    className="px-3 min-h-8 inline-flex items-center rounded-full bg-[#0F1E36] text-white text-xs font-medium hover:bg-[#1a2f52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
                                                >
                                                    Isi: {deptLabel(dept)}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <DeptProgressRow rows={deptProgress(postConfig, postSection?.data)} editableDepartments={editableDepartments} />
                                <LooSectionForm
                                    looId={loo.id}
                                    sectionKey="fitout_checklist_post"
                                    config={postConfig}
                                    section={postSection}
                                    options={{}}
                                    submitting={submitting}
                                    readOnly={terminal || !canEditPost}
                                    editableDepartments={editableDepartments}
                                    focusMode={focusMine}
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
                                <h2 className="text-base font-semibold text-gray-900">Pengukuran Ulang</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Unggah Berita Acara Pengukuran Ulang, lalu Berita Acara Serah Terima Ruangan setelah yang pertama tersimpan.
                                </p>
                            </div>
                            <Badge color={preHandoverState === 'submitted' ? 'green' : preHandoverState === 'draft' ? 'amber' : 'gray'} size="sm">
                                {preHandoverState === 'submitted' ? 'Disubmit' : preHandoverState === 'draft' ? 'Draft' : 'Belum diisi'}
                            </Badge>
                        </div>

                        {lockedPreHandover ? (
                            <LockedNotice label="Pengukuran Ulang" />
                        ) : preHandoverConfig ? (
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
                                Section ini baru dapat diisi saat LOO mencapai stage Pengukuran Ulang.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
