export default function FilterBar({ children }) {
    return (
        <div className="sticky top-14 z-10 bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
            <div className="flex flex-col lg:flex-row gap-2">
                {children}
            </div>
        </div>
    );
}

export function FilterReset({ onClick, label = 'Reset' }) {
    return (
        <button
            onClick={onClick}
            className="px-3 py-2 min-h-[44px] text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] shrink-0"
        >
            {label}
        </button>
    );
}
