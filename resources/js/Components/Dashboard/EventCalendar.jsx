import { Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    IconAlert,
    IconCalendarEvent,
    IconCar,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconClipboardCheck,
    IconClipboardList,
    IconContract,
    IconDocument,
    IconFileText,
    IconGrid,
    IconHome,
    IconRefresh,
    IconStorefront,
    IconUsers,
    IconX,
} from "@/Components/Icons";

// Enam hue saja. Warna menandai keluarga jenis, ikon menandai jenisnya.
// `chip` untuk event yang akan datang, `chipPast` versi garis (tanpa isian)
// untuk yang sudah lewat — teks tetap pekat, tidak dipudarkan.
const TYPE_META = {
    permit: {
        label: "Izin Kerja",
        icon: IconDocument,
        chip: "border-sky-200 bg-sky-50 text-sky-800",
        chipPast: "border-sky-200 bg-white text-sky-700",
        iconColor: "text-sky-500",
        accent: "border-l-sky-400",
    },
    pameran: {
        label: "Pameran",
        icon: IconStorefront,
        chip: "border-violet-200 bg-violet-50 text-violet-800",
        chipPast: "border-violet-200 bg-white text-violet-700",
        iconColor: "text-violet-500",
        accent: "border-l-violet-400",
    },
    kegiatan: {
        label: "Kegiatan",
        icon: IconCalendarEvent,
        chip: "border-teal-200 bg-teal-50 text-teal-800",
        chipPast: "border-teal-200 bg-white text-teal-700",
        iconColor: "text-teal-500",
        accent: "border-l-teal-400",
    },
    parkir: {
        label: "Parkir",
        icon: IconCar,
        chip: "border-amber-200 bg-amber-50 text-amber-800",
        chipPast: "border-amber-200 bg-white text-amber-700",
        iconColor: "text-amber-500",
        accent: "border-l-amber-400",
    },
    customer: {
        label: "Customer Isi Form",
        icon: IconUsers,
        chip: "border-amber-200 bg-amber-50 text-amber-800",
        chipPast: "border-amber-200 bg-white text-amber-700",
        iconColor: "text-amber-500",
        accent: "border-l-amber-400",
    },
    contract_start: {
        label: "Kontrak mulai",
        icon: IconContract,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    contract_end: {
        label: "Kontrak berakhir",
        icon: IconContract,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    sidak: {
        label: "Sidak",
        icon: IconClipboardCheck,
        chip: "border-orange-200 bg-orange-50 text-orange-800",
        chipPast: "border-orange-200 bg-white text-orange-700",
        iconColor: "text-orange-500",
        accent: "border-l-orange-400",
    },
    loo_received: {
        label: "LOO diterima",
        icon: IconFileText,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    loo_submitted: {
        label: "LOO disubmit",
        icon: IconFileText,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    loo_completed: {
        label: "LOO selesai",
        icon: IconFileText,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    loo_cancelled: {
        label: "LOO dibatalkan",
        icon: IconFileText,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    section_filled: {
        label: "Section diisi",
        icon: IconClipboardList,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    section_submitted: {
        label: "Section disubmit",
        icon: IconClipboardList,
        chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
        chipPast: "border-indigo-200 bg-white text-indigo-700",
        iconColor: "text-indigo-500",
        accent: "border-l-indigo-400",
    },
    libur_nasional: {
        label: "Libur nasional",
        icon: IconHome,
        chip: "border-slate-200 bg-[repeating-linear-gradient(135deg,#ffffff,#ffffff_4px,#f1f5f9_4px,#f1f5f9_8px)] text-slate-700",
        // Pola adalah identitas hari libur, jadi tetap dipakai walau tanggalnya lewat.
        chipPast: "border-slate-200 bg-[repeating-linear-gradient(135deg,#ffffff,#ffffff_4px,#f1f5f9_4px,#f1f5f9_8px)] text-slate-600",
        iconColor: "text-slate-500",
        accent: "border-l-slate-300",
    },
    cuti_bersama: {
        label: "Cuti bersama",
        icon: IconHome,
        chip: "border-slate-200 bg-[repeating-linear-gradient(135deg,#ffffff,#ffffff_4px,#f1f5f9_4px,#f1f5f9_8px)] text-slate-700",
        chipPast: "border-slate-200 bg-[repeating-linear-gradient(135deg,#ffffff,#ffffff_4px,#f1f5f9_4px,#f1f5f9_8px)] text-slate-500",
        iconColor: "text-slate-500",
        accent: "border-l-slate-300",
    },
};

// Legenda diringkas per keluarga agar hue tetap sedikit.
const LEGEND_GROUPS = [
    { label: "Izin Kerja", icon: IconDocument, types: ["permit"] },
    { label: "Pameran", icon: IconStorefront, types: ["pameran"] },
    { label: "Kegiatan", icon: IconCalendarEvent, types: ["kegiatan"] },
    { label: "Parkir", icon: IconCar, types: ["parkir"] },
    { label: "Customer Isi Form", icon: IconUsers, types: ["customer"] },
    { label: "Kontrak", icon: IconContract, types: ["contract_start", "contract_end"] },
    { label: "Sidak", icon: IconClipboardCheck, types: ["sidak"] },
    { label: "LOO", icon: IconFileText, types: ["loo_received", "loo_submitted", "loo_completed", "loo_cancelled"] },
    { label: "Section LOO", icon: IconClipboardList, types: ["section_filled", "section_submitted"] },
    { label: "Libur & cuti bersama", icon: IconHome, types: ["libur_nasional", "cuti_bersama"] },
];

const FILTERS = [
    { key: "all", label: "Semua", icon: IconGrid },
    { key: "permit", label: "Izin", icon: IconDocument },
    { key: "pameran", label: "Pameran", icon: IconStorefront },
    { key: "kegiatan", label: "Kegiatan", icon: IconCalendarEvent },
    { key: "parkir", label: "Parkir", icon: IconCar },
    { key: "customer", label: "Customer", icon: IconUsers },
    { key: "contract_start", label: "Kontrak mulai", icon: IconContract },
    { key: "contract_end", label: "Kontrak berakhir", icon: IconContract },
    { key: "sidak", label: "Sidak", icon: IconClipboardCheck },
    { key: "loo", label: "LOO", icon: IconFileText },
    { key: "section", label: "Section", icon: IconClipboardList },
    { key: "libur_nasional", label: "Libur nasional", icon: IconHome },
    { key: "cuti_bersama", label: "Cuti bersama", icon: IconHome },
];

const PERMIT_TYPES = ["permit", "pameran", "kegiatan", "parkir", "customer"];

// Ikon pada dropdown filter memakai hue keluarga yang sama dengan chip, supaya
// pemetaan warna mudah dipelajari sambil filter dibuka.
const filterIconColor = (key) => {
    if (key === "all") return "text-slate-400";
    const rep =
        key === "loo"
            ? "loo_received"
            : key === "section"
              ? "section_filled"
              : key;
    return (TYPE_META[rep] ?? TYPE_META.permit).iconColor;
};

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

const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Event yang rentangnya sudah lewat tampil sebagai chip garis (tanpa isian),
// bukan dipudarkan — teks tetap kontras.
const isPast = (e) => (e.end || e.start) < dayKey(new Date());

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

function fullDate(k) {
    return new Date(`${k}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
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

function weekEventSegments(week, events) {
    const weekStart = dayKey(week[0]);
    const weekEnd = dayKey(week[6]);
    const lanes = [];
    const segments = events
        .filter((e) => e.start && (e.end || e.start) >= weekStart && e.start <= weekEnd)
        .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.start.localeCompare(b.start))
        .map((e) => {
            const eventEnd = e.end || e.start;
            const start = e.start < weekStart ? weekStart : e.start;
            const end = eventEnd > weekEnd ? weekEnd : eventEnd;
            const startIndex = week.findIndex((d) => dayKey(d) === start);
            const endIndex = week.findIndex((d) => dayKey(d) === end);
            let lane = lanes.findIndex((lastEnd) => lastEnd < start);
            if (lane < 0) lane = lanes.length;
            lanes[lane] = end;
            return {
                e,
                startIndex,
                endIndex,
                lane,
                continuedLeft: e.start < weekStart,
                continuedRight: eventEnd > weekEnd,
            };
        });

    const visible = segments.filter((segment) => segment.lane < 2);
    // "N lainnya" menempel tepat di bawah chip terakhir pada hari itu, jadi
    // tidak melayang di baris ketiga saat hari itu hanya punya satu chip.
    const overflow = Array.from({ length: 7 }, (_, dayIndex) => {
        const hidden = segments.filter(
            (segment) =>
                segment.lane >= 2 &&
                segment.startIndex <= dayIndex &&
                segment.endIndex >= dayIndex,
        ).length;
        if (!hidden) return null;
        const lastVisibleLane = visible
            .filter(
                (segment) =>
                    segment.startIndex <= dayIndex &&
                    segment.endIndex >= dayIndex,
            )
            .reduce((max, segment) => Math.max(max, segment.lane), -1);
        return { dayIndex, count: hidden, lane: Math.min(lastVisibleLane + 1, 2) };
    }).filter(Boolean);

    return { segments: visible, overflow };
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
    const boardRef = useRef(null);
    const [boardEdges, setBoardEdges] = useState({ left: false, right: false });

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
    const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7)), [cells]);
    const weekSegments = useMemo(() => weeks.map((week) => weekEventSegments(week, events)), [weeks, events]);

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
    // Judul kolom mengikuti filter aktif agar tidak menampilkan "LOO" saat
    // yang difilter hanya bagian Section, atau "Kontrak" untuk kontrak berakhir.
    const boardFilterLabel =
        filter !== "all" && filter !== "permit"
            ? FILTERS.find((f) => f.key === filter)?.label
            : null;

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

    // Penanda tepi + tombol panah board: hanya tampil saat memang masih ada
    // kolom tersembunyi di arah tersebut. Snap/geser tetap native.
    useEffect(() => {
        if (view !== "board") return;
        const el = boardRef.current;
        if (!el) return;
        const update = () => {
            const left = el.scrollLeft > 4;
            const right =
                el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
            setBoardEdges((prev) =>
                prev.left === left && prev.right === right
                    ? prev
                    : { left, right },
            );
        };
        update();
        el.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            el.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [view, events, filter]);

    const scrollBoard = (direction) => {
        const el = boardRef.current;
        if (!el) return;
        el.scrollBy({ left: direction * 300, behavior: "smooth" });
    };

    return (
        <section
            aria-label="Kalender operasional"
            className="mt-4 bg-white rounded-lg border border-[#E2E5EA]"
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
                                            <f.icon
                                                className={`h-3 w-3 shrink-0 ${active ? "text-white/70" : filterIconColor(f.key)}`}
                                                aria-hidden="true"
                                            />
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
                    {activeLegendGroups.map((g) => {
                        const meta = TYPE_META[g.types[0]] ?? TYPE_META.permit;
                        return (
                            <span
                                key={g.label}
                                className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"
                            >
                                <g.icon
                                    className={`h-3 w-3 ${meta.iconColor}`}
                                    aria-hidden="true"
                                />
                                {g.label}
                            </span>
                        );
                    })}
                    <span className="inline-flex items-center gap-1.5 border-l border-slate-200 pl-3 text-[11px] text-rose-700">
                        <IconAlert
                            className="h-3 w-3 text-rose-500"
                            aria-hidden="true"
                        />
                        Perlu perhatian
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span
                            className="h-3 w-4 shrink-0 rounded-sm border border-slate-200 bg-[repeating-linear-gradient(135deg,#ffffff,#ffffff_4px,#f1f5f9_4px,#f1f5f9_8px)]"
                            aria-hidden="true"
                        />
                        Berpola: hari libur
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span
                            className="h-3 w-4 shrink-0 rounded-sm border border-slate-200 bg-white"
                            aria-hidden="true"
                        />
                        Tanpa isian: sudah lewat
                    </span>
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
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
                        <div className="min-w-0">
                            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400 py-2">
                                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                                    (d, i) => (
                                        <span key={d} className={i >= 5 ? "text-slate-500" : ""}>{d}</span>
                                    ),
                                )}
                            </div>
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                {weeks.map((week, weekIndex) => {
                                    const { segments, overflow } = weekSegments[weekIndex];
                                    return (
                                        <div key={weekIndex} className="relative grid grid-cols-7 min-h-[84px] sm:min-h-[116px] border-b border-slate-200 last:border-b-0">
                                            {week.map((d, dayIndex) => {
                                                const k = dayKey(d);
                                                const inMonth = d.getMonth() === monthIdx;
                                                const dayEvents = byDay[k] ?? [];
                                                const isToday = k === todayKey;
                                                const isSelected = k === selected;
                                                const weekend = dayIndex >= 5;
                                                return (
                                                    <div key={k} onClick={() => handleCellClick(k, d)} className={`relative min-w-0 border-r border-slate-200 last:border-r-0 p-1 sm:p-1.5 cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-[#0F1E36] ${isSelected ? "bg-[#0F1E36]/[0.03]" : "hover:bg-slate-50/60"} ${inMonth ? "" : "bg-slate-50/60 opacity-50"} ${weekend && inMonth ? (dayIndex === 6 ? "bg-slate-100/60" : "bg-slate-50/40") : ""}`}>
                                                        <button ref={(el) => (cellRefs.current[weekIndex * 7 + dayIndex] = el)} tabIndex={weekIndex * 7 + dayIndex === rovingIdx ? 0 : -1} onClick={(e) => { e.stopPropagation(); handleCellClick(k, d); }} onKeyDown={(e) => onCellKeyDown(e, weekIndex * 7 + dayIndex)} aria-pressed={isSelected} aria-label={`${cellAriaLabels[weekIndex * 7 + dayIndex]}, ${dayEvents.length} agenda`} className={`relative z-10 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full tabular-nums focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${isToday ? "bg-[#0F1E36] text-white" : weekend ? "text-slate-500" : "text-slate-700"}`}>{d.getDate()}</button>
                                                    </div>
                                                );
                                            })}
                                            <div className="pointer-events-none absolute inset-x-0 top-9 sm:top-10 grid grid-cols-7 grid-rows-[repeat(3,auto)] gap-y-1 px-0.5 sm:px-1">
                                                {segments.map(({ e, startIndex, endIndex, lane, continuedLeft, continuedRight }) => {
                                                    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
                                                    const rangeTitle = `${e.title}${e.end && e.end !== e.start ? ` (${e.start} s/d ${e.end})` : ""}`;
                                                    const isHl = highlightIds.has(e.id);
                                                    const past = isPast(e);
                                                    // Warna = keluarga jenis; ikon = jenisnya. Event lewat
                                                    // memakai versi garis (tanpa isian), bukan dipudarkan.
                                                    const tone = e.urgent
                                                        ? "border-rose-300 bg-rose-100 font-semibold text-rose-900"
                                                        : past
                                                          ? meta.chipPast
                                                          : meta.chip;
                                                    return (
                                                        <EventWrap key={`${e.id}-${weekIndex}`} href={e.url} onClick={(ev) => ev.stopPropagation()} title={rangeTitle} className={`pointer-events-auto flex min-w-0 items-center gap-1 border px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium leading-4 transition-colors hover:shadow-sm focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${continuedLeft ? "rounded-l-none border-l-0" : "rounded-l-md"} ${continuedRight ? "rounded-r-none border-r-0" : "rounded-r-md"} ${isHl ? "relative z-10 ring-1 ring-[#0F1E36]/30" : ""} ${tone}`} style={{ gridColumn: `${startIndex + 1} / span ${endIndex - startIndex + 1}`, gridRow: lane + 1 }}>
                                                            <meta.icon className={`h-3 w-3 shrink-0 ${e.urgent ? "text-rose-500" : meta.iconColor}`} aria-hidden="true" />
                                                            <span className="truncate">{e.title}</span>
                                                        </EventWrap>
                                                    );
                                                })}
                                                {overflow.map(({ dayIndex, count, lane }) => (
                                                    <button key={`overflow-${dayIndex}`} type="button" onClick={(e) => { e.stopPropagation(); handleCellClick(dayKey(week[dayIndex]), week[dayIndex]); }} className="pointer-events-auto hidden min-w-0 items-center truncate rounded-md px-1.5 text-left text-[10px] font-medium leading-4 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-[#0F1E36] sm:flex" style={{ gridColumn: dayIndex + 1, gridRow: lane + 1 }} aria-label={`${count} event lainnya pada ${dayKey(week[dayIndex])}`}>
                                                        +{count} lainnya
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="hidden sm:block xl:hidden">
                                <DayPanel dateKey={selected} events={selectedEvents} />
                            </div>
                        </div>
                        <aside className="hidden xl:sticky xl:top-20 xl:block xl:pt-6">
                            <DayPanel
                                dateKey={selected}
                                events={selectedEvents}
                                dense
                            />
                        </aside>
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
                        <div className="pt-1">
                            <div className="flex items-center gap-2 pb-2">
                                <p className="mr-auto text-[11px] text-slate-400">
                                    {boardColumns.length} jenis agenda · geser
                                    untuk melihat lainnya
                                </p>
                                <button
                                    type="button"
                                    onClick={() => scrollBoard(-1)}
                                    disabled={!boardEdges.left}
                                    aria-label="Geser kolom ke kiri"
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E2E5EA] text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <IconChevronLeft
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollBoard(1)}
                                    disabled={!boardEdges.right}
                                    aria-label="Geser kolom ke kanan"
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E2E5EA] text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    <IconChevronRight
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                    />
                                </button>
                            </div>
                            <div className="relative">
                                <div
                                    ref={boardRef}
                                    role="region"
                                    aria-label="Agenda per jenis"
                                    tabIndex={0}
                                    className="flex snap-x snap-proximity items-start gap-3 overflow-x-auto overscroll-x-contain pt-1 pb-2 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36]"
                                >
                                    {boardColumns.map((col) => (
                                        <div
                                            key={col.label}
                                            className="flex w-72 shrink-0 snap-start flex-col rounded-lg border border-[#E2E5EA] bg-white"
                                        >
                                            <h3 className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
                                                <col.icon
                                                    className={`h-3.5 w-3.5 shrink-0 ${
                                                        (TYPE_META[col.types[0]] ?? TYPE_META.permit)
                                                            .iconColor
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                                                    {boardFilterLabel ??
                                                        col.label}
                                                </span>
                                                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 tabular-nums whitespace-nowrap">
                                                    {col.items.length}
                                                </span>
                                            </h3>
                                            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                                                {col.items.map((e) => (
                                                    <BoardRow
                                                        key={e.id}
                                                        event={e}
                                                    />
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                {boardEdges.left && (
                                    <div
                                        className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent"
                                        aria-hidden="true"
                                    />
                                )}
                                {boardEdges.right && (
                                    <div
                                        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
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

function DayPanel({ dateKey, events, dense = false }) {
    if (!dateKey) return null;
    const label = new Date(`${dateKey}T00:00:00`).toLocaleDateString("id-ID", {
        weekday: "long",
    });
    // Hanya rentang yang chip-nya benar-benar tampil di tanggal terpilih,
    // sejalan dengan yang diangkat di grid.
    const spanCount = events.filter(
        (e) =>
            e.end &&
            e.end !== e.start &&
            (e.start === dateKey || e.end === dateKey),
    ).length;
    const sidakCount = events.filter((e) => e.type === "sidak").length;
    return (
        <div
            className={`rounded-lg border border-[#E2E5EA] bg-white ${
                dense ? "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden" : "mt-3"
            }`}
            aria-live="polite"
        >
            <div
                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/70 ${
                    dense ? "shrink-0 px-3 py-3" : "px-4 py-3"
                }`}
            >
                <p
                    className={`font-semibold capitalize text-slate-900 ${
                        dense ? "text-xs" : "text-sm"
                    }`}
                >
                    {label}{" "}
                    <span className="font-normal text-slate-500">
                        · {dense ? shortDate(dateKey) : fullDate(dateKey)}
                    </span>
                </p>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
                    {events.length} agenda
                    {sidakCount ? ` · ${sidakCount} sidak` : ""}
                </span>
            </div>
            {spanCount > 0 && (
                <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                    {spanCount} event rentang ditandai pada kalender.
                </p>
            )}
            {events.length === 0 ? (
                <p className="px-4 py-5 text-sm text-slate-400">
                    Tidak ada agenda hari ini.
                </p>
            ) : (
                <div
                    className={`${dense ? "min-h-0 overflow-y-auto [scrollbar-width:thin]" : "overflow-x-auto"}`}
                >
                    <ul className="divide-y divide-slate-100">
                        {events.map((e) => (
                            <AgendaRow
                                key={e.id}
                                event={e}
                                span={spanDay(e, dateKey)}
                                dense={dense}
                            />
                        ))}
                    </ul>
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
              year: "numeric",
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
                                        <g.icon
                                            className={`h-3 w-3 ${
                                                (TYPE_META[g.types[0]] ?? TYPE_META.permit).iconColor
                                            }`}
                                            aria-hidden="true"
                                        />
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

function AgendaRow({ event: e, span = null, dense = false }) {
    const range = e.end && e.end !== e.start
        ? `${fullDate(e.start)} – ${fullDate(e.end)}`
        : fullDate(e.start);

    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
    return (
        <li>
            <EventWrap href={e.url} className={`grid grid-cols-1 gap-1 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36] ${
                dense
                    ? "px-3 py-2.5"
                    : "px-4 py-3 sm:grid-cols-[minmax(150px,1.1fr)_minmax(220px,2fr)_minmax(110px,0.8fr)_auto] sm:items-center sm:gap-4"
            }`}>
                <span className={`font-semibold tabular-nums text-slate-700 ${dense ? "text-[11px]" : "text-xs"}`}>{range}</span>
                <span className={`min-w-0 text-sm font-medium text-slate-900 ${dense ? "line-clamp-2" : "truncate"}`}>{e.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {e.urgent ? (
                        <IconAlert
                            className="h-3 w-3 shrink-0 text-rose-500"
                            aria-hidden="true"
                        />
                    ) : (
                        <meta.icon
                            className={`h-3 w-3 shrink-0 ${meta.iconColor}`}
                            aria-hidden="true"
                        />
                    )}
                    {meta.label}{e.status ? ` · ${statusLabel(e.status)}` : ""}
                    {span ? ` · ${span}` : ""}
                </span>
                {e.urgent ? <span className="justify-self-start rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 sm:justify-self-end">Perlu perhatian</span> : <span className="hidden sm:block" />}
            </EventWrap>
        </li>
    );
}

function BoardRow({ event: e }) {
    const meta = TYPE_META[e.type] ?? TYPE_META.permit;
    const range =
        e.end && e.end !== e.start
            ? `${shortDate(e.start)} – ${shortDate(e.end)}`
            : shortDate(e.start);

    return (
        <li>
            <EventWrap
                href={e.url}
                className={`block border-l-2 px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36] ${
                    e.urgent
                        ? "border-l-rose-400 bg-rose-50/40 hover:bg-rose-50/70"
                        : `${meta.accent} hover:bg-slate-50`
                }`}
            >
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    {e.urgent ? (
                        <IconAlert
                            className="h-3 w-3 shrink-0 text-rose-500"
                            aria-hidden="true"
                        />
                    ) : (
                        <meta.icon
                            className={`h-3 w-3 shrink-0 ${meta.iconColor}`}
                            aria-hidden="true"
                        />
                    )}
                    <span className="min-w-0 truncate">{meta.label}</span>
                    {e.status && (
                        <span className="min-w-0 truncate">
                            · {statusLabel(e.status)}
                        </span>
                    )}
                    {e.urgent && (
                        <span className="ml-auto shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            Segera
                        </span>
                    )}
                </span>
                <span
                    className={`mt-1 block line-clamp-2 text-[13px] leading-snug ${
                        isPast(e) && !e.urgent ? "text-slate-600" : "text-slate-900"
                    }`}
                >
                    {e.title}
                </span>
                <span className="mt-1 block text-[11px] tabular-nums text-slate-400">
                    {range}
                </span>
            </EventWrap>
        </li>
    );
}
