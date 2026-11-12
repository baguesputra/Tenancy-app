export default function DataTable({ columns, footer, children, caption }) {
    return (
        <div className="overflow-hidden rounded-lg border border-[#E2E5EA] bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    {caption && <caption className="sr-only">{caption}</caption>}
                    <thead>
                        <tr className="border-b border-[#E2E5EA]">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={`whitespace-nowrap px-5 py-3 text-left text-xs font-semibold text-slate-900 ${col.className ?? ''}`}
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
