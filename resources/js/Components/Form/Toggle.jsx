/**
 * Switch tunggal bergaya korporat. Target sentuh 44px, status dibawa
 * `role="switch"` + `aria-checked`. Tanpa `label` (mis. di dalam tabel),
 * nama aksesibel wajib lewat `ariaLabel`.
 */
export default function Toggle({ checked = false, onChange, label, description, ariaLabel, id, disabled = false, className = '' }) {
    const inputId = id ?? `toggle-${String(label ?? ariaLabel ?? 'opsi').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const button = (
        <button
            type="button"
            id={inputId}
            role="switch"
            aria-checked={checked}
            aria-labelledby={label ? `${inputId}-label` : undefined}
            aria-label={label ? undefined : ariaLabel}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]
                ${checked ? 'bg-[#0F1E36]' : 'bg-gray-300'}
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none
                    ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );

    if (!label) return <span className={className}>{button}</span>;

    return (
        <div className={`flex items-start justify-between gap-3 ${className}`}>
            <div className="min-w-0">
                <span id={`${inputId}-label`} className="block text-sm font-medium text-gray-900">{label}</span>
                {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
            </div>
            {button}
        </div>
    );
}