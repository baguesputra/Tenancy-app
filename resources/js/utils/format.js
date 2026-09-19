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

export function formatTimeID(value) {
    if (!value) return '—';
    const m = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!m) return String(value);
    return `${m[1].padStart(2, '0')}.${m[2]}`;
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

export function formatDateTimeID(value) {
    const d = parseDate(value);
    if (!d) return typeof value === 'string' && value.trim() !== '' ? value : '—';
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':');
}
