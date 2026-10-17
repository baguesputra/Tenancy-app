import { Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TYPE_META = {
    permit: {
        label: "Izin Kerja",
        dot: "bg-blue-500",
        chip: "bg-blue-50 text-blue-800 border-blue-200",
        bar: "bg-blue-50 text-blue-800 border-blue-200 border-l-blue-500",
        hlRing: "ring-blue-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(59,130,246,0.55)]",
    },
    pameran: {
        label: "Pameran",
        dot: "bg-[#FF6B6B]",
        chip: "bg-[#FF6B6B]/10 text-[#D64545] border-[#FF6B6B]/20",
        bar: "bg-[#FF6B6B]/10 text-[#D64545] border-[#FF6B6B]/25 border-l-[#FF6B6B]",
        hlRing: "ring-[#FF6B6B]",
        hlGlow: "shadow-[0_0_10px_2px_rgba(255,107,107,0.6)]",
    },
    kegiatan: {
        label: "Kegiatan",
        dot: "bg-emerald-500",
        chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
        bar: "bg-emerald-50 text-emerald-800 border-emerald-200 border-l-emerald-500",
        hlRing: "ring-emerald-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(16,185,129,0.55)]",
    },
    contract_start: {
        label: "Kontrak mulai",
        dot: "bg-purple-500",
        chip: "bg-purple-50 text-purple-800 border-purple-200",
        bar: "bg-purple-50 text-purple-800 border-purple-200 border-l-purple-500",
        hlRing: "ring-purple-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(168,85,247,0.55)]",
    },
    contract_end: {
        label: "Kontrak berakhir",
        dot: "bg-purple-500",
        chip: "bg-purple-50 text-purple-800 border-purple-200",
        bar: "bg-purple-50 text-purple-800 border-purple-200 border-l-purple-500",
        hlRing: "ring-purple-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(168,85,247,0.55)]",
    },
    sidak: {
        label: "Sidak",
        dot: "bg-amber-500",
        chip: "bg-amber-50 text-amber-900 border-amber-200",
        bar: "bg-amber-50 text-amber-900 border-amber-200 border-l-amber-500",
        hlRing: "ring-amber-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(245,158,11,0.6)]",
    },
    loo_received: {
        label: "LOO diterima",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
    loo_submitted: {
        label: "LOO disubmit",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
    loo_completed: {
        label: "LOO selesai",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
    loo_cancelled: {
        label: "LOO dibatalkan",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
    loo_track_expired: {
        label: "Tracking expired",
        dot: "bg-gray-400",
        chip: "bg-gray-50 text-gray-600 border-gray-200",
        bar: "bg-gray-50 text-gray-600 border-gray-200 border-l-gray-400",
        hlRing: "ring-gray-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(156,163,175,0.6)]",
    },
    section_filled: {
        label: "Section diisi",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
    section_submitted: {
        label: "Section disubmit",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        bar: "bg-indigo-50 text-indigo-800 border-indigo-200 border-l-indigo-500",
        hlRing: "ring-indigo-400",
        hlGlow: "shadow-[0_0_10px_2px_rgba(99,102,241,0.55)]",
    },
};

// Legenda diringkas per keluarga agar hue tetap sedikit.
const LEGEND_GROUPS = [
    { label: "Izin Kerja", dot: "bg-blue-500", types: ["permit"] },
    { label: "Pameran", dot: "bg-[#FF6B6B]", types: ["pameran"] },
    { label: "Kegiatan", dot: "bg-emerald-500", types: ["kegiatan"] },
    { label: "Kontrak", dot: "bg-purple-500", types: ["contract_start", "contract_end"] },
    { label: "Sidak", dot: "bg-amber-500", types: ["sidak"] },
    { label: "LOO", dot: "bg-indigo-500", types: ["loo_received", "loo_submitted", "loo_completed", "loo_cancelled", "section_filled", "section_submitted"] },
    { label: "Expired", dot: "bg-gray-400", types: ["loo_track_expired"] },
];

const FILTERS = [
    { key: "all", label: "Semua" },
    { key: "permit", label: "Izin" },
    { key: "pameran", label: "Pameran" },
    { key: "kegiatan", label: "Kegiatan" },
    { key: "contract_end", label: "Kontrak berakhir" },
    { key: "sidak", label: "Sidak" },
    { key: "loo", label: "LOO" },
    { key: "section", label: "Section" },
];

const PERMIT_TYPES = ["permit", "pameran", "kegiatan"];

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
    new Date(2026, i, 1).toLocaleDateString("id-ID", { month: "long" }),
);

const familyOf = (type) =>
    LEGEND_GROUPS.find((g) => g.types.includes(type)) ?? LEGEND_GROUPS[0];

// Posisi hari ini di dalam rentang event, mis. "Hari 2/5". Null bila bukan rentang.
function spanDay(e, dateKey) {
    if (!e.end || e.end === e.start || !dateKey) return null;
    const ms = (k) => new Date(`${k}T00:00:00`).getTime();
    const total = Math.round((ms(e.end) - ms(e.start)) / 86400000) + 1;
    const idx = Math.round((ms(dateKey) - ms(e.start)) / 86400000) + 1;
    if (idx < 1 || idx > total) return null;
    return `Hari ${idx}/${total}`;
}

function groupByFamily(list) {
    const groups = [];
    const seen = {};
    list.forEach((e) => {
        const fam = familyOf(e.type);
        if (!seen[fam.label]) {
            seen[fam.label] = { ...fam, items: [] };
            groups.push(seen[fam.label]);
        }
        seen[fam.label].items.push(e);
    });
    return groups;
}

const MAX_CHIPS = 3;
const BOARD_PREVIEW = 6;

const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Besok";
    if (diff > 1) return `${diff} hari lagi`;
    return `${Math.abs(diff)} hari lalu`;
}

export default function EventCalendar({
    calendar = { month: "", events: [] },
}) {
    const [view, setView] = useState(() =>
        new URLSearchParams(window.location.search).get("view") === "board"
            ? "board"
            : "month",
    );
    const [filter, setFilter] = useState(() => {
        const f = new URLSearchParams(window.location.search).get("jenis");
        return FILTERS.some((x) => x.key === f) ? f : "all";
    });
    const [selected, setSelected] = useState(dayKey(new Date()));
    const [sheetOpen, setSheetOpen] = useState(false);
    const [expandedCols, setExpandedCols] = useState(() => new Set());
    const [navLoading, setNavLoading] = useState(false);
    const [legendOpen, setLegendOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(null);
    const touchX = useRef(null);
    const cellRefs = useRef([]);
    const pickerRef = useRef(null);

    useEffect(() => {
        const isCalendarVisit = (e) =>
            e.detail.visit?.only?.includes("calendar");
        const offs = [
            router.on("start", (e) => {
                if (isCalendarVisit(e)) setNavLoading(true);
            }),
            router.on("finish", (e) => {
                if (isCalendarVisit(e)) setNavLoading(false);
            }),
            router.on("networkError", () => setNavLoading(false)),
            router.on("httpException", () => setNavLoading(false)),
        ];
        return () => offs.forEach((off) => off());
    }, []);

    useEffect(() => {
        if (!pickerOpen) return;
        const onDown = (e) => {
            if (!pickerRef.current?.contains(e.target)) setPickerOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setPickerOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [pickerOpen]);

    const [y, m] = (calendar.month || "").split("-").map(Number);
    const year = y || new Date().getFullYear();
    const monthIdx = (m || new Date().getMonth() + 1) - 1;

    const allEvents = useMemo(
        () => (Array.isArray(calendar.events) ? calendar.events : []),
        [calendar.events],
    );

    const events = useMemo(() => {
        if (filter === "all") return allEvents;
        if (filter === "permit")
            return allEvents.filter((e) => PERMIT_TYPES.includes(e.type));
        if (filter === "loo")
            return allEvents.filter((e) => e.type.startsWith("loo_"));
        if (filter === "section")
            return allEvents.filter((e) => e.type.startsWith("section_"));
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
            for (
                ;
                d <= endD;
                d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
            ) {
                const k = dayKey(d);
                const seg = s === en ? "single" : k === s ? "start" : k === en ? "end" : "middle";
                (map[k] ??= []).push({ e, seg });
            }
        });
        Object.values(map).forEach((list) =>
            list.sort(
                (a, b) =>
                    (b.e.urgent ? 1 : 0) - (a.e.urgent ? 1 : 0) ||
                    a.e.start.localeCompare(b.e.start),
            ),
        );
        return map;
    }, [events]);

    const cells = useMemo(() => monthCells(year, monthIdx), [year, monthIdx]);

    const selectedEvents = useMemo(
        () => (byDay[selected] ?? []).map((x) => x.e),
        [byDay, selected],
    );

    // Event rentang yang menyentuh tanggal terpilih — sel-selnya disorot
    // dari awal sampai akhir agar batas event langsung kelihatan.
    const highlightIds = useMemo(() => {
        const set = new Set();
        (byDay[selected] ?? []).forEach(({ e }) => {
            if (e.end && e.end !== e.start) set.add(e.id);
        });
        return set;
    }, [byDay, selected]);
    const boardColumns = useMemo(
        () =>
            LEGEND_GROUPS.map((fam) => ({
                ...fam,
                items: events
                    .filter((e) => fam.types.includes(e.type))
                    .sort(
                        (a, b) =>
                            (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) ||
                            a.start.localeCompare(b.start),
                    ),
            })).filter((col) => col.items.length > 0),
        [events],
    );

    const visitData = (mm) => {
        const data = { cal_month: mm };
        if (view === "board") data.view = "board";
        if (filter !== "all") data.jenis = filter;
        return data;
    };
    const syncUrl = (nextView, nextFilter) => {
        const params = new URLSearchParams(window.location.search);
        if (nextView === "board") params.set("view", "board");
        else params.delete("view");
        if (nextFilter !== "all") params.set("jenis", nextFilter);
        else params.delete("jenis");
        const qs = params.toString();
        window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${qs ? `?${qs}` : ""}`,
        );
    };
    const goMonth = (delta) => {
        const d = new Date(year, monthIdx + delta, 1);
        const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        router.get("/dashboard", visitData(mm), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ["calendar"],
        });
    };
    const goToday = () => {
        const mm = dayKey(new Date()).slice(0, 7);
        setSelected(dayKey(new Date()));
        router.get("/dashboard", visitData(mm), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ["calendar"],
        });
    };
    const handleSelect = (k) => {
        setSelected(k);
        if (window.matchMedia?.("(max-width: 639px)").matches)
            setSheetOpen(true);
    };
    const handleCellClick = (k, d) => {
        const delta = (d.getFullYear() - year) * 12 + (d.getMonth() - monthIdx);
        if (delta !== 0) {
            setSelected(k);
            goMonth(delta);
            return;
        }
        handleSelect(k);
    };
    const onCellKeyDown = (ev, i) => {
        let target = null;
        if (ev.key === "ArrowLeft") target = i - 1;
        else if (ev.key === "ArrowRight") target = i + 1;
        else if (ev.key === "ArrowUp") target = i - 7;
        else if (ev.key === "ArrowDown") target = i + 7;
        else if (ev.key === "Home") target = i - (i % 7);
        else if (ev.key === "End") target = i - (i % 7) + 6;
        if (target == null || target < 0 || target > cells.length - 1) return;
        ev.preventDefault();
        cellRefs.current[target]?.focus();
    };
    const toggleCol = (label) =>
        setExpandedCols((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });

    const monthLabel = new Date(year, monthIdx, 1).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
    });
    const visibleFilters = FILTERS.filter((f) => {
        if (f.key === "all" || f.key === "permit") return true;
        if (f.key === "loo")
            return allEvents.some((e) => e.type.startsWith("loo_"));
        if (f.key === "section")
            return allEvents.some((e) => e.type.startsWith("section_"));
        return allEvents.some((e) => e.type === f.key);
    });
    const todayKey = dayKey(new Date());
    const currentMonthKey = todayKey.slice(0, 7);
    const viewedMonthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const rovingIdx = (() => {
        const sel = cells.findIndex((d) => dayKey(d) === selected);
        if (sel >= 0) return sel;
        const today = cells.findIndex((d) => dayKey(d) === todayKey);
        return today >= 0
            ? today
            : cells.findIndex((d) => d.getMonth() === monthIdx);
    })();
    const dayAriaLabel = (d) =>
        d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

    useEffect(() => {
        if (!visibleFilters.some((f) => f.key === filter)) {
            setFilter("all");
            syncUrl(view, "all");
        }
    }, [visibleFilters, filter, view]);

    return (
        <section
            aria-label="Kalender operasional"
            className="mt-4 bg-white rounded-2xl border border-[#E2E5EA] overflow-hidden"
        >
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 mr-auto">
                    <div className="relative inline-block" ref={pickerRef}>
                        <h2
                            aria-live="polite"
                            className="text-sm font-semibold text-gray-900"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setPickerYear(year);
                                    setPickerOpen((o) => !o);
                                }}
                                aria-expanded={pickerOpen}
                                aria-haspopup="dialog"
                                aria-label={`Pilih bulan — sekarang ${monthLabel}`}
                                className="-ml-1.5 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                <span className="capitalize">{monthLabel}</span>
                                <svg
                                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                            {navLoading && (
                                <svg
                                    className="ml-2 inline-block h-3.5 w-3.5 animate-spin align-middle text-gray-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                            )}
                        </h2>
                        {pickerOpen && (
                            <div
                                role="dialog"
                                aria-label="Pilih bulan"
                                className="absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-[#E2E5EA] bg-white p-2 shadow-lg"
                            >
                                <div className="flex items-center justify-between px-1 pb-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPickerYear((v) => v - 1)}
                                        aria-label="Tahun sebelumnya"
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                                    >
                                        <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15 19l-7-7 7-7"
                                            />
                                        </svg>
                                    </button>
                                    <span className="text-xs font-semibold tabular-nums text-gray-900">
                                        {pickerYear}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPickerYear((v) => v + 1)}
                                        aria-label="Tahun berikutnya"
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                                    >
                                        <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {MONTH_NAMES.map((name, i) => {
                                        const active =
                                            pickerYear === year && i === monthIdx;
                                        return (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => {
                                                    setPickerOpen(false);
                                                    const delta =
                                                        (pickerYear - year) * 12 +
                                                        (i - monthIdx);
                                                    if (delta !== 0) goMonth(delta);
                                                }}
                                                aria-pressed={active}
                                                className={`rounded-lg px-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${active ? "bg-[#0F1E36] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {view === "month"
                            ? `${events.length} agenda · klik tanggal untuk detail`
                            : `${events.length} agenda · dikelompokkan per jenis`}
                    </p>
                </div>
                <div
                    className="flex items-center gap-1 bg-gray-100 rounded-full p-1"
                    role="tablist"
                    aria-label="Tampilan kalender"
                >
                    {[
                        ["month", "Kalender"],
                        ["board", "Board"],
                    ].map(([k, label]) => (
                        <button
                            key={k}
                            role="tab"
                            aria-selected={view === k}
                            onClick={() => {
                                setView(k);
                                syncUrl(k, filter);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${view === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => goMonth(-1)}
                        aria-label="Bulan sebelumnya"
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[36px] min-w-[36px]"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={goToday}
                        className="px-3 h-9 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                        Hari ini
                    </button>
                    <button
                        onClick={() => goMonth(1)}
                        aria-label="Bulan berikutnya"
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[36px] min-w-[36px]"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div
                className="px-5 pt-3 flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter jenis agenda"
            >
                {visibleFilters.map((f) => {
                    let count = 0;
                    if (f.key === "all") count = allEvents.length;
                    else if (f.key === "permit")
                        count = allEvents.filter((e) =>
                            PERMIT_TYPES.includes(e.type),
                        ).length;
                    else if (f.key === "loo")
                        count = allEvents.filter((e) =>
                            e.type.startsWith("loo_"),
                        ).length;
                    else if (f.key === "section")
                        count = allEvents.filter((e) =>
                            e.type.startsWith("section_"),
                        ).length;
                    else
                        count = allEvents.filter(
                            (e) => e.type === f.key,
                        ).length;
                    return (
                        <button
                            key={f.key}
                            onClick={() => {
                                setFilter(f.key);
                                syncUrl(view, f.key);
                            }}
                            aria-pressed={filter === f.key}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f.key ? "bg-[#0F1E36] text-white border-[#0F1E36]" : "bg-white text-gray-600 border-[#E2E5EA] hover:bg-gray-50"}`}
                        >
                            {f.label}
                            <span
                                className={`ml-1.5 tabular-nums ${filter === f.key ? "text-white/70" : "text-gray-400"}`}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="px-5 py-2">
                <button
                    type="button"
                    onClick={() => setLegendOpen((o) => !o)}
                    aria-expanded={legendOpen}
                    aria-controls="calendar-legend"
                    className="-ml-1.5 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                >
                    Legenda
                    <svg
                        className={`h-3 w-3 transition-transform ${legendOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
                {legendOpen && (
                    <div
                        id="calendar-legend"
                        className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1"
                    >
                        {LEGEND_GROUPS.filter((g) =>
                            allEvents.some((e) => g.types.includes(e.type)),
                        ).map((g) => (
                            <span
                                key={g.label}
                                className="inline-flex items-center gap-1.5 text-[11px] text-gray-500"
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${g.dot}`}
                                    aria-hidden="true"
                                />
                                {g.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {view === "month" ? (
                <div
                    aria-busy={navLoading}
                    className={`px-3 sm:px-5 pb-5 transition-opacity ${navLoading ? "pointer-events-none opacity-60" : ""}`}
                    onTouchStart={(e) => {
                        touchX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                        if (touchX.current == null) return;
                        const dx = e.changedTouches[0].clientX - touchX.current;
                        touchX.current = null;
                        if (dx < -60) goMonth(1);
                        else if (dx > 60) goMonth(-1);
                    }}
                >
                    <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 py-2">
                        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                            (d) => (
                                <span key={d}>{d}</span>
                            ),
                        )}
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
                                    onClick={() => handleCellClick(k, d)}
                                    className={`min-h-[52px] sm:min-h-[92px] rounded-xl border p-1 sm:p-1.5 flex flex-col cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-[#0F1E36] ${
                                        isSelected
                                            ? "border-[#0F1E36] ring-1 ring-[#0F1E36] bg-[#0F1E36]/[0.03]"
                                            : "border-gray-100 hover:border-gray-300 hover:bg-gray-50/60"
                                    } ${inMonth ? "" : "opacity-40"} ${weekend && inMonth ? "bg-gray-50/70" : ""}`}
                                >
                                    <button
                                        ref={(el) => (cellRefs.current[i] = el)}
                                        tabIndex={i === rovingIdx ? 0 : -1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCellClick(k, d);
                                        }}
                                        onKeyDown={(e) => onCellKeyDown(e, i)}
                                        aria-pressed={isSelected}
                                        aria-label={`${dayAriaLabel(d)}, ${dayEvents.length} agenda`}
                                        className={`self-start inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${isToday ? "bg-[#0F1E36] text-white" : weekend ? "text-gray-400" : "text-gray-700"}`}
                                    >
                                        {d.getDate()}
                                    </button>
                                    <div className="mt-1 hidden sm:flex sm:flex-col gap-1">
                                        {shown.map(({ e, seg }) => {
                                            const meta =
                                                TYPE_META[e.type] ??
                                                TYPE_META.permit;
                                            const isHl = highlightIds.has(e.id);
                                            const urgent = !!e.urgent;
                                            const rangeTitle = `${e.title}${e.end && e.end !== e.start ? ` (${e.start} s/d ${e.end})` : ""}`;
                                            if (seg === "middle") {
                                                return (
                                                    <span
                                                        key={e.id}
                                                        title={rangeTitle}
                                                        aria-hidden="true"
                                                        className={`block rounded-full ${isHl ? `h-2.5 mt-[5px] ${meta.hlGlow}` : "h-1.5 mt-[7px]"} ${meta.dot}`}
                                                    />
                                                );
                                            }
                                            if (seg === "end") {
                                                const endLabel = new Date(
                                                    `${e.end}T00:00:00`,
                                                ).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                });
                                                return (
                                                    <span
                                                        key={e.id}
                                                        title={rangeTitle}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`${isHl ? `h-2.5 ${meta.hlGlow}` : "h-1.5"} flex-1 rounded-r-full ${meta.dot}`}
                                                        />
                                                        <span className="text-[10px] font-medium text-gray-500 tabular-nums">
                                                            s/d {endLabel}
                                                        </span>
                                                    </span>
                                                );
                                            }
                                            return (
                                                <Link
                                                    key={e.id}
                                                    href={e.url}
                                                    onClick={(ev) =>
                                                        ev.stopPropagation()
                                                    }
                                                    title={rangeTitle}
                                                    className={`block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:shadow-sm transition-shadow focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${seg === "start" ? "rounded-full" : ""} ${meta.chip} ${urgent ? "!bg-red-50 !text-red-700 !border-red-200" : ""} ${isHl ? `ring-2 ${meta.hlRing} ${meta.hlGlow}` : ""}`}
                                                >
                                                    {e.title}
                                                </Link>
                                            );
                                        })}
                                        {extra > 0 && (
                                            <span className="text-[10px] text-gray-400 font-medium px-1">
                                                +{extra} lagi
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex sm:hidden items-center justify-start gap-0.5 flex-wrap min-h-[6px]">
                                        {dayEvents.slice(0, 4).map(({ e }) => {
                                            const m = TYPE_META[e.type] ?? TYPE_META.permit;
                                            const isHl = highlightIds.has(e.id);
                                            return (
                                                <span
                                                    key={e.id}
                                                    className={`rounded-full ${m.dot} ${isHl ? `w-2.5 h-2.5 ring-2 ${m.hlRing}` : "w-1.5 h-1.5"}`}
                                                />
                                            );
                                        })}
                                        {dayEvents.some(({ e }) => e.urgent) && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        )}
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
                <div
                    aria-busy={navLoading}
                    className={`px-3 sm:px-5 pb-5 transition-opacity ${navLoading ? "pointer-events-none opacity-60" : ""}`}
                >
                    {events.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm font-medium text-gray-500">
                                Tidak ada agenda bulan ini.
                            </p>
                            {viewedMonthKey !== currentMonthKey && (
                                <button
                                    onClick={goToday}
                                    className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0F1E36] rounded-lg hover:bg-[#1a2f52] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    Kembali ke bulan ini
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 overflow-x-auto pt-1 pb-2 [scrollbar-width:thin]">
                            {boardColumns.map((col) => {
                                const isOpen =
                                    expandedCols.has(col.label) ||
                                    col.items.length <= BOARD_PREVIEW;
                                const visibleItems = isOpen
                                    ? col.items
                                    : col.items.slice(0, BOARD_PREVIEW);
                                return (
                                    <div
                                        key={col.label}
                                        className="shrink-0 w-72 bg-gray-50/70 border border-gray-100 rounded-2xl p-2.5"
                                    >
                                        <h3 className="flex items-center gap-1.5 px-1.5 pb-2">
                                            <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`}
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">
                                                {col.label}
                                            </span>
                                            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-500 border border-gray-200 tabular-nums whitespace-nowrap">
                                                {col.items.length}
                                            </span>
                                        </h3>
                                        <ul className="space-y-2">
                                            {visibleItems.map((e) => (
                                                <BoardCard key={e.id} event={e} />
                                            ))}
                                        </ul>
                                        {col.items.length > BOARD_PREVIEW && (
                                            <button
                                                onClick={() =>
                                                    toggleCol(col.label)
                                                }
                                                aria-expanded={isOpen}
                                                className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-medium text-gray-500 hover:bg-white hover:text-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                            >
                                                {isOpen
                                                    ? "Sembunyikan"
                                                    : `+${col.items.length - BOARD_PREVIEW} agenda lagi`}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <DaySheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                dateKey={selected}
                events={selectedEvents}
                onNavigateMonth={goMonth}
            />
        </section>
    );
}

function DayPanel({ dateKey, events }) {
    if (!dateKey) return null;
    const label = new Date(`${dateKey}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    const spanCount = events.filter((e) => e.end && e.end !== e.start).length;
    return (
        <div
            className="mt-3 rounded-xl border border-[#E2E5EA] bg-gray-50/60 p-3"
            aria-live="polite"
        >
            <p className="text-xs font-semibold text-gray-900 capitalize">
                {label} · {events.length} agenda
            </p>
            {spanCount > 0 && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                    Menyorot {spanCount} event rentang — sel terwarnai dari awal sampai akhir.
                </p>
            )}
            {events.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">
                    Tidak ada agenda hari ini.
                </p>
            ) : (
                <div className="mt-2 space-y-3">
                    {groupByFamily(events).map((g) => (
                        <div key={g.label}>
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
                                {g.label}
                                <span className="font-normal text-gray-400 tabular-nums">{g.items.length}</span>
                            </p>
                            <ul className="space-y-1.5">
                                {g.items.map((e) => (
                                    <AgendaRow key={e.id} event={e} span={spanDay(e, dateKey)} />
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DaySheet({ open, onClose, dateKey, events, onNavigateMonth }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;
    const label = dateKey
        ? new Date(`${dateKey}T00:00:00`).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
          })
        : "";

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`Agenda ${label}`}
        >
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-h-[78dvh] flex flex-col bg-white rounded-t-2xl shadow-xl overflow-hidden">
                <div
                    className="pt-2.5 pb-1 flex justify-center shrink-0"
                    aria-hidden="true"
                >
                    <span className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                            {label}
                        </p>
                        <p className="text-xs text-gray-400">
                            {events.length} agenda
                            {dateKey ? ` · ${relDay(dateKey)}` : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => onNavigateMonth(-1)}
                            aria-label="Bulan sebelumnya"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={() => onNavigateMonth(1)}
                            aria-label="Bulan berikutnya"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            aria-label="Tutup agenda"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
                    {events.length === 0 ? (
                        <p className="px-2 py-8 text-sm text-gray-400 text-center">
                            Tidak ada agenda hari ini.
                        </p>
                    ) : (
                        <div className="space-y-3 px-1">
                            {groupByFamily(events).map((g) => (
                                <div key={g.label}>
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 px-1 mb-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
                                        {g.label}
                                        <span className="font-normal text-gray-400 tabular-nums">{g.items.length}</span>
                                    </p>
                                    <ul className="space-y-1">
                                        {g.items.map((e) => (
                                            <AgendaRow key={e.id} event={e} span={spanDay(e, dateKey)} />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function AgendaRow({ event: e, span = null }) {
    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
    const dateLabel = new Date(`${e.start}T00:00:00`).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "short" },
    );
    const range =
        e.end && e.end !== e.start
            ? `${dateLabel} – ${new Date(`${e.end}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
            : dateLabel;
    return (
        <li>
            <Link
                href={e.url}
                className={`flex items-center gap-2.5 rounded-xl border-l-2 px-2 py-1.5 transition-colors group focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${meta.bar.split(" ").slice(-1)[0]} hover:bg-gray-50`}
            >
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs sm:text-sm text-gray-800 group-hover:text-gray-950">
                        {e.title}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-400">
                        {meta.label} · {range}
                        {span ? ` · ${span}` : ""}
                        {` · ${relDay(e.start)}`}
                        {e.urgent ? " · H-30" : ""}
                    </span>
                </span>
                {span && (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 tabular-nums whitespace-nowrap">
                        {span}
                    </span>
                )}
                {e.urgent && (
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                        Segera
                    </span>
                )}
                {e.status && (
                    <span className="hidden sm:inline shrink-0 text-[11px] text-gray-400">
                        {e.status}
                    </span>
                )}
            </Link>
        </li>
    );
}

function BoardCard({ event: e }) {
    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
    const dateLabel = new Date(`${e.start}T00:00:00`).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "short" },
    );
    const range =
        e.end && e.end !== e.start
            ? `${dateLabel} – ${new Date(`${e.end}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
            : dateLabel;
    return (
        <li>
            <Link
                href={e.url}
                className={`block rounded-xl border border-[#E2E5EA] border-l-2 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,30,54,0.04)] transition-all group focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${meta.bar.split(" ").slice(-1)[0]} ${
                    e.urgent
                        ? "!border-l-red-400 bg-red-50/40 hover:bg-red-50/70"
                        : "hover:border-gray-300 hover:shadow-[0_4px_12px_-6px_rgba(15,30,54,0.25)]"
                }`}
            >
                <span className="line-clamp-2 text-xs sm:text-[13px] font-medium leading-snug text-gray-900 group-hover:text-gray-950">
                    {e.title}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                    <span className="tabular-nums">{range}</span>
                    <span className="text-gray-300" aria-hidden="true">
                        ·
                    </span>
                    <span>{relDay(e.start)}</span>
                    {e.status && <span>{e.status}</span>}
                </span>
                {e.urgent && (
                    <span className="mt-1.5 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                        Segera
                    </span>
                )}
            </Link>
        </li>
    );
}
