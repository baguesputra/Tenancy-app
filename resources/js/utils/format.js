function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(`${m[1]}T00:00:00`);
    const d = new Date(s);
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
