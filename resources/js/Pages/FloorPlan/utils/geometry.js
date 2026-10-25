export function calculateCentroid(points) {
    if (!points || points.length === 0) return [0, 0];
    let a = 0;
    let cx = 0;
    let cy = 0;
    const pts = points;
    const len = pts.length;

    for (let i = 0, j = len - 1; i < len; j = i++) {
        const p1 = pts[j];
        const p2 = pts[i];
        const f = p1[0] * p2[1] - p2[0] * p1[1];
        a += f;
        cx += (p1[0] + p2[0]) * f;
        cy += (p1[1] + p2[1]) * f;
    }

    if (Math.abs(a) < 1e-5) {
        return [
            pts.reduce((t, p) => t + p[0], 0) / len,
            pts.reduce((t, p) => t + p[1], 0) / len,
        ];
    }

    return [cx / (3 * a), cy / (3 * a)];
}

export function calculateBoundingBox(points) {
    if (!points || points.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export const STATUS_COLORS = {
    Aktif: {
        fill: 'rgba(16, 185, 129, 0.55)',
        stroke: '#059669',
        badgeColor: 'green',
        hex: 0x10b981,
    },
    LOO: {
        fill: 'rgba(245, 158, 11, 0.60)',
        stroke: '#d97706',
        badgeColor: 'amber',
        hex: 0xf59e0b,
    },
    Fitout: {
        fill: 'rgba(14, 165, 233, 0.55)',
        stroke: '#0284c7',
        badgeColor: 'blue',
        hex: 0x0ea5e9,
    },
    Kosong: {
        fill: 'rgba(148, 163, 184, 0.38)',
        stroke: '#64748b',
        badgeColor: 'gray',
        hex: 0x94a3b8,
    },
};

/**
 * Label + warna indikator status untuk filter toolbar dan legenda peta.
 * Satu sumber dengan STATUS_COLORS supaya peta, filter, dan drawer tidak
 * pernah menampilkan arti warna yang berbeda.
 */
export const STATUS_LEGEND = [
    { key: 'all', label: 'Semua', dot: 'bg-slate-900' },
    { key: 'Aktif', label: 'Aktif', dot: 'bg-emerald-500' },
    { key: 'LOO', label: 'LOO', dot: 'bg-amber-500' },
    { key: 'Fitout', label: 'Fitout', dot: 'bg-sky-500' },
    { key: 'Kosong', label: 'Kosong', dot: 'bg-slate-400' },
];

