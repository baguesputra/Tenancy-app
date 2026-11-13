import { useState } from 'react';
import CopyButton from './CopyButton';

function formatBlock(value) {
    if (typeof value === 'string') {
        return value;
    }
    return JSON.stringify(value, null, 2);
}

/**
 * Blok kode gelap dengan header, tab opsional, dan tombol salin.
 */
export default function CodeBlock({
    title,
    badge,
    badgeTone = 'neutral',
    tabs,
    content,
}) {
    const [tabIndex, setTabIndex] = useState(0);
    const activeTab = tabs ? tabs[tabIndex] : null;
    const rawText = formatBlock(activeTab ? activeTab.content : content);

    const badgeClasses = badgeTone === 'success'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25'
        : badgeTone === 'warning'
            ? 'bg-amber-500/15 text-amber-200 border-amber-400/25'
            : 'bg-white/10 text-slate-300 border-white/10';

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-[#1E3354] bg-[#0F1E36] text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3.5 py-2">
                <div className="flex items-center gap-2">
                    {title && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                            {title}
                        </span>
                    )}
                    {badge && (
                        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeClasses}`}>
                            {badge}
                        </span>
                    )}
                    {tabs && (
                        <div className="flex items-center gap-1 rounded-md bg-white/5 p-0.5" role="group" aria-label={title || 'Format contoh'}>
                            {tabs.map((tab, idx) => (
                                <button
                                    key={tab.label}
                                    type="button"
                                    aria-pressed={tabIndex === idx}
                                    onClick={() => setTabIndex(idx)}
                                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                                        tabIndex === idx
                                            ? 'bg-white text-[#0F1E36]'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <CopyButton text={rawText} surface="dark" label="Salin" />
            </div>
            <pre className="flex-1 overflow-x-auto p-3.5 font-mono text-xs leading-6 text-slate-100">
                <code>{rawText}</code>
            </pre>
        </div>
    );
}
