import { useEffect, useRef, useState } from 'react';

function ItemBadge({ format }) {
    if (!format) return null;
    return (
        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-500 tabular-nums">
            {format}
        </span>
    );
}

export default function DropdownMenu({ label, icon, sections = [] }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const btnRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setOpen(false);
                btnRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open ]);

    return (
        <div className="relative" ref={rootRef}>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:border-gray-300 transition-colors min-h-[36px]"
            >
                {icon}
                <span className="hidden sm:inline">{label}</span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div
                    role="menu"
                    aria-label={label}
                    className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-3rem)] max-h-[70vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E5EA] shadow-xl z-30 overflow-hidden"
                >
                    {sections.map((sec) => (
                        <div key={sec.title} className="py-1.5 first:pt-2 last:pb-2">
                            <p className="px-4 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{sec.title}</p>
                            {sec.items.map((item) => (
                                item.disabled ? (
                                    <div key={item.label} className="px-4 py-2 opacity-60" aria-disabled="true">
                                        <span className="flex items-center gap-2.5 text-sm text-gray-500">
                                            {item.icon}
                                            <span className="font-medium">{item.label}<ItemBadge format={item.format} /></span>
                                        </span>
                                        <span className="block text-[11px] text-gray-400 mt-0.5 ml-[26px]">{item.disabledHint}</span>
                                    </div>
                                ) : item.href ? (
                                    <a
                                        key={item.label}
                                        role="menuitem"
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="flex items-start gap-2.5 px-4 py-2.5 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                    >
                                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                                        <span className="min-w-0">
                                            <span className="block font-medium text-gray-900">{item.label}<ItemBadge format={item.format} /></span>
                                            {item.description && <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>}
                                        </span>
                                    </a>
                                ) : (
                                    <button
                                        key={item.label}
                                        role="menuitem"
                                        type="button"
                                        onClick={() => { setOpen(false); item.onClick?.(); }}
                                        className="w-full flex items-start gap-2.5 px-4 py-2.5 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0F1E36]"
                                    >
                                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                                        <span className="min-w-0">
                                            <span className="block font-medium text-gray-900">{item.label}<ItemBadge format={item.format} /></span>
                                            {item.description && <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>}
                                        </span>
                                    </button>
                                )
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
