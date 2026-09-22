import { useEffect, useRef, useState } from 'react';

const dotColor = {
    approved: 'bg-[#1FA24C]',
    rejected: 'bg-red-500',
    pending: 'bg-gray-200',
};

const textColor = {
    approved: 'text-emerald-700',
    rejected: 'text-red-700',
    pending: 'text-gray-500',
};

const statusLabel = { approved: 'Disetujui', rejected: 'Ditolak', pending: 'Menunggu' };

export default function StepProgressMini({ steps }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open ]);

    const currentIdx = steps.findIndex((s) => s.status === 'pending');
    const done = steps.filter((s) => s.status === 'approved').length;

    return (
        <div ref={wrapRef} className="relative inline-block">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                aria-expanded={open}
                aria-label={`Progress ${done} dari ${steps.length} tahap disetujui. Klik untuk detail.`}
                title={steps.map((s) => `${s.label}: ${statusLabel[s.status] ?? s.status}`).join('\n')}
                className="flex items-center gap-1 rounded-md px-1 py-1 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
            >
                {steps.map((step, idx) => (
                    <span
                        key={idx}
                        aria-hidden="true"
                        className={`h-1.5 rounded-full transition-all duration-300 ${dotColor[step.status]} ${
                            step.status === 'pending' && idx === currentIdx ? 'w-4 animate-pulse' : 'w-2.5'
                        }`}
                    />
                ))}
                <span className="ml-1 text-[10px] font-medium text-gray-400 tabular-nums">{done}/{steps.length}</span>
            </button>
            {open && (
                <div className="absolute left-0 top-full z-20 mt-1.5 w-56 rounded-xl border border-[#E2E5EA] bg-white p-2.5 shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <ol className="space-y-1.5">
                        {steps.map((s, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor[s.status]}`} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-gray-700">{s.label}</span>
                                <span className={`shrink-0 font-medium ${textColor[s.status]}`}>{statusLabel[s.status] ?? s.status}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
