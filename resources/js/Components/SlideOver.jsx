import { useEffect } from 'react';

export default function SlideOver({ open, onClose, title, subtitle, icon, children, footer, maxWidth = 'max-w-xl' }) {
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose();
        if (open) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    return (
        <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            />

            <div
                className={`absolute inset-y-0 right-0 w-full ${maxWidth} bg-white shadow-xl flex flex-col
                    transition-transform duration-200 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E2E5EA] bg-white shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {icon && (
                            <div className="w-8 h-8 rounded-lg bg-[#0F1E36] text-white flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4" aria-hidden="true">
                                {icon}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">{title}</h2>
                            {subtitle && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        aria-label="Tutup"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-[#F7F8FA]">
                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 border-t border-[#E2E5EA] bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}