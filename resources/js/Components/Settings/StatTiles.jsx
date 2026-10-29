/** Kartu statistik ringkas dengan label mikro uppercase dan angka tabular. */
export default function StatTiles({ items = [], className = '' }) {
    return (
        <div className={`mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#E2E5EA] bg-white px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{item.value}</p>
                    {item.hint && <p className="mt-0.5 text-[11px] text-gray-400">{item.hint}</p>}
                </div>
            ))}
        </div>
    );
}
