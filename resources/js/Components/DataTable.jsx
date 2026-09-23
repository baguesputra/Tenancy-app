export default function DataTable({ columns, footer, children, caption }) {
    return (
        <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead className="sticky top-0">
                        <tr className="border-b border-[#E2E5EA] bg-gray-50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={`text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-5 py-3 whitespace-nowrap ${col.className ?? ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E5EA]">
                        {children}
                    </tbody>
                </table>
            </div>

            {footer && (
                <div className="border-t border-[#E2E5EA]">
                    {footer}
                </div>
            )}
        </div>
    );
}