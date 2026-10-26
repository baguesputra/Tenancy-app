import { useId, useRef, useState } from 'react';
import { formatBytes } from '@/utils/format';

function isPdf(name = '') {
    return name.toLowerCase().endsWith('.pdf');
}

function FileIcon({ kind = 'image', className = 'h-5 w-5' }) {
    return kind === 'pdf' ? (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ) : (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V6A1.5 1.5 0 0020.25 4.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
        </svg>
    );
}

function UploadIcon({ className = 'h-6 w-6' }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
    );
}

/**
 * Pemilih file. `onChange` tetap menerima event native (`e.target.files`), jadi
 * aman untuk semua pemakai lama. Prop tambahan (file/currentFile/onClear/
 * onPreview/hint/compact) tidak diteruskan ke elemen <input>.
 */
export default function FileInput({
    error,
    className = '',
    loading = false,
    accept,
    maxSize,
    file = null,
    currentFile = null,
    onClear = null,
    onPreview = null,
    label,
    hint,
    compact = false,
    multiple = false,
    id,
    ...props
}) {
    const inputRef = useRef(null);
    const [picked, setPicked] = useState([]);
    const [dragging, setDragging] = useState(false);

    const selected = file ? [file] : picked;
    const hasSelected = selected.length > 0;
    const displayName = hasSelected ? selected[0].name : (currentFile?.name ?? '');
    const size = hasSelected ? selected[0].size : (currentFile?.size ?? null);
    const kind = hasSelected
        ? (selected[0].type?.includes('pdf') || isPdf(selected[0].name) ? 'pdf' : 'image')
        : (currentFile?.type ?? (isPdf(currentFile?.name) ? 'pdf' : 'image'));
    // `id` wajib ada: input dirender di luar label, jadi tanpa id label dropzone
    // (`htmlFor`) tidak terhubung ke input dan klik tidak membuka dialog file.
    const autoId = useId();
    const inputId = id ?? props.name ?? autoId;

    const describedBy = [
        hint ? (inputId ? `${inputId}-hint` : null) : null,
        error ? (inputId ? `${inputId}-error` : null) : null,
    ].filter(Boolean).join(' ') || undefined;

    const pick = () => inputRef.current?.click();

    const handleChange = (e) => {
        setPicked(Array.from(e.target.files ?? []));
        props.onChange?.(e);
    };

    const handleClear = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (inputRef.current) inputRef.current.value = '';
        setPicked([]);
        onClear?.();
        // Kontrak lama: pemanggil membaca e.target.files[0] → null.
        props.onChange?.({ target: { files: [] } });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (props.disabled) return;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length === 0) return;
        const list = multiple ? files : files.slice(0, 1);
        setPicked(list);
        props.onChange?.({ target: { files: list } });
    };

    const formats = accept
        ? accept.split(',').map((ext) => ext.trim().replace('.', '').toUpperCase()).join(', ')
        : null;
    const maxLabel = maxSize ? `${Math.round(maxSize / (1024 * 1024))} MB` : null;

    const iconButton = 'inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-2.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]';

    return (
        <div className={className}>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                aria-describedby={describedBy}
                aria-invalid={error ? 'true' : undefined}
                {...props}
                onChange={handleChange}
            />

            {label && (
                <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
            )}

            {hasSelected || currentFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-[#E2E5EA] bg-white p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F1E36]/5 text-[#0F1E36]">
                        {hasSelected && multiple ? <UploadIcon className="h-4 w-4" /> : <FileIcon kind={kind} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                            {multiple && selected.length > 1 ? `${selected.length} file dipilih` : displayName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                            {[size ? formatBytes(size) : null, hasSelected && currentFile ? `mengganti ${currentFile.name}` : null]
                                .filter(Boolean)
                                .join(' · ') || (currentFile ? 'File tersimpan' : 'Siap diunggah')}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {hasSelected ? (
                            <>
                                <button
                                    type="button"
                                    onClick={pick}
                                    className={`${iconButton} text-[#0F1E36] hover:bg-[#0F1E36]/10`}
                                >
                                    Pilih ulang
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className={`${iconButton} text-red-600 hover:bg-red-50`}
                                >
                                    Hapus
                                </button>
                            </>
                        ) : (
                            <>
                                {currentFile?.url && onPreview && (
                                    <button
                                        type="button"
                                        onClick={onPreview}
                                        className={`${iconButton} text-gray-600 hover:bg-gray-100`}
                                    >
                                        Lihat
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={pick}
                                    className={`${iconButton} text-[#0F1E36] hover:bg-[#0F1E36]/10`}
                                >
                                    Ganti
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={inputId}
                    onDragOver={(e) => { e.preventDefault(); if (!props.disabled) setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer ${compact ? 'items-center gap-3 p-3 text-left' : 'flex-col items-center justify-center p-6 text-center'}
                        rounded-lg border-2 border-dashed transition-colors duration-200
                        ${error ? 'border-red-300 bg-red-50' : dragging ? 'border-[#0F1E36] bg-[#0F1E36]/5' : 'border-gray-300 bg-gray-50 hover:border-[#0F1E36] hover:bg-gray-100'}
                        ${props.disabled || loading ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                    {loading ? (
                        <>
                            <svg className="h-5 w-5 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <span className="text-sm text-gray-500">Mengunggah…</span>
                        </>
                    ) : (
                        <>
                            <span className={compact
                                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400'
                                : 'mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-400'}>
                                <UploadIcon className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
                            </span>
                            <span className="min-w-0">
                                <span className={`block text-sm font-medium text-gray-700 ${compact ? '' : 'mb-1'}`}>
                                    {dragging ? 'Lepaskan file di sini' : compact ? 'Pilih file' : 'Klik atau seret file ke sini'}
                                </span>
                                {(formats || maxLabel) && (
                                    <span className="block text-xs text-gray-500">
                                        {[formats ? `Format: ${formats}` : null, maxLabel ? `Maks ${maxLabel}` : null].filter(Boolean).join(' · ')}
                                    </span>
                                )}
                            </span>
                        </>
                    )}
                </label>
            )}

            {hint && !error && (
                <p id={inputId ? `${inputId}-hint` : undefined} className="mt-1 text-xs text-gray-400">{hint}</p>
            )}
            {error && (
                <p id={inputId ? `${inputId}-error` : undefined} className="mt-1 flex items-center gap-1 text-xs text-red-500" role="alert">
                    <span aria-hidden="true">⚠</span> {error}
                </p>
            )}
        </div>
    );
}