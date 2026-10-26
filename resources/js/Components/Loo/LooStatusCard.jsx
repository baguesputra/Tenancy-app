import Badge from '@/Components/Badge';

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

const DEFAULT_SECTION_BADGE = {
    none: { color: 'gray', label: 'Belum diisi' },
    draft: { color: 'yellow', label: 'Draft' },
    submitted: { color: 'green', label: 'Disubmit' },
};

/** Node stepper: check hijau (selesai), dot biru (aktif), circle kosong (terkunci). */
function StepNode({ state }) {
    if (state === 'done') {
        return (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </span>
        );
    }

    if (state === 'active') {
        return (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
            </span>
        );
    }

    return <span className="w-5 h-5 rounded-full border-2 border-gray-200" />;
}

function SectionRow({ section, badge }) {
    const pct = section.total > 0 ? Math.round((section.filled / section.total) * 100) : 0;

    return (
        <li className="text-xs">
            <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-800 truncate">{section.label}</span>
                <Badge color={badge.color} size="sm">{badge.label}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                    <div
                        className={`h-full rounded-full ${section.state === 'submitted' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">{section.filled}/{section.total} field</span>
            </div>
            {section.state !== 'none' && section.updated_days_ago != null && (
                <p className="text-[10px] text-slate-500 mt-0.5">diubah {section.updated_days_ago} hari lalu</p>
            )}
        </li>
    );
}

export default function LooStatusCard({ progress, loo = null, sectionBadge = DEFAULT_SECTION_BADGE }) {
    if (!progress) return null;

    const total = progress.phases.length;
    const activeIndex = progress.phases.findIndex((p) => p.state === 'active');
    const stepNumber = activeIndex >= 0 ? activeIndex + 1 : total;
    const statusLabel = STATUS_LABELS[progress.status] ?? progress.status;
    const statusColor = STATUS_COLORS[progress.status] ?? 'gray';
    const nextAction = (progress.summary ?? '').replace(/^Menunggu:\s*/, '');

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status LOO</p>
                <span className="text-xs text-slate-500">diupload {progress.days_since_upload} hari lalu</span>
            </div>

            {progress.status === 'completed' ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <svg className="w-5 h-5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-emerald-900">LOO selesai</p>
                        <p className="text-xs text-emerald-800 mt-0.5">{progress.summary}</p>
                    </div>
                </div>
            ) : progress.status === 'cancelled' ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-3">
                    <svg className="w-5 h-5 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-900">LOO dibatalkan</p>
                        <p className="text-xs text-red-800 mt-0.5">{progress.summary}</p>
                        {loo?.cancel_reason && (
                            <p className="text-xs text-red-700 mt-1">Alasan: {loo.cancel_reason}</p>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2 mt-3">
                        <span className="text-sm font-semibold text-gray-900">Tahap {stepNumber} dari {total}</span>
                        <Badge color={statusColor} size="sm">{statusLabel}</Badge>
                    </div>

                    <div
                        className="mt-2 grid gap-1"
                        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={stepNumber}
                        aria-label={`Tahap ${stepNumber} dari ${total}`}
                    >
                        {progress.phases.map((phase) => (
                            <span
                                key={phase.key}
                                className={`h-1.5 rounded-full ${
                                    phase.state === 'done'
                                        ? 'bg-emerald-500'
                                        : phase.state === 'active'
                                            ? 'bg-blue-500'
                                            : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>

                    <ol className="mt-4" aria-label="Tahap LOO">
                        {progress.phases.map((phase, i) => {
                            const meta = PHASE_STATE[phase.state] ?? PHASE_STATE.locked;
                            const isActive = phase.state === 'active';
                            const isLast = i === total - 1;

                            return (
                                <li
                                    key={phase.key}
                                    className="relative flex gap-3"
                                    aria-current={isActive ? 'step' : undefined}
                                >
                                    {!isLast && (
                                        <span
                                            className={`absolute left-2.5 top-6 bottom-0 w-px ${phase.state === 'done' ? 'bg-emerald-200' : 'bg-gray-200'}`}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span className="relative z-10 shrink-0 mt-0.5">
                                        <StepNode state={phase.state} />
                                    </span>
                                    <div className="min-w-0 flex-1 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${isActive ? 'font-semibold text-slate-900' : phase.state === 'done' ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                                                {phase.label}
                                            </span>
                                            <Badge color={meta.color} size="sm">{meta.label}</Badge>
                                        </div>

                                        {isActive && (
                                            <ul className="mt-2 space-y-2">
                                                {phase.sections.map((s) => (
                                                    <SectionRow
                                                        key={s.key}
                                                        section={s}
                                                        badge={sectionBadge[s.state] ?? sectionBadge.none}
                                                    />
                                                ))}
                                            </ul>
                                        )}

                                        {phase.state === 'locked' && (
                                            <p className="text-xs text-slate-500 mt-1">Terkunci sampai tahap sebelumnya selesai.</p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    <p className="text-xs text-gray-600 border-t border-gray-100 pt-3">
                        <span className="font-medium text-gray-800">Langkah berikutnya: </span>{nextAction}
                    </p>
                </>
            )}
        </div>
    );
}