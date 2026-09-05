export default function FormField({ label, error, hint, required, children }) {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
            {hint && !error && (
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
            )}
            {error && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠</span> {error}
                </p>
            )}
        </div>
    );
}