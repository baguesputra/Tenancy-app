import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import { IconCheck, IconLock } from '@/Components/Icons';
import LooSectionForm from '@/Components/Loo/LooSectionForm';

// Tiga langkah operasional yang tampil di halaman ini. Urutan array = urutan
// gating di `config/loo.php`, jadi langkah sebelumnya adalah prasyaratnya.
// `sectionKey` dipakai sekaligus sebagai `idPrefix` ChecklistTable dan key
// endpoint submit section.
const STEPS = [
    {
        key: 'pre_handover',
        phase: 'pengukuran_ulang',
        sectionKey: 'pre_handover',
        railLabel: 'Pengukuran Ulang',
        title: 'Pengukuran Ulang',
        description: 'Unggah Berita Acara Pengukuran Ulang, lalu Berita Acara Serah Terima Ruangan setelah yang pertama tersimpan.',
        emptyMessage: 'Section ini baru dapat diisi saat LOO mencapai stage Pengukuran Ulang.',
        readOnlyNotice: 'Mode lihat saja — section ini hanya bisa diisi oleh tim Tenant Management.',
    },
    {
        key: 'pre',
        phase: 'sebelum_fitout',
        sectionKey: 'fitout_checklist_pre',
        railLabel: 'Sebelum Fitout',
        title: 'Checklist Sebelum Selesai Fit Out',
        description: 'Verifikasi kesiapan dokumen, tagihan, dan area sebelum pengerjaan fit out.',
        emptyMessage: 'Checklist ini belum dapat diisi untuk stage saat ini.',
        readOnlyNotice: 'Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.',
    },
    {
        key: 'post',
        phase: 'setelah_fitout',
        sectionKey: 'fitout_checklist_post',
        railLabel: 'Setelah Fitout',
        title: 'Checklist Setelah Selesai Fit Out',
        description: 'Stage Fitout — verifikasi hasil pengerjaan 5 departemen (Legal, Finance, Tenancy, Engineering, Kontraktor).',
        emptyMessage: 'Checklist ini belum dapat diisi (LOO belum mencapai stage Fitout).',
        readOnlyNotice: 'Mode lihat saja — setiap bagian hanya bisa diisi oleh role yang bersangkutan.',
    },
];

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

const FITOUT_SECTION_KEYS = ['pre_handover', 'fitout_checklist_pre', 'fitout_checklist_post'];

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
                                : 'bg-slate-50 text-slate-600 border-slate-200'
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

// Status satu langkah: Disubmit / Draft / Belum diisi.
function StateBadge({ state }) {
    const color = state === 'submitted' ? 'green' : state === 'draft' ? 'amber' : 'gray';
    const label = state === 'submitted' ? 'Disubmit' : state === 'draft' ? 'Draft' : 'Belum diisi';
    return <Badge color={color} size="sm">{label}</Badge>;
}

