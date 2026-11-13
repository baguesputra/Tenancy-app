import { useEffect, useRef, useState } from 'react';
import { IconCheck } from '@/Components/Icons';

function IconCopy(props) {
    return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
        </svg>
    );
}

const SURFACE_STYLES = {
    light: 'border-[#E2E5EA] bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-[#0F1E36]',
    dark: 'border-white/15 bg-white/10 text-slate-200 hover:border-white/30 hover:bg-white/15 hover:text-white',
    subtle: 'border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-[#0F1E36]',
};

/**
 * Tombol salin teks ke clipboard dengan status visual sementara.
 */
export default function CopyButton({
    text,
    label = 'Salin',
    copiedLabel = 'Tersalin',
    ariaLabel,
    surface = 'light',
    className = '',
    onClick,
}) {
    const [status, setStatus] = useState('idle');
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    async function handleCopy(event) {
        if (onClick) {
            onClick(event);
        }
        try {
            await navigator.clipboard.writeText(text);
            setStatus('copied');
        } catch {
            setStatus('error');
        }
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setStatus('idle'), 2000);
    }

    const isCopied = status === 'copied';
    const isError = status === 'error';

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={ariaLabel || `${label}: ${text}`}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                isCopied
                    ? surface === 'dark'
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : isError
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : SURFACE_STYLES[surface]
            } ${className}`}
        >
            {isCopied ? (
                <IconCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
                <IconCopy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{isCopied ? copiedLabel : isError ? 'Gagal' : label}</span>
        </button>
    );
}
