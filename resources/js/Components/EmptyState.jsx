export default function EmptyState({ title, hint, actionLabel, onAction }) {
    return (
        <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">{title}</p>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="mt-3 min-h-[44px] px-4 text-sm text-[#0F1E36] font-medium hover:underline rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
