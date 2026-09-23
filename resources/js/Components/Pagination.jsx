import { Link } from '@inertiajs/react';

function stripLabel(html) {
    const text = String(html ?? '').replace(/<[^>]*>/g, '').trim();
    if (/previous/i.test(text)) return 'Halaman sebelumnya';
    if (/next/i.test(text)) return 'Halaman berikutnya';
    return text ? `Halaman ${text}` : 'Navigasi halaman';
}

export default function Pagination({ meta, links }) {
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between px-5 py-3">
            <p className="text-xs text-gray-500">
                Menampilkan {meta.from}–{meta.to} dari {meta.total}
            </p>
            <div className="flex gap-1">
                {links.map((link, idx) => (
                    <Link
                        key={idx}
                        href={link.url || '#'}
                        preserveScroll
                        aria-label={stripLabel(link.label)}
                        aria-current={link.active ? 'page' : undefined}
                        className={`min-w-[44px] min-h-[44px] px-2 flex items-center justify-center rounded-lg text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]
                            ${link.active ? 'bg-[#0F1E36] text-white' : 'text-gray-500 hover:bg-gray-100'}
                            ${!link.url ? 'opacity-30 pointer-events-none' : ''}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}