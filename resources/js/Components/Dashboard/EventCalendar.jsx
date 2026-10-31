import { Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconRefresh,
    IconX,
} from "@/Components/Icons";

const TYPE_META = {
    permit: {
        label: "Izin Kerja",
        dot: "bg-blue-500",
        chip: "bg-blue-50 text-blue-800 border-blue-200",
        
        hlRing: "ring-blue-400",
    },
    pameran: {
        label: "Pameran",
        dot: "bg-[#FF6B6B]",
        chip: "bg-[#FF6B6B]/10 text-[#D64545] border-[#FF6B6B]/20",
        
        hlRing: "ring-[#FF6B6B]",
    },
    kegiatan: {
        label: "Kegiatan",
        dot: "bg-emerald-500",
        chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
        
        hlRing: "ring-emerald-400",
    },
    parkir: {
        label: "Parkir",
        dot: "bg-orange-500",
        chip: "bg-orange-50 text-orange-800 border-orange-200",
        
        hlRing: "ring-orange-400",
    },
    customer: {
        label: "Customer Isi Form",
        dot: "bg-violet-500",
        chip: "bg-violet-50 text-violet-800 border-violet-200",
        
        hlRing: "ring-violet-400",
    },
    contract_start: {
        label: "Kontrak mulai",
        dot: "bg-purple-500",
        chip: "bg-purple-50 text-purple-800 border-purple-200",
        
        hlRing: "ring-purple-400",
    },
    contract_end: {
        label: "Kontrak berakhir",
        dot: "bg-purple-500",
        chip: "bg-purple-50 text-purple-800 border-purple-200",
        
        hlRing: "ring-purple-400",
    },
    sidak: {
        label: "Sidak",
        dot: "bg-amber-500",
        chip: "bg-amber-50 text-amber-900 border-amber-200",
        
        hlRing: "ring-amber-400",
    },
    loo_received: {
        label: "LOO diterima",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    loo_submitted: {
        label: "LOO disubmit",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    loo_completed: {
        label: "LOO selesai",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    loo_cancelled: {
        label: "LOO dibatalkan",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    section_filled: {
        label: "Section diisi",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    section_submitted: {
        label: "Section disubmit",
        dot: "bg-indigo-500",
        chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
        
        hlRing: "ring-indigo-400",
    },
    libur_nasional: {
        label: "Libur nasional",
        dot: "bg-red-500",
        chip: "bg-red-50 text-red-800 border-red-200",
        
        hlRing: "ring-red-400",
    },
    cuti_bersama: {
        label: "Cuti bersama",
        dot: "bg-teal-500",
        chip: "bg-teal-50 text-teal-800 border-teal-200",
        
        hlRing: "ring-teal-400",
    },
};

// Legenda diringkas per keluarga agar hue tetap sedikit.
const LEGEND_GROUPS = [
    { label: "Izin Kerja", dot: "bg-blue-500", types: ["permit"] },
    { label: "Pameran", dot: "bg-[#FF6B6B]", types: ["pameran"] },
    { label: "Kegiatan", dot: "bg-emerald-500", types: ["kegiatan"] },
    { label: "Parkir", dot: "bg-orange-500", types: ["parkir"] },
    { label: "Customer Isi Form", dot: "bg-violet-500", types: ["customer"] },
    { label: "Kontrak", dot: "bg-purple-500", types: ["contract_start", "contract_end"] },
    { label: "Sidak", dot: "bg-amber-500", types: ["sidak"] },
    { label: "LOO", dot: "bg-indigo-500", types: ["loo_received", "loo_submitted", "loo_completed", "loo_cancelled", "section_filled", "section_submitted"] },
    { label: "Libur & cuti bersama", dot: "bg-red-500", types: ["libur_nasional", "cuti_bersama"] },
];

const FILTERS = [
    { key: "all", label: "Semua" },
    { key: "permit", label: "Izin" },
    { key: "pameran", label: "Pameran" },
    { key: "kegiatan", label: "Kegiatan" },
    { key: "parkir", label: "Parkir" },
    { key: "customer", label: "Customer" },
    { key: "contract_start", label: "Kontrak mulai" },
    { key: "contract_end", label: "Kontrak berakhir" },
    { key: "sidak", label: "Sidak" },
    { key: "loo", label: "LOO" },
    { key: "section", label: "Section" },
    { key: "libur_nasional", label: "Libur nasional" },
    { key: "cuti_bersama", label: "Cuti bersama" },
];

const PERMIT_TYPES = ["permit", "pameran", "kegiatan", "parkir", "customer"];

// Status permit/LOO/kontrak tampil berlabel Indonesia, bukan nilai mentah DB.
const STATUS_LABEL = {
    pending: "Menunggu",
    completed: "Selesai",
    rejected: "Ditolak",
    cancelled: "Dibatalkan",
    draft: "Draft",
    active: "Aktif",
    ended: "Berakhir",
    terminated: "Diakhiri",
    in_progress: "Berjalan",
    pengisian_divisi: "Pengisian divisi",
    sebelum_fitout: "Sebelum fitout",
    setelah_fitout: "Setelah fitout",
    pengukuran_ulang: "Pengukuran ulang",
};
const statusLabel = (s) => STATUS_LABEL[s] ?? s;

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
    new Date(2026, i, 1).toLocaleDateString("id-ID", { month: "long" }),
);

const familyOf = (type) =>
    LEGEND_GROUPS.find((g) => g.types.includes(type)) ?? LEGEND_GROUPS[0];

// Event tanpa url (mis. libur nasional) tetap tampil, tapi bukan link.
function EventWrap({ href, ...props }) {
    return href ? <Link href={href} {...props} /> : <span {...props} />;
}

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

function shortDate(k) {
    return new Date(`${k}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
    });
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
    const [pickerMonth, setPickerMonth] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const touchX = useRef(null);
    const cellRefs = useRef([]);
    const pickerRef = useRef(null);
    const filterRef = useRef(null);

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

    useEffect(() => {
        if (!filterOpen) return;
        const onDown = (e) => {
            if (!filterRef.current?.contains(e.target)) setFilterOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setFilterOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [filterOpen]);

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

    // Rentang yang punya chip di tanggal terpilih: chip itu diangkat (desktop)
    // dan dot-nya dibesarkan (mobile). Sebelumnya semua rentang yang sekadar
    // "lewat" ikut masuk, jadi sorotan nyasar ke tanggal yang tidak diklik user.
    const highlightIds = useMemo(() => {
        const set = new Set();
        (byDay[selected] ?? []).forEach(({ e, seg }) => {
            if (seg !== "middle" && e.end && e.end !== e.start) set.add(e.id);
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
        // Tanggal terpilih bisa tertinggal di bulan lain setelah navigasi;
        // panel harian akan menampilkan hari yang tidak terlihat di grid.
        if (selected.slice(0, 7) !== mm) setSelected(`${mm}-01`);
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
    // Pilih bulan dari popover: satu request hanya saat bulan benar-benar dipilih.
    const pickMonth = (targetYear, targetIdx) => {
        setPickerOpen(false);
        const delta = (targetYear - year) * 12 + (targetIdx - monthIdx);
        if (delta !== 0) goMonth(delta);
    };
    const openPicker = () => {
        setPickerYear(year);
        setPickerMonth(monthIdx);
        setPickerOpen((o) => !o);
    };
    const onPickerKeyDown = (ev) => {
        const base = pickerMonth ?? monthIdx;
        const baseYear = Number(pickerYear) || year;
        let nextMonth = base;
        let nextYear = baseYear;
        if (ev.key === "ArrowLeft") nextMonth = base - 1;
        else if (ev.key === "ArrowRight") nextMonth = base + 1;
        else if (ev.key === "ArrowUp") nextMonth = base - 3;
        else if (ev.key === "ArrowDown") nextMonth = base + 3;
        else if (ev.key === "PageUp") nextYear = baseYear - 1;
        else if (ev.key === "PageDown") nextYear = baseYear + 1;
        else if (ev.key === "Home") {
            nextYear = new Date().getFullYear();
            nextMonth = new Date().getMonth();
        } else if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            pickMonth(baseYear, base);
            return;
        } else return;
        ev.preventDefault();
        const normYear = nextYear + Math.floor(nextMonth / 12);
        const normMonth = ((nextMonth % 12) + 12) % 12;
        setPickerYear(normYear);
        setPickerMonth(normMonth);
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
    // Satu pass atas allEvents: hitungan per tombol filter + ketersediaan filter.
    // Menggantikan N× .filter()/.some() yang sebelumnya jalan tiap render tombol.
    // Keluarga yang punya event bulan ini — dihitung sekali, bukan tiap render legenda.
    const { filterCounts, visibleFilters, activeLegendGroups } = useMemo(() => {
        const counts = { all: allEvents.length, loo: 0, section: 0 };
        const seen = new Set();
        for (const e of allEvents) {
            // Hitung tiap tipe individual DULU — sebelumnya pameran/kegiatan
            // tertelan ke `permit` sehingga dropdown selalu menampilkan 0.
            counts[e.type] = (counts[e.type] ?? 0) + 1;
            if (e.type.startsWith("loo_")) counts.loo += 1;
            else if (e.type.startsWith("section_")) counts.section += 1;
            seen.add(e.type);
        }
        // "Izin" = gabungan seluruh form izin; jumlahkan setelah loop agar tipe
        // `permit` sendiri tidak terhitung dua kali.
        counts.permit = PERMIT_TYPES.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
        const visible = FILTERS.filter((f) => {
            if (f.key === "all" || f.key === "permit") return true;
            if (f.key === "loo") return counts.loo > 0;
            if (f.key === "section") return counts.section > 0;
            return seen.has(f.key);
        });
        const active = LEGEND_GROUPS.filter((g) => g.types.some((t) => seen.has(t)));
        return { filterCounts: counts, visibleFilters: visible, activeLegendGroups: active };
    }, [allEvents]);
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
    // Label aria per sel dihitung sekali per bulan — bukan 42× toLocaleDateString tiap render.
    const cellAriaLabels = useMemo(
        () =>
            cells.map((d) =>
                d.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                }),
            ),
        [cells],
    );

    useEffect(() => {
        if (!visibleFilters.some((f) => f.key === filter)) {
            setFilter("all");
            syncUrl(view, "all");
        }
    }, [visibleFilters, filter, view]);

    return (
        <section
            aria-label="Kalender operasional"
            className="mt-4 bg-white rounded-lg border border-[#E2E5EA] overflow-hidden"
        >
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 mr-auto">
                    <div className="flex items-center gap-2">
                        <div className="inline-flex items-center rounded-lg border border-[#E2E5EA] bg-white">
                            <button
                                type="button"
                                onClick={() => goMonth(-1)}
                                aria-label="Bulan sebelumnya"
                                className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconChevronLeft className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <div className="relative" ref={pickerRef}>
                                <h2 aria-live="polite">
                                    <button
                                        type="button"
                                        onClick={openPicker}
                                        aria-expanded={pickerOpen}
                                        aria-haspopup="dialog"
                                        aria-label={`Pilih bulan — sekarang ${monthLabel}`}
                                        className="inline-flex h-9 items-center gap-1 border-x border-[#E2E5EA] px-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                    >
                                        <span className="capitalize">{monthLabel}</span>
                                        <IconChevronDown
                                            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </h2>
                                {pickerOpen && (
                                    <div
                                        role="dialog"
                                        aria-label="Pilih bulan"
                                        onKeyDown={onPickerKeyDown}
                                        className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-[#E2E5EA] bg-white p-2 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between gap-1 px-1 pb-2">
                                            <button
                                                type="button"
                                                onClick={() => setPickerYear((v) => (Number(v) || year) - 1)}
                                                aria-label="Tahun sebelumnya"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                            >
                                                <IconChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                            </button>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                aria-label="Tahun"
                                                value={pickerYear ?? year}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                    setPickerYear(digits === "" ? "" : Number(digits));
                                                }}
                                                onBlur={() => {
                                                    const n = Number(pickerYear);
                                                    setPickerYear(
                                                        !n || n < 2000 || n > 2100 ? year : n,
                                                    );
                                                }}
                                                onKeyDown={(e) => {
                                                    // Input tahun punya kendali sendiri: jangan bocor ke
                                                    // navigasi keyboard popover (Enter/Space akan pindah bulan).
                                                    e.stopPropagation();
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        const n = Number(pickerYear);
                                                        setPickerYear(
                                                            !n || n < 2000 || n > 2100 ? year : n,
                                                        );
                                                    }
                                                }}
                                                className="w-16 rounded-lg border border-transparent px-1 py-1 text-center text-xs font-semibold tabular-nums text-slate-900 transition-colors hover:border-[#E2E5EA] focus:border-[#0F1E36] focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setPickerYear((v) => (Number(v) || year) + 1)}
                                                aria-label="Tahun berikutnya"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                            >
                                                <IconChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {MONTH_NAMES.map((name, i) => {
                                                const active =
                                                    Number(pickerYear) === year && i === monthIdx;
                                                const focused = i === (pickerMonth ?? monthIdx);
                                                const isCurrent =
                                                    Number(pickerYear) === Number(currentMonthKey.slice(0, 4)) &&
                                                    i === Number(currentMonthKey.slice(5, 7)) - 1;
                                                return (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => pickMonth(Number(pickerYear) || year, i)}
                                                        aria-pressed={active}
                                                        className={`relative rounded-lg px-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${active ? "bg-[#0F1E36] text-white" : "text-slate-600 hover:bg-slate-100"} ${focused && !active ? "ring-1 ring-[#0F1E36]/40" : ""} focus-visible:outline-2 focus-visible:outline-[#0F1E36]`}
                                                    >
                                                        {name}
                                                        {isCurrent && (
                                                            <span
                                                                className={`absolute right-1 top-1 h-1 w-1 rounded-full ${active ? "bg-white" : "bg-[#0F1E36]"}`}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
                                            {[
                                                ["Bulan ini", 0],
                                                ["Bulan depan", 1],
                                                ["+3 bulan", 3],
                                            ].map(([label, offset]) => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => {
                                                        const d = new Date();
                                                        d.setDate(1);
                                                        d.setMonth(d.getMonth() + offset);
                                                        pickMonth(d.getFullYear(), d.getMonth());
                                                    }}
                                                    className="flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => goMonth(1)}
                                aria-label="Bulan berikutnya"
                                className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                <IconChevronRight className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={goToday}
                            className="h-9 rounded-lg border border-[#E2E5EA] px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        >
                            Hari ini
                        </button>
                        {navLoading && (
                            <IconRefresh
                                className="h-3.5 w-3.5 animate-spin text-slate-400"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {view === "month"
                            ? `${events.length} agenda · klik tanggal untuk detail`
                            : `${events.length} agenda · dikelompokkan per jenis`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="relative" ref={filterRef}>
                        <button
                            type="button"
                            onClick={() => setFilterOpen((o) => !o)}
                            aria-expanded={filterOpen}
                            aria-haspopup="listbox"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E5EA] px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                        >
                            <span>{FILTERS.find((f) => f.key === filter)?.label ?? "Semua"}</span>
                            <span className="tabular-nums text-slate-400">{filterCounts[filter] ?? 0}</span>
                            <IconChevronDown
                                className={`h-3 w-3 text-slate-400 transition-transform ${filterOpen ? "rotate-180" : ""}`}
                                aria-hidden="true"
                            />
                        </button>
                        {filterOpen && (
                            <div
                                role="listbox"
                                aria-label="Filter jenis agenda"
                                className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-[#E2E5EA] bg-white p-1 shadow-lg"
                            >
                                {visibleFilters.map((f) => {
                                    const count = filterCounts[f.key] ?? 0;
                                    const active = filter === f.key;
                                    return (
                                        <button
                                            key={f.key}
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onClick={() => {
                                                setFilter(f.key);
                                                syncUrl(view, f.key);
                                                setFilterOpen(false);
                                            }}
                                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${active ? "bg-[#0F1E36] font-medium text-white" : "text-slate-600 hover:bg-slate-100"}`}
                                        >
                                            <span className="flex-1">{f.label}</span>
                                            <span
                                                className={`tabular-nums ${active ? "text-white/70" : "text-slate-400"}`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setLegendOpen((o) => !o)}
                        aria-expanded={legendOpen}
                        aria-controls="calendar-legend"
                        className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${legendOpen ? "border-[#0F1E36] bg-slate-50 text-slate-900" : "border-[#E2E5EA] text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                        Legenda
                        <IconChevronDown
                            className={`h-3 w-3 text-slate-400 transition-transform ${legendOpen ? "rotate-180" : ""}`}
                            aria-hidden="true"
                        />
                    </button>
                    <div
                        className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
                        role="group"
                        aria-label="Tampilan kalender"
                    >
                        {[
                            ["month", "Kalender"],
                            ["board", "Board"],
                        ].map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                aria-pressed={view === k}
                                onClick={() => {
                                    setView(k);
                                    syncUrl(k, filter);
                                }}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${view === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {legendOpen && (
                <div
                    id="calendar-legend"
                    className="flex flex-wrap gap-x-3 gap-y-1 border-b border-slate-100 px-5 py-2"
                >
                    {activeLegendGroups.map((g) => (
                        <span
                            key={g.label}
                            className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"
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
                    <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400 py-2">
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
                            // Opsi C: hari tengah rentang tidak menggambar apa pun.
                            // Hanya awal & akhir yang tampil, jadi slot chip tidak
                            // lagi dimakan bar tanpa identitas.
                            const visibleEvents = dayEvents.filter(
                                ({ seg }) => seg !== "middle",
                            );
                            const shown = visibleEvents.slice(0, MAX_CHIPS);
                            const extra = visibleEvents.length - shown.length;
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
                                            : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/60"
                                    } ${inMonth ? "" : "opacity-40"} ${weekend && inMonth ? "bg-slate-50/70" : ""}`}
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
                                        aria-label={`${cellAriaLabels[i]}, ${dayEvents.length} agenda`}
                                        className={`self-start inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${isToday ? "bg-[#0F1E36] text-white" : weekend ? "text-slate-400" : "text-slate-700"}`}
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
                                            // Rentang: judul selalu ikut agar penanda
                                            // akhir tidak terbaca sebagai milik kegiatan
                                            // lain yang kebetulan lewat di hari itu.
                                            const isRange = !!e.end && e.end !== e.start;
                                            const dateNote = isRange
                                                ? seg === "end"
                                                    ? `s/d ${shortDate(e.end)}`
                                                    : `→ ${shortDate(e.end)}`
                                                : "";
                                            // Bentuk ujung rentang selalu beda — awal
                                            // membulat di kiri, akhir di kanan — supaya
                                            // arah rentang terbaca tanpa perlu klik.
                                            const shape = !isRange
                                                ? ""
                                                : seg === "end"
                                                  ? "rounded-l-md rounded-r-full"
                                                  : "rounded-l-full rounded-r-md";
                                            // Elevasi + warna solid hanya untuk rentang
                                            // yang tanggalnya sedang dipilih: klik = chip
                                            // terangkat, membesar ke sisi tumbuhnya, dan
                                            // berubah warna — hijau awal, merah akhir —
                                            // supaya kedua ujungnya kontras dan terbaca
                                            // sebagai sepasang. Warna jenis/urgent tetap
                                            // berlaku di luar keadaan itu.
                                            const popped = isRange && isHl;
                                            const lift = popped
                                                ? `relative z-10 -translate-y-1 scale-[1.05] shadow-lg hover:shadow-xl ${
                                                      seg === "end"
                                                          ? "origin-right"
                                                          : "origin-left"
                                                  }`
                                                : "hover:shadow-sm";
                                            const tone = !popped
                                                ? urgent
                                                    ? "!bg-rose-50 !text-rose-700 !border-rose-200"
                                                    : meta.chip
                                                : seg === "end"
                                                  ? "!bg-rose-700 !text-white !border-rose-800"
                                                  : "!bg-emerald-700 !text-white !border-emerald-800";
                                            return (
                                                <EventWrap
                                                    key={e.id}
                                                    href={e.url}
                                                    onClick={(ev) =>
                                                        ev.stopPropagation()
                                                    }
                                                    title={rangeTitle}
                                                    className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-shadow focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${shape} ${lift} ${tone}`}
                                                >
                                                    <span className="min-w-0 truncate">
                                                        {e.title}
                                                    </span>
                                                    {dateNote && (
                                                        <span
                                                            className={`ml-auto shrink-0 pl-1 text-[9px] font-normal tabular-nums ${
                                                                popped
                                                                    ? "opacity-90"
                                                                    : "opacity-70"
                                                            }`}
                                                        >
                                                            {dateNote}
                                                        </span>
                                                    )}
                                                </EventWrap>
                                            );
                                        })}
                                        {extra > 0 && (
                                            <span className="text-[10px] text-slate-400 font-medium px-1">
                                                +{extra} lagi
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex sm:hidden items-center justify-start gap-0.5 flex-wrap min-h-[6px]">
                                        {visibleEvents.slice(0, 4).map(({ e }) => {
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
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
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
                            <p className="text-sm font-medium text-slate-500">
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
                                        className="flex w-72 shrink-0 flex-col rounded-xl border border-[#E2E5EA] bg-white"
                                    >
                                        <h3 className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`}
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                                                {col.label}
                                            </span>
                                            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 tabular-nums whitespace-nowrap">
                                                {col.items.length}
                                            </span>
                                        </h3>
                                        <ul className="divide-y divide-slate-100">
                                            {visibleItems.map((e) => (
                                                <BoardRow key={e.id} event={e} />
                                            ))}
                                        </ul>
                                        {col.items.length > BOARD_PREVIEW && (
                                            <button
                                                onClick={() =>
                                                    toggleCol(col.label)
                                                }
                                                aria-expanded={isOpen}
                                                className="w-full border-t border-slate-100 py-2 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
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
    // Hanya rentang yang chip-nya benar-benar tampil di tanggal terpilih,
    // sejalan dengan yang diangkat di grid.
    const spanCount = events.filter(
        (e) =>
            e.end &&
            e.end !== e.start &&
            (e.start === dateKey || e.end === dateKey),
    ).length;
    return (
        <div
            className="mt-3 rounded-xl border border-[#E2E5EA] bg-slate-50/60 p-3"
            aria-live="polite"
        >
            <p className="text-xs font-semibold text-slate-900 capitalize">
                {label} · {events.length} agenda
            </p>
            {spanCount > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                    Awal & akhir {spanCount} event rentang diangkat di kalender —
                    hijau awal, merah akhir.
                </p>
            )}
            {events.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">
                    Tidak ada agenda hari ini.
                </p>
            ) : (
                <div className="mt-2 space-y-3">
                    {groupByFamily(events).map((g) => (
                        <div key={g.label}>
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
                                {g.label}
                                <span className="font-normal text-slate-400 tabular-nums">{g.items.length}</span>
                            </p>
                            <ul className="divide-y divide-slate-100">
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
                    <span className="w-10 h-1 rounded-full bg-slate-300" />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 shrink-0">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 capitalize truncate">
                            {label}
                        </p>
                        <p className="text-xs text-slate-400">
                            {events.length} agenda
                            {dateKey ? ` · ${relDay(dateKey)}` : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => onNavigateMonth(-1)}
                            aria-label="Bulan sebelumnya"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                        >
                            <IconChevronLeft className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => onNavigateMonth(1)}
                            aria-label="Bulan berikutnya"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                        >
                            <IconChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            onClick={onClose}
                            autoFocus
                            aria-label="Tutup agenda"
                            className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
                        >
                            <IconX className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
                    {events.length === 0 ? (
                        <p className="px-2 py-8 text-sm text-slate-400 text-center">
                            Tidak ada agenda hari ini.
                        </p>
                    ) : (
                        <div className="space-y-3 px-1">
                            {groupByFamily(events).map((g) => (
                                <div key={g.label}>
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 px-1 mb-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} aria-hidden="true" />
                                        {g.label}
                                        <span className="font-normal text-slate-400 tabular-nums">{g.items.length}</span>
                                    </p>
                                    <ul className="divide-y divide-slate-100">
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
    const range =
        e.end && e.end !== e.start
            ? e.start.slice(0, 7) === e.end.slice(0, 7)
                ? `${new Date(`${e.start}T00:00:00`).getDate()}–${shortDate(e.end)}`
                : `${shortDate(e.start)} – ${shortDate(e.end)}`
            : shortDate(e.start);

    return (
        <li>
            <EventWrap
                href={e.url}
                className="flex items-start gap-3 px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
            >
                <span className="w-16 shrink-0 pt-px text-[11px] font-medium leading-tight tabular-nums text-slate-400">
                    {range}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-900">
                        {e.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {relDay(e.start)}
                        {span ? ` · ${span}` : ""}
                        {e.status ? ` · ${statusLabel(e.status)}` : ""}
                    </span>
                </span>
                {e.urgent && (
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                        Segera
                    </span>
                )}
            </EventWrap>
        </li>
    );
}

function BoardRow({ event: e }) {
    const range =
        e.end && e.end !== e.start
            ? `${shortDate(e.start)} – ${shortDate(e.end)}`
            : shortDate(e.start);

    return (
        <li>
            <EventWrap
                href={e.url}
                className="block px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
            >
                <span className="line-clamp-2 text-[13px] leading-snug text-slate-900">
                    {e.title}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="min-w-0 truncate">
                        {relDay(e.start)}
                        {e.status ? ` · ${statusLabel(e.status)}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">{range}</span>
                </span>
                {e.urgent && (
                    <span className="mt-1.5 inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                        Segera
                    </span>
                )}
            </EventWrap>
        </li>
    );
}
