export default function FormField({ label, error, hint, required, className = '', children, compact = false, id }) {
    // `id` (opsional) menghubungkan label ke input & memberi id stabil untuk
    // hint/error, supaya screen reader bisa membacakan lewat aria-describedby.
    return (
        <div className={`${compact ? 'mb-3' : 'mb-5'} ${className}`}>
            {label && (
                <label
                    htmlFor={id}
                    className={`block font-medium text-gray-700 ${compact ? 'text-xs mb-1' : 'text-sm mb-1.5'}`}
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
                </label>
            )}
            <div className="relative">
                {children}
            </div>
            {hint && !error && (
                <p id={id ? `${id}-hint` : undefined} className="text-xs text-gray-400 mt-1">{hint}</p>
            )}
            {error && (
                <p id={id ? `${id}-error` : undefined} className="text-xs text-red-500 mt-1 flex items-center gap-1" role="alert">
                    <span aria-hidden="true">⚠</span> {error}
                </p>
            )}
        </div>
    );
}