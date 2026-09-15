import { useEffect, useRef, useState } from 'react';
import Badge from '@/Components/Badge';

function compressImage(source, name) {
    return new Promise((resolve) => {
        const url = source instanceof Blob ? URL.createObjectURL(source) : source;
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const maxSide = 1600;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => resolve(blob ? new File([blob], name, { type: 'image/jpeg' }) : source),
                'image/jpeg',
                0.82
            );
        };
        img.onerror = () => resolve(source);
        img.src = url;
    });
}

export default function GoodPhotoCapture({ good, canEdit, onSubmit, onNoteUpdate, submitting }) {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [note, setNote] = useState(good.mismatch_note ?? '');
    const [savedNote, setSavedNote] = useState(good.mismatch_note ?? '');
    const [error, setError] = useState('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const cameraInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cameraSupported = typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && (window.isSecureContext || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
            stopCamera();
        };
    }, []);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const closeCamera = () => {
        stopCamera();
        setCameraOpen(false);
    };

    const handleFile = async (e) => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked) return;
        if (!picked.type.startsWith('image/')) {
            setError('File harus berupa gambar.');
            return;
        }
        setError('');
        const compressed = await compressImage(picked, picked.name.replace(/\.\w+$/, '') + '.jpg');
        if (preview) URL.revokeObjectURL(preview);
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
    };

    const openCamera = async () => {
        setCameraError('');
        const tryCamera = (constraints) => navigator.mediaDevices.getUserMedia(constraints);
        try {
            let stream;
            try {
                stream = await tryCamera({ video: { facingMode: 'environment' }, audio: false });
            } catch {
                stream = await tryCamera({ video: true, audio: false });
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
            else if (name === 'NotFoundError' || name === 'OverconstrainedError') setCameraError('Tidak ada kamera terdeteksi. Gunakan Ambil Foto atau Unggah File.');
            else if (name === 'SecurityError') setCameraError('Kamera butuh HTTPS atau localhost. Gunakan Unggah File.');
            else setCameraError('Kamera tidak dapat diakses. Pastikan tidak dipakai aplikasi lain, lalu coba lagi.');
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
        closeCamera();
        if (!blob) return;
        const compressed = await compressImage(blob, `foto-${good.id}.jpg`);
        if (preview) URL.revokeObjectURL(preview);
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
    };

    const retake = () => {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setFile(null);
        setError('');
    };

    const submit = () => {
        if (!file) {
            setError('Ambil foto dulu sebelum menyimpan.');
            return;
        }
        onSubmit(good.id, file, note);
    };

    if (good.is_verified || !canEdit) {
        return (
            <div className="space-y-2">
                <div className="flex items-start gap-3">
                    {good.photo_url && (
                        <img src={good.photo_url} alt={`Foto ${good.description}`} loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200 shrink-0" />
                    )}
                    <div className="min-w-0">
                        <Badge color={good.is_verified ? 'green' : 'gray'}>
                            {good.is_verified ? 'Terkunci — sudah dicek' : 'Belum dicek'}
                        </Badge>
                        {good.mismatch_note && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">{good.mismatch_note}</p>
                        )}
                    </div>
                </div>
                {good.is_verified && canEdit && (
                    <div className="flex gap-2">
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Catatan ketidaksesuaian (opsional)"
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-100"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                onNoteUpdate(good.id, note);
                                setSavedNote(note);
                            }}
                            disabled={submitting || note === savedNote}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Simpan
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
            {cameraError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{cameraError}</p>
            )}

            {!preview ? (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0F1E36] hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">Ambil Foto</span>
                        <span className="text-[10px] text-gray-400">Kamera HP</span>
                    </button>
                    {cameraSupported ? (
                        <button
                            type="button"
                            onClick={openCamera}
                            className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0F1E36] hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">Kamera Web</span>
                            <span className="text-[10px] text-gray-400">Desktop</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0F1E36] hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">Unggah File</span>
                            <span className="text-[10px] text-gray-400">Galeri</span>
                        </button>
                    )}
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
            ) : (
                <div className="space-y-2">
                    <img src={preview} alt={`Pratinjau ${good.description}`} className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-200" />
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Catatan ketidaksesuaian (opsional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-100"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={retake}
                            disabled={submitting}
                            className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Foto Ulang
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={submitting}
                            className="px-3 py-2 text-xs font-medium text-white bg-[#0F1E36] hover:bg-[#1a2f52] rounded-lg transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan…' : 'Pakai Foto Ini'}
                        </button>
                    </div>
                </div>
            )}

            {cameraOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover bg-black" />
                        {cameraError && (
                            <p className="text-xs text-red-300 px-4 py-2">{cameraError}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 p-3">
                            <button
                                type="button"
                                onClick={closeCamera}
                                className="px-3 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-3 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Jepret
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