// Strip metrik ringkas (hairline `gap-px`) — pola yang sama dengan FloorPlan/Index.
function KpiStrip({ items = [] }) {
    return (
        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 rounded-lg border border-slate-200 overflow-hidden">
            {items.map((k) => (
                <div key={k.label} className="bg-white px-4 py-3">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{k.label}</dt>
                    <dd className="mt-1 flex items-baseline gap-1.5">
                        <span className={`${k.small ? 'text-sm font-semibold' : 'text-xl font-semibold tabular-nums'} ${k.tone ?? 'text-slate-900'}`}>
                            {k.value}
                        </span>
                        {k.hint && <span className="text-xs text-slate-500">{k.hint}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

// Rail 3 langkah bernomor: node 32px + label + status, dengan penanda aktif.
function StepRail({ steps, activeKey, onSelect, stateOf, lockedOf, prerequisiteFor }) {
    return (
        <ol
            className="mt-4 flex flex-col sm:flex-row border border-slate-200 rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
            aria-label="Tahapan checklist"
        >
            {steps.map((step, i) => {
                const state = stateOf(step.key);
                const done = state === 'submitted';
                const locked = lockedOf(step.key);
                const active = activeKey === step.key;
                const node = done
                    ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                    : locked
                        ? 'bg-slate-50 text-slate-500 border-slate-300'
                        : active
                            ? 'bg-white text-[#0F1E36] border-[#0F1E36]'
                            : 'bg-white text-slate-600 border-slate-300';
                const sub = done
                    ? 'Selesai'
                    : active
                        ? 'Sedang dikerjakan'
                        : locked
                            ? `Menunggu ${prerequisiteFor(step.key)}`
                            : 'Belum dimulai';
                return (
                    <li key={step.key} className="flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => onSelect(step.key)}
                            aria-current={active ? 'step' : undefined}
                            className={`relative flex w-full items-center gap-3 px-4 min-h-16 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F1E36] ${
                                active ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                            }`}
                        >
                            {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-[#0F1E36]" aria-hidden="true" />}
                            <span className={`flex items-center justify-center w-8 h-8 rounded-full border shrink-0 text-xs font-semibold tabular-nums ${node}`} aria-hidden="true">
                                {done ? <IconCheck className="w-4 h-4" /> : locked ? <IconLock className="w-4 h-4" /> : i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className={`block text-sm truncate ${active ? 'font-semibold text-[#0F1E36]' : 'font-medium text-slate-900'}`}>
                                    {step.railLabel}
                                </span>
                                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{sub}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

// Pesan untuk fase yang masih terkunci oleh pipeline + prasyaratnya.
function LockedNotice({ label, prerequisite }) {
    return (
        <div className="py-8 text-center">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
                <IconLock className="w-5 h-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">{label} masih terkunci</p>
            <p className="mt-1 text-xs text-slate-500">
                Selesaikan dan submit tahap <span className="font-medium text-slate-700">{prerequisite}</span> lebih dulu.
            </p>
        </div>
    );
}

// Satu panel konten dipakai untuk ketiga langkah (dulu blok ini diduplikasi 3×).
function ChecklistPanel({
    step,
    state,
    locked,
    prerequisite,
    config,
    section,
    readOnlyNotice,
    editable = [],
    deptRows = [],
    editableDepartments = [],
    loo,
    submitting,
    onSubmit,
    headerBadges = null,
    footer = null,
    jumpToDept,
    deptLabel,
}) {
    return (
        <div className="mt-4 bg-white rounded-lg border border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900">{step.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {headerBadges}
                    <StateBadge state={state} />
                </div>
            </div>

            {locked ? (
                <LockedNotice label={step.title} prerequisite={prerequisite} />
            ) : !config ? (
                <p className="py-8 text-center text-sm text-slate-500">{step.emptyMessage}</p>
            ) : (
                <>
                    {readOnlyNotice && (
                        <p className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
                            {readOnlyNotice}
                        </p>
                    )}
                    {editable.length > 0 && (
                        <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                            <p className="text-xs text-slate-600 mb-2">
                                Anda dapat mengisi bagian di bawah ini. Bagian lain hanya tampil untuk dilihat.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {editable.map((dept) => (
                                    <a
                                        key={dept}
                                        href={`#${step.sectionKey}-${dept}`}
                                        onClick={(e) => jumpToDept(e, step.sectionKey, dept)}
                                        className="px-3 min-h-8 inline-flex items-center rounded-full bg-[#0F1E36] text-white text-xs font-medium hover:bg-[#1a2f52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]"
                                    >
                                        Isi: {deptLabel(dept)}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    <DeptProgressRow rows={deptRows} editableDepartments={editableDepartments} />
                    <LooSectionForm
                        key={step.key}
                        looId={loo.id}
                        sectionKey={step.sectionKey}
                        config={config}
                        section={section}
                        options={{}}
                        submitting={submitting}
                        readOnly={Boolean(readOnlyNotice)}
                        editableDepartments={editableDepartments}
                        onSubmit={onSubmit}
                    />
                    {footer}
                </>
            )}
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
    const phaseLabel = (key) => progress?.phases?.find((p) => p.key === key)?.label ?? key;

    const sectionOf = {
        pre_handover: preHandoverSection,
        pre: preSection,
        post: postSection,
    };
    const stateOf = (key) => {
        const s = sectionOf[key];
        return s ? (s.is_submitted ? 'submitted' : 'draft') : 'none';
    };
    const lockedOf = (key) => phaseState(STEPS.find((s) => s.key === key).phase) === 'locked';

    // Prasyarat satu langkah = langkah sebelumnya; untuk langkah pertama,
    // fase pipeline sebelum Pengukuran Ulang (Pengisian Divisi).
    const prerequisiteFor = (key) => {
        const i = STEPS.findIndex((s) => s.key === key);
        return i <= 0 ? phaseLabel('pengisian_divisi') : STEPS[i - 1].railLabel;
    };

    // Langkah awal = fase yang sedang aktif; kalau tidak ada, langkah pertama
    // yang belum terkunci.
    const initialTab = STEPS.find((s) => phaseState(s.phase) === 'active')?.key
        ?? STEPS.find((s) => !lockedOf(s.key))?.key
        ?? 'pre_handover';
    const [activeTab, setActiveTab] = useState(initialTab);

    const terminal = ['completed', 'cancelled'].includes(loo.status);

    const submitSection = ({ data, files }, submit, key) => {
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

    const acknowledgeGm = () => {
        setSubmitting(true);
        router.post(`/loos/${loo.id}/fitout/approve`, {}, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const gmApprovedPost = ! emptyValue(postSection?.data?.footer?.gm_approved);

    function emptyValue(val) {
        return val === null || val === undefined || val === false || val === '';
    }

    // Lompat ke blok dept + fokuskan kontrol pertama di dalamnya. `scroll-margin-top`
    // diberi inline agar target tidak tertutup header sticky (h-16).
    const jumpToDept = (e, sectionKey, dept) => {
        e.preventDefault();
        const el = document.getElementById(`${sectionKey}-${dept}`);
        if (!el) return;
        el.style.scrollMarginTop = '5rem';
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        el.querySelector('input, textarea, select')?.focus({ preventScroll: true });
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

    // Metrik ringkas dari `progress` (hanya 3 section fitout yang relevan).
    const fitoutSections = (progress?.phases ?? [])
        .flatMap((p) => p.sections ?? [])
        .filter((s) => FITOUT_SECTION_KEYS.includes(s.key));
    const filledItems = fitoutSections.reduce((n, s) => n + s.filled, 0);
    const totalItems = fitoutSections.reduce((n, s) => n + s.total, 0);
    const remainingItems = Math.max(totalItems - filledItems, 0);
    const daysList = fitoutSections
        .map((s) => s.updated_days_ago)
        .filter((d) => d !== null && d !== undefined);
    const lastUpdate = daysList.length > 0 ? Math.min(...daysList) : null;
    const activePhaseLabel = progress?.phases?.find((p) => p.state === 'active')?.label
        ?? (STATUS_LABELS[loo.status] ?? loo.status);

    const kpis = [
        {
            label: 'Item terisi',
            value: `${filledItems}/${totalItems}`,
            hint: totalItems > 0 ? `${Math.round((filledItems / totalItems) * 100)}%` : null,
        },
        {
            label: 'Sisa item',
            value: remainingItems,
            tone: remainingItems === 0 && totalItems > 0 ? 'text-emerald-600' : 'text-slate-900',
        },
        { label: 'Tahap aktif', value: activePhaseLabel, small: true },
        {
            label: 'Update terakhir',
            value: lastUpdate === null ? '—' : lastUpdate === 0 ? 'Hari ini' : lastUpdate,
            hint: lastUpdate === null || lastUpdate === 0 ? null : 'hari lalu',
            small: lastUpdate === 0,
        },
    ];

    const stepBinding = {
        pre_handover: { config: preHandoverConfig, section: preHandoverSection, canEdit: canEditPreHandover, editable: [] },
        pre: { config: preConfig, section: preSection, canEdit: canEditPre, editable: editablePre },
        post: { config: postConfig, section: postSection, canEdit: canEditPost, editable: editablePost },
    };

    const gmFooter = canGmAcknowledge && !terminal ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-[#0F1E36]">Approval Deputy General Manager</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {gmApprovedPost
                            ? `Telah disetujui oleh ${postSection?.data?.footer?.gm_name ?? 'Deputy GM'}.`
                            : 'Klik tombol untuk mengesahkan checklist selesai fit out.'}
                    </p>
                </div>
                <Button
                    variant={gmApprovedPost ? 'secondary' : 'primary'}
                    onClick={acknowledgeGm}
                    loading={submitting}
                    disabled={gmApprovedPost}
                >
                    {gmApprovedPost ? 'Sudah Disetujui' : 'Approve Checklist Fitout'}
                </Button>
            </div>
        </div>
    ) : null;

    const activeStep = STEPS.find((s) => s.key === activeTab);
    const activeBinding = stepBinding[activeTab];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate">
                                Checklist Operasional
                            </h1>
                            <Badge color={STATUS_COLORS[loo.status] ?? 'gray'} size="sm">
                                {STATUS_LABELS[loo.status] ?? loo.status}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
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

                {/* Banner status terminal */}
                {terminal && (
                    <p
                        role="status"
                        className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
                            loo.status === 'completed'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                    >
                        {loo.status === 'completed'
                            ? 'LOO sudah selesai — checklist terkunci dan menjadi arsip.'
                            : 'LOO dibatalkan — checklist tidak dapat diisi.'}
                    </p>
                )}

                <KpiStrip items={kpis} />

                <StepRail
                    steps={STEPS}
                    activeKey={activeTab}
                    onSelect={setActiveTab}
                    stateOf={stateOf}
                    lockedOf={lockedOf}
                    prerequisiteFor={prerequisiteFor}
                />

                <ChecklistPanel
                    step={activeStep}
                    state={stateOf(activeTab)}
                    locked={lockedOf(activeTab)}
                    prerequisite={prerequisiteFor(activeTab)}
                    config={activeBinding.config}
                    section={activeBinding.section}
                    readOnlyNotice={terminal || !activeBinding.canEdit ? activeStep.readOnlyNotice : null}
                    editable={activeBinding.editable}
                    deptRows={deptProgress(activeBinding.config, activeBinding.section?.data)}
                    editableDepartments={editableDepartments}
                    loo={loo}
                    submitting={submitting}
                    onSubmit={(args, submit) => submitSection(args, submit, activeStep.sectionKey)}
                    headerBadges={activeTab === 'post' && gmApprovedPost ? <Badge color="green" size="sm">Disetujui Deputy GM</Badge> : null}
                    footer={activeTab === 'post' ? gmFooter : null}
                    jumpToDept={jumpToDept}
                    deptLabel={deptLabel}
                />
            </div>
        </AppLayout>
    );
}