import { useMemo, useRef, useState } from 'react';

// Dropdown multi-pilih: pola visual mengikuti SearchableSelect,
// nilai onChange berupa array (bukan event).
export default function MultiSelect({
    value = [],
    onChange,
    options = [],
    placeholder = 'Pilih...',
    error,
    disabled = false,
    className = '',
}) {
    const rootRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef(null);

    const selected = useMemo(
        () => options.filter((o) => value.includes(o.value)),
        [options, value]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    const toggle = (v) => {
        if (disabled) return;
        const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
        onChange && onChange(next);
    };

    const clearAll = () => {
        onChange && onChange([]);
    };

    const close = () => {
        setOpen(false);
        setQuery('');
        document.removeEventListener('mousedown', closeOutside);
    };

    const closeOutside = (e) => {
        if (rootRef.current && !rootRef.current.contains(e.target)) {
            close();
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') close();
    };

    const summary = selected.length === 0
        ? null
        : selected.length <= 2
        ? selected.map((o) => o.label).join(', ')
        : `${selected[0].label}, ${selected[1].label} +${selected.length - 2}`;

    return (
        <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (open) {
                        close();
                    } else {
                        setOpen(true);
                        setQuery('');
                        document.addEventListener('mousedown', closeOutside);
                        requestAnimationFrame(() => searchRef.current?.focus());
                    }
                }}
                aria-expanded={open}
                aria-label={placeholder}
                className={`w-full flex items-center justify-between gap-2 pl-3.5 pr-10 py-2.5 text-sm
                    bg-white border rounded-lg focus:ring-2 focus:ring-offset-0
                    transition-all duration-200 ease-out text-left
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                    }
                    ${disabled ? 'opacity-70 bg-gray-50' : ''}`}
            >
                <span className={`truncate ${summary ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {summary ?? placeholder}
                </span>
                {selected.length > 0 && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#0F1E36]/5 text-[#0F1E36]">
                        {selected.length} dipilih
                    </span>
                )}
                <svg className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && !disabled && (
                <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ketik untuk mencari..."
                            autoComplete="off"
                            className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0F1E36]"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filtered.map((opt) => {
                            const on = value.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggle(opt.value)}
                                    aria-pressed={on}
                                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex items-center gap-2.5 hover:bg-gray-50
                                        ${on ? 'font-medium text-[#0F1E36]' : 'text-gray-700'}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors
                                            ${on ? 'bg-[#0F1E36] border-[#0F1E36] text-white' : 'bg-white border-gray-300'}`}
                                    >
                                        {on && (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="truncate">{opt.label}</span>
                                </button>
                            );
                        })}
                        {filtered.length === 0 && (
                            <p className="px-3.5 py-4 text-sm text-gray-400 text-center">Tidak ditemukan.</p>
                        )}
                    </div>
                    <div className="border-t border-gray-100 bg-gray-50 px-3.5 py-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 tabular-nums">{selected.length} dipilih</span>
                        {selected.length > 0 && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                                Bersihkan
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
