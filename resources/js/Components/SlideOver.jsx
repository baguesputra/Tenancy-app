import { useEffect } from 'react';

export default function SlideOver({ open, onClose, title, icon, children, maxWidth = 'max-w-xl' }) {
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose();
        if (open) document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E5EA] shrink-0">
                    <div className="flex items-center gap-2.5">
                        {icon && (
                            <div className="w-8 h-8 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center shrink-0">
                                {icon}
                            </div>
                        )}
                        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Tutup"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}