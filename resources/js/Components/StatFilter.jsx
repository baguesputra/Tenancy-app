export default function StatFilter({ stats = [], activeKey = '', onSelect, columns = 'grid-cols-2 sm:grid-cols-4' }) {
    return (
        <div className={`grid ${columns} gap-2.5 sm:gap-3 mb-4`}>
            {stats.map((s) => {
                const active = activeKey === s.key;
                return (
                    <button
                        key={s.label}
                        onClick={() => onSelect(s.key)}
                        aria-pressed={active}
                        className={`text-left bg-white rounded-xl border px-3.5 sm:px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${active ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300 hover:shadow-sm'}`}
                    >
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                            {s.label}
                        </span>
                        <span className="block text-lg sm:text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                    </button>
                );
            })}
        </div>
    );
}
