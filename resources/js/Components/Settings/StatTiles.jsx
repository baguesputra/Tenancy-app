/** Satu strip ringkasan: angka dan labelnya dibagi garis, bukan kartu terpisah. */
export default function StatTiles({ items = [], className = '' }) {
    return (
        <div className={`mb-4 overflow-hidden rounded-xl border border-[#E2E5EA] bg-[#E2E5EA] ${className}`}>
            <dl className="grid grid-cols-2 gap-px sm:grid-cols-3">
                {items.map((item) => (
                    <div key={item.label} className="bg-white px-4 py-3">
                        <dt className="text-xs text-gray-500">{item.label}</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{item.value}</dd>
                        {item.hint && <dd className="mt-0.5 text-xs text-gray-400">{item.hint}</dd>}
                    </div>
                ))}
            </dl>
        </div>
    );
}
