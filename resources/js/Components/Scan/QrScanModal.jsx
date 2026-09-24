import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router, usePage } from '@inertiajs/react';

function extractToken(raw) {
    const text = (raw ?? '').trim();
    if (!text) return '';
    try {
        const url = new URL(text);
        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.lastIndexOf('scan');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1].trim();
    } catch {
        // bukan URL absolut, lanjut ke regex di bawah
    }
    const match = text.match(/scan\/([A-Za-z0-9-]+)/);
    if (match) return match[1];
    return text;
}

export default function QrScanModal({ open, onClose, sessionId = null, title = 'Scan QR', description = 'Arahkan kamera ke QR — otomatis buka halaman terkait' }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const navigatedRef = useRef(false);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [detectorMissing, setDetectorMissing] = useState(false);
    const { errors } = usePage().props;

    const stopAll = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setScanning(false);
    };

    const goToToken = (raw) => {
        const token = extractToken(raw);
        if (!token || navigatedRef.current) return;
        navigatedRef.current = true;
        if (sessionId) {
            router.post(`/inspection-sessions/${sessionId}/scan`, { token }, {
                preserveScroll: true,
                onSuccess: () => { stopAll(); onClose?.(); },
                onError: () => { navigatedRef.current = false; },
            });
            return;
        }
        stopAll();
        onClose?.();
        router.visit(`/scan/${encodeURIComponent(token)}`);
    };

    useEffect(() => {
        if (!open) return;
        navigatedRef.current = false;
        setError('');
        setDetectorMissing(false);

        const insecure = typeof window !== 'undefined'
            && !window.isSecureContext
            && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (insecure) {
            setError('Kamera butuh HTTPS atau localhost. Buka aplikasi lewat koneksi aman untuk scan.');
            return undefined;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Perangkat ini tidak mendukung kamera. Gunakan perangkat berkamera.');
            return undefined;
        }

        let cancelled = false;
        const start = async () => {
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                } catch {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    try { await video.play(); } catch {}
                }
                if (!('BarcodeDetector' in window)) {
                    // ponytail: native BarcodeDetector saja, tambah html5-qrcode saat butuh iOS/Safari lama.
                    setDetectorMissing(true);
                    return;
                }
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                setScanning(true);
                timerRef.current = setInterval(async () => {
                    const v = videoRef.current;
                    if (!v || v.readyState < 2 || navigatedRef.current) return;
                    try {
                        const codes = await detector.detect(v);
                        if (codes?.[0]?.rawValue) goToToken(codes[0].rawValue);
                    } catch {}
                }, 350);
            } catch (err) {
                const name = err?.name ?? '';
                if (name === 'NotAllowedError') setError('Izin kamera ditolak. Klik ikon gembok di address bar lalu Allow kamera.');
                else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('Tidak ada kamera terdeteksi. Gunakan perangkat berkamera.');
                else if (name === 'SecurityError') setError('Kamera butuh HTTPS atau localhost. Buka aplikasi lewat koneksi aman.');
                else setError('Kamera tidak dapat diakses. Pastikan tidak dipakai aplikasi lain.');
            }
        };
        start();

        const onKey = (e) => { if (e.key === 'Escape') { stopAll(); onClose?.(); } };
        document.addEventListener('keydown', onKey);
        return () => {
            cancelled = true;
            document.removeEventListener('keydown', onKey);
            stopAll();
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Scan QR tenant">
            <div className="absolute inset-0 bg-black/60" onClick={() => { stopAll(); onClose?.(); }} aria-hidden="true" />
            <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { stopAll(); onClose?.(); }}
                        aria-label="Tutup pemindai"
                        className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                            <div className="w-52 h-52 border-2 border-white/80 rounded-xl" />
                        </div>
                        {scanning && (
                            <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/90">Mencari QR…</p>
                        )}
                    </div>

                    {(error || errors?.token) && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errors?.token ?? error}</p>
                    )}
                    {detectorMissing && !error && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            Browser ini tidak bisa baca QR otomatis. Buka di Chrome/Edge terbaru atau gunakan perangkat lain.
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
