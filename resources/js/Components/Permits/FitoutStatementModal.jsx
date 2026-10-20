import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Button from '@/Components/Form/Button';

export default function FitoutStatementModal({ open, onClose, permit, jenis = 'fit_out' }) {
    const [source, setSource] = useState('surat');

    useEffect(() => {
        if (open) setSource('surat');
    }, [open ]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !permit) return null;

    const tenant = permit.tenant ?? null;
    const hasMaster = Boolean(tenant);

    const preview = source === 'master'
        ? {
            nama: tenant?.pic_name || '—',
            jabatan: tenant?.pic_position || 'Penanggung Jawab',
            telepon: tenant?.pic_phone || '—',
        }
        : {
            nama: permit.pic_name || '—',
            jabatan: 'Penanggung Jawab',
            telepon: permit.pic_phone || '—',
        };

    const downloadUrl = `/permit-requests/${permit.id}/pernyataan-tenant?source=${source}&jenis=${jenis}`;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Surat pernyataan tenant">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Surat Pernyataan Tenant</p>
                        <p className="text-xs text-gray-500 font-mono">{permit.permit_number}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <p className="text-xs text-gray-500">Pilih data penandatangan yang akan tercetak di surat:</p>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setSource('surat')}
                            aria-pressed={source === 'surat'}
                            className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${source === 'surat' ? 'border-[#0F1E36] bg-[#0F1E36]/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 ${source === 'surat' ? 'border-[#0F1E36] bg-[#0F1E36]' : 'border-gray-300'}`} aria-hidden="true" />
                            <span>
                                <span className="block text-sm font-semibold text-gray-900">Penanggung jawab surat ijin</span>
                                <span className="block text-xs text-gray-500 mt-0.5">{permit.pic_name || '—'} · Jabatan otomatis Penanggung Jawab</span>
                            </span>
                        </button>
                        {hasMaster ? (
                            <button
                                type="button"
                                onClick={() => setSource('master')}
                                aria-pressed={source === 'master'}
                                className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${source === 'master' ? 'border-[#0F1E36] bg-[#0F1E36]/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 ${source === 'master' ? 'border-[#0F1E36] bg-[#0F1E36]' : 'border-gray-300'}`} aria-hidden="true" />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900">PIC utama master tenant</span>
                                    <span className="block text-xs text-gray-500 mt-0.5">{tenant.pic_name || '—'} · {tenant.pic_position || 'Penanggung Jawab'}</span>
                                </span>
                            </button>
                        ) : (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">Tanpa tenant terdaftar — opsi PIC master tidak tersedia.</p>
                        )}
                    </div>
                    <dl className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm space-y-1.5">
                        <div className="flex justify-between gap-3"><dt className="text-gray-500 text-xs uppercase tracking-wide">Nama</dt><dd className="font-medium text-gray-900 text-right">{preview.nama}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-gray-500 text-xs uppercase tracking-wide">Jabatan</dt><dd className="font-medium text-gray-900 text-right">{preview.jabatan}</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-gray-500 text-xs uppercase tracking-wide">Telepon</dt><dd className="font-medium text-gray-900 text-right">{preview.telepon}</dd></div>
                    </dl>
                </div>
                <div className="flex gap-2 p-5 pt-0">
                    <Button type="button" variant="secondary" onClick={onClose} className="shrink-0">Batal</Button>
                    <a href={downloadUrl} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0F1E36] text-white text-sm font-medium hover:bg-[#1a2d4d] transition-colors min-h-[44px]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                        </svg>
                        Unduh PDF
                    </a>
                </div>
            </div>
        </div>,
        document.body
    );
}
