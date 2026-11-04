function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const s = String(value).trim();
    // Tanggal polos tanpa jam: niatnya tanggal kalender lokal, bukan tengah malam UTC.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
    // "YYYY-MM-DD HH:mm:ss" (MySQL) → 'T' agar tidak jatuh ke jalur non-standar.
    // String ISO dengan zona waktu dibiarkan apa adanya supaya jam tidak hilang.
    const d = new Date(s.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateID(value) {
    const d = parseDate(value);
    if (!d) return typeof value === 'string' && value.trim() !== '' ? value : '—';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatRelativeID(value) {
    const d = parseDate(value);
    if (!d) return typeof value === 'string' && value.trim() !== '' ? value : '—';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Hari ini';
    if (diff === 1) return 'Kemarin';
    if (diff > 1 && diff < 7) return `${diff} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function formatTimeID(value) {
    if (!value) return '—';
    const m = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!m) return String(value);
    return `${m[1].padStart(2, '0')}.${m[2]}`;
}

export const MAX_PERMIT_DAYS = 7;

export function addDaysISO(value, days) {
    const d = parseDate(value);
    if (!d) return '';
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function maxPermitEndDate(start) {
    return start ? addDaysISO(start, MAX_PERMIT_DAYS - 1) : undefined;
}

export function formatDateRange(start, end) {
    if (!start) return '—';
    return end && end !== start ? `${formatDateID(start)} s/d ${formatDateID(end)}` : formatDateID(start);
}

export function formatTimeRange(start, end) {
    if (!start && !end) return '—';
    if (start && end) return `${formatTimeID(start)}–${formatTimeID(end)} WIB`;
    return `${formatTimeID(start || end)} WIB`;
}

export function formatBytes(bytes) {
    const n = Number(bytes);
    if (!n || n < 0) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTimeID(value) {
    const d = parseDate(value);
    if (!d) return typeof value === 'string' && value.trim() !== '' ? value : '—';
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':');
}

/** Tanggal + jam versi ringkas untuk kolom tabel: "04 Nov 2026, 14:32". */
export function formatDateTimeShortID(value) {
    const d = parseDate(value);
    if (!d) return typeof value === 'string' && value.trim() !== '' ? value : '—';
    return d
        .toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        .replace('.', ':');
}

/** Selisih dua waktu: "2 hari 3 jam", "45 mnt". `end` boleh null untuk sesi berjalan. */
export function formatDurationID(start, end) {
    const a = parseDate(start);
    const b = end ? parseDate(end) : new Date();
    if (!a || !b) return '—';
    let minutes = Math.round((b.getTime() - a.getTime()) / 60000);
    if (minutes < 0) return '—';
    if (minutes < 1) return '<1 mnt';
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    const parts = [];
    if (days) parts.push(`${days} hari`);
    if (hours) parts.push(`${hours} jam`);
    if (!days && mins) parts.push(`${mins} mnt`);
    return parts.length ? parts.join(' ') : '<1 mnt';
}
