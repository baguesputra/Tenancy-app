import { createPortal } from 'react-dom';
import { useEffect } from 'react';

const RULES = [
    'Kartu loading hanya berlaku untuk izin MASUK BARANG.',
    'Waktu masuk barang: 07.30 – 10.00 WITA, 15.00 – 17.00 WITA, 22.00 – 23.00 WITA.',
    'Masuk barang hanya melalui Lift loading Mall A (Utara/Pos Pagar) dan Lift loading Mall B (Selatan/Pos loading DM2).',
    'KELUAR BARANG WAJIB mengurus surat izin ke kantor manajemen.',
];

const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

export function LoadingCard({ permit, qrImage, expiresLabel, isGoods, compact = false }) {
    const logo = permit.tenant?.logo_url;
    const name = permit.tenant?.name ?? permit.store_name_snapshot;
    return (
        <div id="loading-card-print" className="bg-white text-gray-900 rounded-xl border border-[#E2E5EA] overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b-2 border-[#0F1E36]">
                {logo ? (
                    <img src={logo} alt={`Logo ${name}`} className="h-9 w-9 rounded-full object-contain bg-gray-50 border border-[#E2E5EA] p-0.5 shrink-0" />
                ) : (
                    <span className="w-9 h-9 rounded-full bg-[#0F1E36] text-white text-xs font-semibold inline-flex items-center justify-center shrink-0" aria-hidden="true">
                        {initials(name)}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.18em] leading-tight">DUTA MALL</p>
                    <p className="text-[9px] text-gray-500 tracking-widest leading-tight">{isGoods ? 'KARTU LOADING — MASUK BARANG' : 'SURAT IZIN'}</p>
                </div>
                <p className="font-mono text-xs font-bold truncate">{permit.permit_number}</p>
            </div>
            <div className="flex flex-col sm:flex-row">
                <div className="sm:w-44 shrink-0 px-3.5 py-3 text-center sm:border-r border-b sm:border-b-0 border-gray-100">
                    {qrImage && (
                        <img src={qrImage} alt={`QR ${permit.permit_number}`} className="w-32 h-32 sm:w-36 sm:h-36 mx-auto border-2 border-gray-200 rounded-xl" />
                    )}
                    <p className="mt-2 text-[9px] text-gray-400 truncate">{permit.store_name_snapshot}</p>
                    <p className="mt-1.5 text-[10px] font-bold bg-amber-100 border border-amber-300 rounded-lg px-2 py-1.5 leading-tight">
                        BERLAKU s/d:<br />{expiresLabel ?? '—'}
                    </p>
                </div>
                {!compact && isGoods && (
                    <div className="flex-1 px-3.5 py-3 text-[11px] leading-relaxed">
                        <p className="text-[11px] font-bold mb-1.5">PERATURAN KARTU LOADING</p>
                        <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                            {RULES.map((r) => <li key={r}>{r}</li>)}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LoadingCardModal({ open, onClose, permit, qrImage, expiresLabel, isGoods }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Pratinjau kartu loading">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full sm:max-w-2xl sm:max-h-[90vh] h-[100dvh] sm:h-auto flex flex-col bg-[#F7F8FA] rounded-none sm:rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur border-b border-gray-100 shrink-0">
                    <p className="text-sm font-semibold text-gray-900">Pratinjau Kartu</p>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup pratinjau"
                        className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 sm:flex-none p-3 sm:p-4 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                    <LoadingCard permit={permit} qrImage={qrImage} expiresLabel={expiresLabel} isGoods={isGoods} />
                </div>
                <div className="flex gap-2 p-3 sm:p-4 bg-white/95 backdrop-blur border-t border-gray-100 shrink-0">
                    <a
                        href={`/portal/permits/${permit.id}/qr.pdf`}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 min-h-[48px] text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors"
                    >
                        Download PDF
                    </a>
                    <a
                        href={`/portal/permits/${permit.id}/qr.pdf`}
                        target="_blank"
                        rel="noopener"
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 min-h-[48px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Print Kartu
                    </a>
                </div>
            </div>
        </div>,
        document.body
    );
}
