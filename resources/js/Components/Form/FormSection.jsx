export default function FormSection({ title, description, children }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mb-4">
            {title && (
                <div className="mb-4">
                    <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
                    {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
}