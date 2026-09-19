import { useMemo, useRef, useState } from 'react';

// ponytail: filter client-side, pindah ke server search saat opsi >1000.
export default function SearchableSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Ketik untuk mencari...',
    error,
    disabled = false,
    clearable = true,
    showCount = true,
    className = '',
    name,
}) {
    const rootRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);

    const selected = options.find((o) => o.value == value) ?? null;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    const emit = (v) => onChange && onChange({ target: { value: v, name } });

    const pick = (opt) => {
        emit(opt.value);
        setQuery(opt.label);
        setOpen(false);
    };

    const clear = () => {
        emit('');
        setQuery('');
        setOpen(false);
    };

    const closeOutside = (e) => {
        if (rootRef.current && !rootRef.current.contains(e.target)) {
            setOpen(false);
            setQuery(selected ? selected.label : '');
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            if (open && filtered[highlight]) {
                e.preventDefault();
                pick(filtered[highlight]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery(selected ? selected.label : '');
        }
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <input
                type="text"
                name={name}
                disabled={disabled}
                value={open ? query : (selected ? selected.label : '')}
                placeholder={placeholder}
                autoComplete="off"
                onFocus={() => { setOpen(true); setQuery(''); setHighlight(0); document.addEventListener('mousedown', closeOutside); }}
                onBlur={() => document.removeEventListener('mousedown', closeOutside)}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
                onKeyDown={onKeyDown}
                className={`w-full pl-3.5 ${selected && clearable ? 'pr-16' : 'pr-10'} py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                    bg-white border rounded-lg focus:ring-2 focus:ring-offset-0
                    transition-all duration-200 ease-out
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                    }
                    ${disabled ? 'opacity-70 bg-gray-50' : ''}`}
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {selected && clearable && !disabled && (
                    <button
                        type="button"
                        onClick={clear}
                        aria-label="Hapus pilihan"
                        className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <span className="text-xs leading-none">×</span>
                    </button>
                )}
                <svg className={`h-4 w-4 text-gray-400 transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {open && !disabled && (
                <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filtered.map((opt, idx) => (
                            <button
                                key={opt.value}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(opt)}
                                onMouseEnter={() => setHighlight(idx)}
                                className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors flex justify-between items-center gap-2
                                    ${idx === highlight ? 'bg-[#0F1E36]/5' : ''}
                                    ${opt.value == value ? 'font-medium text-[#0F1E36]' : 'text-gray-700'}`}
                            >
                                <span className="truncate">{opt.label}</span>
                                {opt.value == value && <span aria-hidden="true">✓</span>}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="px-3.5 py-4 text-sm text-gray-400 text-center">Tidak ditemukan.</p>
                        )}
                    </div>
                    {showCount && (
                        <div className="border-t border-gray-100 bg-gray-50 px-3.5 py-2 text-xs text-gray-500">
                            Menampilkan {filtered.length} dari {options.length} data
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
