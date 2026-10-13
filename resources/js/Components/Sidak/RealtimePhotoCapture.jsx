import { useEffect, useRef, useState } from 'react';

const ANNOT_COLOR = '#ff0000';

function getPosition(timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
        navigator.geolocation.getCurrentPosition(
            (pos) => { if (!done) { done = true; clearTimeout(timer); resolve(pos.coords); } },
            () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } },
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
        );
    });
}

function stampWita(date = new Date()) {
    const d = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric' });
    const t = date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' }).replace(':', '.');
    return `${d}, ${t} WITA`;
}

function loadImage(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('gagal')); };
        img.src = url;
    });
}

/**
 * Kamera realtime-only untuk sidak: jepret → overlay jam+koordinat dibakar ke gambar
 * → anotasi lingkaran/panah → hasil File diserahkan ke parent. Tanpa jalur upload.
 */
export default function RealtimePhotoCapture({ tenantName = '', disabled = false, buttonLabel = 'Ambil Foto', buttonHint = 'Kamera realtime', onCapture }) {
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [phase, setPhase] = useState('idle'); // idle | preview
    const [baseImg, setBaseImg] = useState(null);
    const [meta, setMeta] = useState(null);
    const [tool, setTool] = useState('circle'); // circle | arrow
    const [shapes, setShapes] = useState([]);
    const [saving, setSaving] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const coordsRef = useRef(null);
    const canvasRef = useRef(null);
    const drawRef = useRef(null);
    const [, forceTick] = useState(0);

    const cameraSupported = typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && (window.isSecureContext || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));

    useEffect(() => () => stopCamera(), []);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const closeAll = () => {
        stopCamera();
        setCameraOpen(false);
        setPhase('idle');
        setBaseImg(null);
        setMeta(null);
        setShapes([]);
        setCameraError('');
        setSaving(false);
    };

    const openCamera = async () => {
        setCameraError('');
        if (!cameraSupported) {
            setCameraError('Kamera realtime butuh HTTPS atau localhost. Buka halaman ini via HTTPS.');
            return;
        }
        // Minta lokasi lebih awal selagi user membidik, biar siap saat jepret.
        getPosition().then((c) => { coordsRef.current = c; });
        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
            streamRef.current = stream;
            setCameraOpen(true);
            requestAnimationFrame(async () => {
                const video = videoRef.current;
                if (!video) return;
                video.srcObject = stream;
                try { await video.play(); } catch {}
            });
        } catch (err) {
            const name = err?.name ?? '';
            if (name === 'NotAllowedError') setCameraError('Izin kamera ditolak. Klik ikon gembok di address bar lalu Allow kamera.');
            else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCameraError('Tidak ada kamera terdeteksi di perangkat ini.');
            else if (name === 'SecurityError') setCameraError('Kamera butuh HTTPS atau localhost.');
            else setCameraError('Kamera tidak dapat diakses. Pastikan tidak dipakai aplikasi lain.');
        }
    };

    const capturePhoto = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) return;
        stopCamera();
        setCameraOpen(false);
        try {
            const img = await loadImage(blob);
            const coords = coordsRef.current;
            setMeta({
                at: new Date(),
                coords: coords ? { lat: coords.latitude, lng: coords.longitude } : null,
            });
            setBaseImg(img);
            setShapes([]);
            setTool('circle');
            setPhase('preview');
        } catch {
            setCameraError('Gagal memproses foto. Coba jepret ulang.');
        }
    };

    // --- kanvas anotasi ---
    const redraw = () => {
        const canvas = canvasRef.current;
        if (!canvas || !baseImg) return;
        const ctx = canvas.getContext('2d');
        const box = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.width * (baseImg.height / baseImg.width) * dpr);
        ctx.scale(dpr, dpr);
        const w = box.width;
        const h = box.width * (baseImg.height / baseImg.width);
        ctx.drawImage(baseImg, 0, 0, w, h);
        drawOverlayPreview(ctx, w, h);
        ctx.strokeStyle = ANNOT_COLOR;
        ctx.fillStyle = ANNOT_COLOR;
        ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
        ctx.lineCap = 'round';
        shapes.forEach((s) => {
            const p = s.p.map(([rx, ry]) => [rx * w, ry * h]);
            if (s.type === 'circle') {
                const [[x1, y1], [x2, y2]] = p;
                ctx.beginPath();
                ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 8, Math.abs(y2 - y1) / 2 || 8, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                const [[x1, y1], [x2, y2]] = p;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                const ang = Math.atan2(y2 - y1, x2 - x1);
                const head = Math.max(12, Math.min(w, h) * 0.035);
                [ang - 0.42, ang + 0.42].forEach((a) => {
                    ctx.beginPath();
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - head * Math.cos(a), y2 - head * Math.sin(a));
                    ctx.stroke();
                });
            }
        });
    };

    // Pratinjau overlay (dibakar ulang resolusi penuh saat simpan).
    const drawOverlayPreview = (ctx, w, h) => {
        if (!meta) return;
        const stripH = Math.max(44, h * 0.09);
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillRect(0, h - stripH, w, stripH);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        const pad = stripH * 0.18;
        ctx.font = `bold ${Math.round(stripH * 0.3)}px sans-serif`;
        ctx.fillText((tenantName || '').toUpperCase().slice(0, 40), pad, h - stripH + stripH * 0.3);
        ctx.font = `${Math.round(stripH * 0.24)}px sans-serif`;
        const coord = meta.coords
            ? `${meta.coords.lat.toFixed(4)}, ${meta.coords.lng.toFixed(4)}`
            : 'GPS nonaktif';
        ctx.fillText(`${stampWita(meta.at)} • ${coord}`, pad, h - stripH * 0.22);
    };

    useEffect(() => { redraw(); });

    const canvasPos = (e) => {
        const canvas = canvasRef.current;
        const box = canvas.getBoundingClientRect();
        const pt = e.touches?.[0] ?? e;
        return [
            Math.min(1, Math.max(0, (pt.clientX - box.left) / box.width)),
            Math.min(1, Math.max(0, (pt.clientY - box.top) / box.height)),
        ];
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        drawRef.current = { start: canvasPos(e), current: canvasPos(e) };
    };
    const onPointerMove = (e) => {
        if (!drawRef.current) return;
        e.preventDefault();
        drawRef.current.current = canvasPos(e);
        forceTick((n) => n + 1);
    };
    const onPointerUp = (e) => {
        if (!drawRef.current) return;
        e.preventDefault();
        const { start } = drawRef.current;
        const end = canvasPos(e);
        drawRef.current = null;
        const dist = Math.hypot(end[0] - start[0], end[1] - start[1]);
        if (dist < 0.01) return;
        setShapes((prev) => [...prev, { type: tool, p: [start, end] }]);
    };

    // Ghost bentuk yang sedang digambar.
    useEffect(() => {
        if (!drawRef.current || !canvasRef.current || !baseImg) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const box = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = box.width;
        const h = box.width * (baseImg.height / baseImg.width);
        const { start, current } = drawRef.current;
        const p = [start, current].map(([rx, ry]) => [rx * w, ry * h]);
        redraw();
        const c2 = canvas.getContext('2d');
        c2.save();
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        c2.strokeStyle = ANNOT_COLOR;
        c2.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
        c2.setLineDash([8, 6]);
        const [[x1, y1], [x2, y2]] = p;
        if (tool === 'circle') {
            c2.beginPath();
            c2.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 8, Math.abs(y2 - y1) / 2 || 8, 0, 0, Math.PI * 2);
            c2.stroke();
        } else {
            c2.beginPath();
            c2.moveTo(x1, y1);
            c2.lineTo(x2, y2);
            c2.stroke();
        }
        c2.restore();
    });

    const finalize = async () => {
        if (!baseImg || !meta) return;
        setSaving(true);
        try {
            const maxSide = 1600;
            const scale = Math.min(1, maxSide / Math.max(baseImg.width, baseImg.height));
            const w = Math.round(baseImg.width * scale);
            const h = Math.round(baseImg.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(baseImg, 0, 0, w, h);
            // Bakar overlay jam + koordinat.
            const stripH = Math.max(44, h * 0.09);
            ctx.fillStyle = 'rgba(0,0,0,0.62)';
            ctx.fillRect(0, h - stripH, w, stripH);
            ctx.fillStyle = '#ffffff';
            ctx.textBaseline = 'middle';
            const pad = stripH * 0.18;
            ctx.font = `bold ${Math.round(stripH * 0.3)}px sans-serif`;
            ctx.fillText((tenantName || '').toUpperCase().slice(0, 40), pad, h - stripH + stripH * 0.3);
            ctx.font = `${Math.round(stripH * 0.24)}px sans-serif`;
            const coord = meta.coords
                ? `${meta.coords.lat.toFixed(4)}, ${meta.coords.lng.toFixed(4)}`
                : 'GPS nonaktif';
            ctx.fillText(`${stampWita(meta.at)} • ${coord}`, pad, h - stripH * 0.22);
            // Bakar anotasi.
            ctx.strokeStyle = ANNOT_COLOR;
            ctx.fillStyle = ANNOT_COLOR;
            ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
            ctx.lineCap = 'round';
            shapes.forEach((s) => {
                const p = s.p.map(([rx, ry]) => [rx * w, ry * h]);
                if (s.type === 'circle') {
                    const [[x1, y1], [x2, y2]] = p;
                    ctx.beginPath();
                    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 8, Math.abs(y2 - y1) / 2 || 8, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    const [[x1, y1], [x2, y2]] = p;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    const ang = Math.atan2(y2 - y1, x2 - x1);
                    const head = Math.max(12, Math.min(w, h) * 0.035);
                    [ang - 0.42, ang + 0.42].forEach((a) => {
                        ctx.beginPath();
                        ctx.moveTo(x2, y2);
                        ctx.lineTo(x2 - head * Math.cos(a), y2 - head * Math.sin(a));
                        ctx.stroke();
                    });
                }
            });
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            if (!blob) throw new Error('gagal');
            onCapture(new File([blob], `sidak-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            closeAll();
        } catch {
            setCameraError('Gagal menyimpan foto. Coba lagi.');
            setSaving(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                disabled={disabled}
                onClick={openCamera}
                className="flex items-center justify-center gap-2 w-full sm:w-auto sm:px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] rounded-xl border-2 border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {buttonLabel}
                <span className="text-[10px] text-gray-400 font-normal">{buttonHint}</span>
            </button>
            {cameraError && !cameraOpen && phase === 'idle' && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">{cameraError}</p>
            )}

            {cameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
                    <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover bg-black" />
                        {cameraError && <p className="text-xs text-red-300 px-4 py-2">{cameraError}</p>}
                        <div className="grid grid-cols-2 gap-2 p-3">
                            <button type="button" onClick={closeAll} className="px-3 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                                Batal
                            </button>
                            <button type="button" onClick={capturePhoto} className="px-3 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors">
                                Jepret
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'preview' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
                    <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden my-auto">
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">Tandai Foto</p>
                            <p className="text-[11px] text-gray-400">Lingkari / panah bagian yang perlu perhatian</p>
                        </div>
                        <div className="px-4">
                            <canvas
                                ref={canvasRef}
                                className="w-full rounded-xl border border-gray-200 touch-none select-none"
                                style={{ aspectRatio: baseImg ? `${baseImg.width} / ${baseImg.height}` : '4 / 3' }}
                                onMouseDown={onPointerDown}
                                onMouseMove={onPointerMove}
                                onMouseUp={onPointerUp}
                                onMouseLeave={onPointerUp}
                                onTouchStart={onPointerDown}
                                onTouchMove={onPointerMove}
                                onTouchEnd={onPointerUp}
                            />
                        </div>
                        {cameraError && <p className="text-xs text-red-600 px-4 pt-2">{cameraError}</p>}
                        <div className="flex items-center gap-2 px-4 py-3">
                            {[
                                { value: 'circle', label: '○ Lingkaran' },
                                { value: 'arrow', label: '→ Panah' },
                            ].map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTool(t.value)}
                                    aria-pressed={tool === t.value}
                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                                        tool === t.value
                                            ? 'border-[#0F1E36] bg-[#0F1E36]/5 text-[#0F1E36]'
                                            : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => setShapes((prev) => prev.slice(0, -1))}
                                disabled={shapes.length === 0}
                                className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                            >
                                Urungkan
                            </button>
                            <button
                                type="button"
                                onClick={() => setShapes([])}
                                disabled={shapes.length === 0}
                                className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                            >
                                Hapus Semua
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                            <button
                                type="button"
                                onClick={closeAll}
                                disabled={saving}
                                className="px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Foto Ulang
                            </button>
                            <button
                                type="button"
                                onClick={finalize}
                                disabled={saving}
                                className="px-3 py-2.5 text-sm font-medium text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Menyimpan…' : 'Pakai Foto Ini'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
