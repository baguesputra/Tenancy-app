export default function FormField({ label, error, hint, required, className = '', children }) {
    return (
        <div className={`mb-5 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
                </label>
            )}
            <div className="relative">
                {children}
            </div>
            {hint && !error && (
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
            )}
            {error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1" role="alert">
                    <span aria-hidden="true">⚠</span> {error}
                </p>
            )}
        </div>
    );
}