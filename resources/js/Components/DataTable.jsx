export default function DataTable({ columns, footer, children }) {
    return (
        <div className="bg-white rounded-xl border border-[#E2E5EA] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[#E2E5EA] bg-gray-50/60">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-5 py-3 ${col.className ?? ''}`}
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