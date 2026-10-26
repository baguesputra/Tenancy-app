import { createPortal } from 'react-dom';
import { useEffect } from 'react';

import initials from '@/utils/initials';

export function UnitQrCard({ unit }) {
    const tenant = unit.active_tenancy?.tenant;
    const logo = tenant?.logo_url;
    const tenantName = tenant?.name ?? 'Unit Kosong';
    const status = unit.active_tenancy ? 'Terisi' : (unit.is_active ? 'Kosong' : 'Nonaktif');
    const statusColor = unit.active_tenancy ? 'bg-emerald-100 text-emerald-700' : (unit.is_active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500');
    return (
        <div className="bg-white text-slate-900 rounded-lg border border-[#E2E5EA] overflow-hidden">
            <div className="h-1.5 bg-[#FF6B6B]" />
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#0F1E36] text-white">
                {logo && <img src={logo} alt={`Logo ${tenantName}`} className="h-9 w-9 rounded-full object-cover bg-white p-0.5 shrink-0" />}
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[11px] font-bold tracking-[0.18em]">DUTA MALL</p>
                    <p className="text-[9px] text-white/60 tracking-widest">MANAJEMEN TENANT</p>
                </div>
                <span className="shrink-0 text-[10px] font-bold tracking-wide text-white bg-[#FF6B6B] rounded-full px-2.5 py-1">QR UNIT</span>
            </div>
            <div className="text-center bg-slate-50 border-b border-[#E2E5EA] px-3.5 py-2.5">
                <p className="font-mono text-xl font-bold tracking-wide">{unit.unit_code}</p>
                <p className="text-[11px] text-slate-500 truncate">{tenantName}</p>
            </div>
            <div className="flex flex-col sm:flex-row">
                <div className="sm:w-44 shrink-0 px-3.5 py-3 text-center sm:border-r border-b sm:border-b-0 border-[#E2E5EA]">
                    {unit.qr_image && (
                        <img src={unit.qr_image} alt={`QR ${unit.unit_code}`} className="w-32 h-32 sm:w-36 sm:h-36 mx-auto border-2 border-[#0F1E36] rounded-lg p-1" />
                    )}
                </div>
                <div className="flex-1 px-3.5 py-3 text-[11px] leading-relaxed text-slate-700">
                    <p className="text-[9px] text-slate-400 tracking-widest">LOKASI</p>
                    <p className="text-xs font-bold text-slate-900">Lt. {unit.floor}{unit.block ? ` · Blok ${unit.block}` : ''} · No. {unit.unit_number}</p>
                    <p className="mt-2 text-[9px] text-slate-400 tracking-widest">LUAS / STATUS</p>
                    <p className="text-xs font-bold text-slate-900">{unit.size ? `${unit.size} m²` : '—'}</p>
                    <span className={`mt-1.5 inline-block text-[10px] font-bold rounded-full px-2.5 py-1 ${statusColor}`}>{status}</span>
                    {/* Strip coral #FF6B6B / header navy / banner biru adalah identitas cetak UnitQrCard, sengaja tidak ikut token slate. */}
                    <p className="mt-2.5 text-center text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">SCAN UNTUK SIDAK &amp; SURAT IZIN</p>
                </div>
            </div>
        </div>
    );
}

export default function UnitQrModal({ open, onClose, unit }) {
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

    if (!open || !unit) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Pratinjau QR ${unit.unit_code}`}>
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full sm:max-w-2xl sm:max-h-[90vh] h-[100dvh] sm:h-auto flex flex-col bg-white rounded-none sm:rounded-lg shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur border-b border-[#E2E5EA] shrink-0">
                    <p className="text-sm font-semibold text-slate-900">Pratinjau QR Unit</p>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup pratinjau"
                        className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 sm:flex-none p-3 sm:p-4 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                    <UnitQrCard unit={unit} />
                </div>
                <div className="flex gap-2 p-3 sm:p-4 bg-white/95 backdrop-blur border-t border-[#E2E5EA] shrink-0">
                    <a
                        href={`/units/${unit.id}/qr`}
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 min-h-[48px] text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors"
                    >
                        Download PDF
                    </a>
                    <a
                        href={`/units/${unit.id}/qr`}
                        target="_blank"
                        rel="noopener"
                        className="flex-1 inline-flex items-center justify-center px-4 py-3 min-h-[48px] text-sm font-medium text-slate-700 bg-white border border-[#E2E5EA] rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Print Label
                    </a>
                </div>
            </div>
        </div>,
        document.body
    );
}

export { initials };

