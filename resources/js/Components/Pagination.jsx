import { Link } from '@inertiajs/react';

export default function Pagination({ meta, links }) {
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E5EA]">
            <p className="text-xs text-gray-500">
                Menampilkan {meta.from}–{meta.to} dari {meta.total}
            </p>
            <div className="flex gap-1">
                {links.map((link, idx) => (
                    <Link
                        key={idx}
                        href={link.url || '#'}
                        preserveScroll
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                            ${link.active ? 'bg-[#0F1E36] text-white' : 'text-gray-500 hover:bg-gray-100'}
                            ${!link.url ? 'opacity-30 pointer-events-none' : ''}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}