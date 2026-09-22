import { Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TYPE_META = {
    permit: { label: 'Izin', dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-800 border-blue-200', bar: 'bg-blue-50 text-blue-800 border-blue-200 border-l-blue-500' },
    pameran: { label: 'Pameran', dot: 'bg-[#FF6B6B]', chip: 'bg-[#FF6B6B]/10 text-[#D64545] border-[#FF6B6B]/20', bar: 'bg-[#FF6B6B]/10 text-[#D64545] border-[#FF6B6B]/25 border-l-[#FF6B6B]' },
    contract_start: { label: 'Kontrak mulai', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', bar: 'bg-emerald-50 text-emerald-800 border-emerald-200 border-l-emerald-500' },
    contract_end: { label: 'Kontrak berakhir', dot: 'bg-purple-500', chip: 'bg-purple-50 text-purple-800 border-purple-200', bar: 'bg-purple-50 text-purple-800 border-purple-200 border-l-purple-500' },
    sidak: { label: 'Sidak', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-900 border-amber-200', bar: 'bg-amber-50 text-amber-900 border-amber-200 border-l-amber-500' },
};

const FILTERS = [
    { key: 'all', label: 'Semua' },
    { key: 'permit', label: 'Izin' },
    { key: 'pameran', label: 'Pameran' },
    { key: 'contract_end', label: 'Kontrak berakhir' },
    { key: 'sidak', label: 'Sidak' },
];

const MAX_CHIPS = 3;

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function monthCells(year, monthIdx) {
    const first = new Date(year, monthIdx, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < 42; i++) {
        days.push(new Date(year, monthIdx, 1 - startOffset + i));
    }
    return days;
}

function relDay(start) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(`${start}T00:00:00`);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Hari ini';
    if (diff === 1) return 'Besok';
    if (diff > 1) return `${diff} hari lagi`;
    return `${Math.abs(diff)} hari lalu`;
}

export default function EventCalendar({ calendar = { month: '', events: [] } }) {
    const [view, setView] = useState('month');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(dayKey(new Date()));
    const [sheetOpen, setSheetOpen] = useState(false);
    const touchX = useRef(null);

    const [y, m] = (calendar.month || '').split('-').map(Number);
    const year = y || new Date().getFullYear();
    const monthIdx = (m || new Date().getMonth() + 1) - 1;

    const allEvents = useMemo(() => (Array.isArray(calendar.events) ? calendar.events : []), [calendar.events]);

    const events = useMemo(() => {
        if (filter === 'all') return allEvents;
        if (filter === 'permit') return allEvents.filter((e) => e.type === 'permit' || e.type === 'pameran');
        return allEvents.filter((e) => e.type === filter);
    }, [allEvents, filter]);

    const byDay = useMemo(() => {
        const map = {};
        events.forEach((e) => {
            const s = e.start;
            const en = e.end || e.start;
            if (!s) return;
            let d = new Date(`${s}T00:00:00`);
            const endD = new Date(`${en}T00:00:00`);
            for (; d <= endD; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
                const k = dayKey(d);
                (map[k] ??= []).push(e);
            }
        });
        Object.values(map).forEach((list) => list.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.start.localeCompare(b.start)));
        return map;
    }, [events]);

    const cells = useMemo(() => monthCells(year, monthIdx), [year, monthIdx]);

    const selectedEvents = byDay[selected] ?? [];
    const agenda = useMemo(() => {
        const today = dayKey(new Date());
        return events.filter((e) => (e.end || e.start) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 60);
    }, [events]);
    const agendaGroups = useMemo(() => {
        const map = {};
        agenda.forEach((e) => { (map[e.start] ??= []).push(e); });
        return Object.keys(map).sort().map((date) => ({
            date,
            items: map[date].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0)),
        }));
    }, [agenda]);

    const goMonth = (delta) => {
        const d = new Date(year, monthIdx + delta, 1);
        const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        router.get('/dashboard', { cal_month: mm }, { preserveState: true, preserveScroll: true, replace: true, only: ['calendar'] });
    };
    const goToday = () => {
        const mm = new Date().toISOString().slice(0, 7);
        setSelected(dayKey(new Date()));
        router.get('/dashboard', { cal_month: mm }, { preserveState: true, preserveScroll: true, replace: true, only: ['calendar'] });
    };
    const handleSelect = (k) => {
        setSelected(k);
        if (window.matchMedia?.('(max-width: 639px)').matches) setSheetOpen(true);
    };

    const monthLabel = new Date(year, monthIdx, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const visibleFilters = FILTERS.filter((f) => f.key === 'all' || f.key === 'permit' || allEvents.some((e) => e.type === f.key || (f.key === 'permit' && (e.type === 'permit' || e.type === 'pameran'))));
    const todayKey = dayKey(new Date());

    return (
        <section aria-label="Kalender operasional" className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 mr-auto">
                    <h2 className="text-sm font-semibold text-gray-900 capitalize">{monthLabel}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{events.length} agenda · klik tanggal untuk detail</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1" role="tablist" aria-label="Tampilan kalender">
                    {[['month', 'Bulan'], ['agenda', 'Agenda']].map(([k, label]) => (
                        <button
                            key={k}
                            role="tab"
                            aria-selected={view === k}
                            onClick={() => setView(k)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${view === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => goMonth(-1)} aria-label="Bulan sebelumnya" className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[36px] min-w-[36px]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goToday} className="px-3 h-9 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100">Hari ini</button>
                    <button onClick={() => goMonth(1)} aria-label="Bulan berikutnya" className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[36px] min-w-[36px]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            <div className="px-5 pt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter jenis agenda">
                {visibleFilters.map((f) => {
                    const count = f.key === 'all' ? allEvents.length
                        : f.key === 'permit' ? allEvents.filter((e) => e.type === 'permit' || e.type === 'pameran').length
                        : allEvents.filter((e) => e.type === f.key).length;
                    return (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            aria-pressed={filter === f.key}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f.key ? 'bg-[#0F1E36] text-white border-[#0F1E36]' : 'bg-white text-gray-600 border-[#E2E5EA] hover:bg-gray-50'}`}
                        >
                            {f.label}
                            <span className={`ml-1.5 tabular-nums ${filter === f.key ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            <div className="px-5 py-2 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(TYPE_META).filter(([k]) => allEvents.some((e) => e.type === k)).map(([k, meta]) => (
                    <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />{meta.label}
                    </span>
                ))}
            </div>

            {view === 'month' ? (
                <div
                    className="px-3 sm:px-5 pb-5"
                    onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                        if (touchX.current == null) return;
                        const dx = e.changedTouches[0].clientX - touchX.current;
                        touchX.current = null;
                        if (dx < -60) goMonth(1);
                        else if (dx > 60) goMonth(-1);
                    }}
                >
                    <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 py-2">
                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => <span key={d}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((d, i) => {
                            const k = dayKey(d);
                            const inMonth = d.getMonth() === monthIdx;
                            const dayEvents = byDay[k] ?? [];
                            const shown = dayEvents.slice(0, MAX_CHIPS);
                            const extra = dayEvents.length - shown.length;
                            const isToday = k === todayKey;
                            const isSelected = k === selected;
                            const weekend = i % 7 >= 5;
                            return (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(k)}
                                    className={`min-h-[52px] sm:min-h-[92px] rounded-xl border p-1 sm:p-1.5 flex flex-col cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-[#0F1E36] ${
                                        isSelected ? 'border-[#0F1E36] ring-1 ring-[#0F1E36] bg-[#0F1E36]/[0.03]' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/60'
                                    } ${inMonth ? '' : 'opacity-40'} ${weekend && inMonth ? 'bg-gray-50/70' : ''}`}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSelect(k); }}
                                        aria-pressed={isSelected}
                                        aria-label={`${d.getDate()} ${monthLabel}, ${dayEvents.length} agenda`}
                                        className={`self-start inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${isToday ? 'bg-[#0F1E36] text-white' : 'text-gray-700'}`}
                                    >
                                        {d.getDate()}
                                    </button>
                                    <div className="mt-1 hidden sm:flex sm:flex-col gap-1">
                                        {shown.map((e) => {
                                            const meta = TYPE_META[e.type] ?? TYPE_META.permit;
                                            const urgent = !!e.urgent;
                                            return (
                                                <Link
                                                    key={e.id}
                                                    href={e.url}
                                                    onClick={(ev) => ev.stopPropagation()}
                                                    title={`${e.title}${e.end && e.end !== e.start ? ` (${e.start} s/d ${e.end})` : ''}`}
                                                    className={`block truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium hover:shadow-sm transition-shadow focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${meta.chip} ${urgent ? '!bg-red-50 !text-red-700 !border-red-200' : ''}`}
                                                >
                                                    {e.title}
                                                </Link>
                                            );
                                        })}
                                        {extra > 0 && <span className="text-[10px] text-gray-400 font-medium px-1">+{extra} lagi</span>}
                                    </div>
                                    <div className="mt-1 flex sm:hidden items-center justify-start gap-0.5 flex-wrap min-h-[6px]">
                                        {dayEvents.slice(0, 4).map((e) => (
                                            <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${(TYPE_META[e.type] ?? TYPE_META.permit).dot}`} />
                                        ))}
                                        {dayEvents.some((e) => e.urgent) && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="hidden sm:block">
                        <DayPanel dateKey={selected} events={selectedEvents} />
                    </div>
                </div>
            ) : (
                <div className="px-1 sm:px-3 pb-3">
                    {agendaGroups.length === 0 && <p className="px-4 py-8 text-sm text-gray-400 text-center">Tidak ada agenda mendatang.</p>}
                    {agendaGroups.map((g) => (
                        <div key={g.date}>
                            <p className="sticky top-0 bg-white/95 backdrop-blur px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-900 capitalize z-10">
                                {new Date(`${g.date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                <span className="ml-1.5 font-normal text-gray-400">· {relDay(g.date)}</span>
                            </p>
                            <ul className="divide-y divide-gray-100">
                                {g.items.map((e) => <AgendaRow key={e.id} event={e} />)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
            <DaySheet open={sheetOpen} onClose={() => setSheetOpen(false)} dateKey={selected} events={selectedEvents} onNavigateMonth={goMonth} />
        </section>
    );
}

function DayPanel({ dateKey, events }) {
    if (!dateKey) return null;
    const label = new Date(`${dateKey}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
        <div className="mt-3 rounded-xl border border-[#E2E5EA] bg-gray-50/60 p-3" aria-live="polite">
            <p className="text-xs font-semibold text-gray-900 capitalize">{label} · {events.length} agenda</p>
            {events.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">Tidak ada agenda hari ini.</p>
            ) : (
                <ul className="mt-2 space-y-1.5">
                    {events.map((e) => <AgendaRow key={e.id} event={e} compact />)}
                </ul>
            )}
        </div>
    );
}

function DaySheet({ open, onClose, dateKey, events, onNavigateMonth }) {
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
    const label = dateKey ? new Date(`${dateKey}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden" role="dialog" aria-modal="true" aria-label={`Agenda ${label}`}>
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-h-[78dvh] flex flex-col bg-white rounded-t-2xl shadow-xl overflow-hidden">
                <div className="pt-2.5 pb-1 flex justify-center shrink-0" aria-hidden="true">
                    <span className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 capitalize truncate">{label}</p>
                        <p className="text-xs text-gray-400">{events.length} agenda{dateKey ? ` · ${relDay(dateKey)}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onNavigateMonth(-1)} aria-label="Bulan sebelumnya" className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={() => onNavigateMonth(1)} aria-label="Bulan berikutnya" className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button onClick={onClose} aria-label="Tutup agenda" className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
                    {events.length === 0 ? (
                        <p className="px-2 py-8 text-sm text-gray-400 text-center">Tidak ada agenda hari ini.</p>
                    ) : (
                        <ul className="space-y-1">
                            {events.map((e) => <AgendaRow key={e.id} event={e} compact />)}
                        </ul>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function AgendaRow({ event: e, compact = false }) {
    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
    const dateLabel = new Date(`${e.start}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const range = e.end && e.end !== e.start
        ? `${dateLabel} – ${new Date(`${e.end}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
        : dateLabel;
    return (
        <li>
            <Link
                href={e.url}
                className={`flex items-center gap-2.5 rounded-xl border-l-2 ${meta.bar.split(' ').slice(-1)[0]} hover:bg-gray-50 transition-colors group focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${compact ? 'px-2 py-1.5' : 'px-4 py-2.5'}`}
            >
                <span className="min-w-0 flex-1">
                    <span className="block text-xs sm:text-sm text-gray-800 truncate group-hover:text-gray-950">{e.title}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">{meta.label} · {range} · {relDay(e.start)}{e.urgent ? ' · H-30' : ''}</span>
                </span>
                {e.urgent && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Segera</span>}
                {e.status && <span className="hidden sm:inline shrink-0 text-[11px] text-gray-400">{e.status}</span>}
            </Link>
        </li>
    );
}
