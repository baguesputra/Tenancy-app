import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

/**
 * Pratinjau foto sidak yang sudah tersimpan. `photos` = [{ url, caption? }],
 * `index` foto yang dibuka pertama. Panah + keyboard bila lebih dari satu.
 */
export default function PhotoPreviewModal({ photos = [], index = 0, onClose }) {
    const [current, setCurrent] = useState(index);
    const closeRef = useRef(null);
    const total = photos.length;
    const photo = photos[current];

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
            if (e.key === 'ArrowRight') setCurrent((i) => Math.min(i + 1, total - 1));
            if (e.key === 'ArrowLeft') setCurrent((i) => Math.max(i - 1, 0));
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose, total]);

    if (!photo) return null;

    const go = (dir) => setCurrent((i) => Math.min(Math.max(i + dir, 0), total - 1));

    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Pratinjau foto sidak">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

            <div className="relative flex items-center justify-between px-3 py-2 text-white shrink-0">
                <span className="text-sm tabular-nums">{total > 1 ? `${current + 1} / ${total}` : ''}</span>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup pratinjau"
                    className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
                {current > 0 && (
                    <button type="button" onClick={() => go(-1)} aria-label="Foto sebelumnya" className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                <img src={photo.url} alt={photo.caption || 'Foto sidak'} className="max-h-full max-w-full object-contain" />
                {current < total - 1 && (
                    <button type="button" onClick={() => go(1)} aria-label="Foto berikutnya" className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
            </div>

            {photo.caption && (
                <p className="relative shrink-0 px-4 py-3 text-center text-sm text-white/90">{photo.caption}</p>
            )}
        </div>,
        document.body
    );
}
