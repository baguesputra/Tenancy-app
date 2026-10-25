import { useRef } from 'react';
import { Link } from '@inertiajs/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { IconMinus, IconPlus } from '@/Components/Icons';
import { calculateCentroid, STATUS_COLORS, STATUS_LEGEND } from '../utils/geometry';

export default function FloorMap2D({ currentPlan, units = [] }) {
    const {
        selectedUnitId,
        hoveredUnitId,
        filterStatus,
        searchQuery,
        setSelectedUnitId,
        setHoveredUnitId,
        setFilterStatus,
        setSearchQuery,
        setTarget3D,
    } = useFloorMapStore();

    const transformRef = useRef(null);

    const width = currentPlan?.image_width || 1000;
    const height = currentPlan?.image_height || 600;
    const viewBox = currentPlan?.viewbox || `0 0 ${width} ${height}`;

    // Filter units on this floor
    const floorUnits = units.filter((u) => u.floor === currentPlan?.floor);

    // Units with polygon points
    const mappedUnits = floorUnits.filter((u) => Array.isArray(u.polygon_points) && u.polygon_points.length >= 3);

    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = (unit) => {
        const matchesFilter = filterStatus === 'all' || unit.status === filterStatus;
        const matchesSearch =
            !query ||
            unit.unit_code?.toLowerCase().includes(query) ||
            unit.tenant?.name?.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    };
    const matchCount = mappedUnits.filter(matchesQuery).length;
    const isFiltered = filterStatus !== 'all' || query.length > 0;

    const resetFilters = () => {
        setFilterStatus('all');
        setSearchQuery('');
    };

    const zoomButton =
        'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]';

    return (
        <div className="relative w-full h-[620px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 select-none">
            <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: true }}
                onTransformed={(ref, state) => {
                    const wrapper = transformRef.current?.instance?.wrapperComponent;
                    const vw = wrapper?.clientWidth || 1000;
                    const vh = wrapper?.clientHeight || 620;
                    const centerSvgX = (vw / 2 - state.positionX) / state.scale;
                    const centerSvgY = (vh / 2 - state.positionY) / state.scale;

                    const SCALE = 0.04;
                    const worldX = (centerSvgX - width / 2) * SCALE;
                    const worldZ = (centerSvgY - height / 2) * SCALE;
                    setTarget3D([worldX, 0, worldZ]);
                }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Zoom & Fit Toolbar */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-1 shadow-sm">
                            <button type="button" onClick={() => zoomIn()} aria-label="Perbesar" title="Perbesar" className={zoomButton}>
                                <IconPlus className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => zoomOut()} aria-label="Perkecil" title="Perkecil" className={zoomButton}>
                                <IconMinus className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => resetTransform()}
                                aria-label="Sesuaikan ke layar"
                                title="Sesuaikan ke layar"
                                className="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-medium border-l border-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Legend Status Unit */}
                        {mappedUnits.length > 0 && (
                            <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Status Unit
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {STATUS_LEGEND.filter((st) => st.key !== 'all').map((st) => (
                                        <li key={st.key} className="flex items-center gap-2 text-[11px] text-slate-600">
                                            <span className={`w-2.5 h-2.5 rounded-sm ${st.dot}`} aria-hidden="true" />
                                            {st.label}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                            <svg
                                viewBox={viewBox}
                                className="w-full h-full max-h-[620px] drop-shadow-sm transition-all"
                                style={{ background: '#f8fafc' }}
                            >
                                <defs>
                                    {/* Blueprint Grid pattern */}
                                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                                    </pattern>
                                </defs>

                                {/* Base Floor Background */}
                                <rect width={width} height={height} fill="url(#grid)" />

                                {/* Background Floorplan Image if uploaded */}
                                {currentPlan?.image_url && (
                                    <image
                                        href={currentPlan.image_url}
                                        x={0}
                                        y={0}
                                        width={width}
                                        height={height}
                                        preserveAspectRatio="xMidYMid meet"
                                        opacity={0.85}
                                    />
                                )}

                                {/* Corridor indication line/box */}
                                <rect
                                    x={40}
                                    y={height / 2 - 40}
                                    width={width - 80}
                                    height={80}
                                    fill="#f1f5f9"
                                    stroke="#cbd5e1"
                                    strokeDasharray="6 4"
                                    strokeWidth="1.5"
                                />
                                <text
                                    x={width / 2}
                                    y={height / 2 + 5}
                                    fill="#94a3b8"
                                    fontSize="14"
                                    fontWeight="600"
                                    letterSpacing="4"
                                    textAnchor="middle"
                                >
                                    KORIDOR UTAMA • {currentPlan?.name?.toUpperCase()}
                                </text>

                                {/* Units Polygons Layer */}
                                {mappedUnits.map((unit) => {
                                    const isSelected = selectedUnitId === unit.id;
                                    const isHovered = hoveredUnitId === unit.id;
                                    const statusCfg = STATUS_COLORS[unit.status] || STATUS_COLORS.Kosong;

                                    const isDimmed = !matchesQuery(unit);

                                    const pointsString = unit.polygon_points
                                        .map((p) => `${p[0]},${p[1]}`)
                                        .join(' ');

                                    const [cx, cy] = calculateCentroid(unit.polygon_points);

                                    const selectUnit = () => {
                                        setSelectedUnitId(unit.id);
                                        setTarget3D([(cx - width / 2) * 0.04, 0, (cy - height / 2) * 0.04]);
                                    };

                                    const unitLabel = `Unit ${unit.unit_code}, ${unit.tenant?.name || 'kosong'}, status ${unit.status}`;

                                    return (
                                        <g
                                            key={unit.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={unitLabel}
                                            className="cursor-pointer transition-opacity duration-200 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                                            opacity={isDimmed ? 0.25 : 1}
                                            onClick={selectUnit}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    selectUnit();
                                                }
                                            }}
                                            onMouseEnter={() => setHoveredUnitId(unit.id)}
                                            onMouseLeave={() => setHoveredUnitId(null)}
                                            onFocus={() => setHoveredUnitId(unit.id)}
                                            onBlur={() => setHoveredUnitId(null)}
                                        >
                                            <title>{unitLabel}</title>
                                            <polygon
                                                points={pointsString}
                                                fill={unit.custom_color ? `${unit.custom_color}99` : statusCfg.fill}
                                                stroke={isSelected ? '#4f46e5' : isHovered ? '#1e293b' : statusCfg.stroke}
                                                strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                                                style={{ transition: 'stroke-width 0.15s, stroke 0.15s' }}
                                            />

                                            {/* Centroid Label: Unit Code & Tenant Name / Logo */}
                                            {unit.tenant?.logo_url ? (
                                                <g className="pointer-events-none select-none">
                                                    {/* Card pelindung logo dengan border & drop shadow */}
                                                    <rect
                                                        x={cx - 30}
                                                        y={cy - 34}
                                                        width="60"
                                                        height="38"
                                                        rx="7"
                                                        fill="#ffffff"
                                                        stroke={isSelected ? '#4f46e5' : isHovered ? '#1e293b' : '#cbd5e1'}
                                                        strokeWidth={isSelected ? '2.5' : '1.2'}
                                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.10))' }}
                                                    />
                                                    <image
                                                        href={unit.tenant.logo_url}
                                                        x={cx - 26}
                                                        y={cy - 31}
                                                        width="52"
                                                        height="32"
                                                        preserveAspectRatio="xMidYMid meet"
                                                    />
                                                    {/* Kode Unit di bawah logo */}
                                                    <text
                                                        x={cx}
                                                        y={cy + 19}
                                                        textAnchor="middle"
                                                        fontSize="13.5"
                                                        fontWeight="800"
                                                        fill="#0f172a"
                                                        style={{
                                                            paintOrder: 'stroke',
                                                            stroke: '#ffffff',
                                                            strokeWidth: '3.5px',
                                                            strokeLinejoin: 'round',
                                                        }}
                                                    >
                                                        {unit.unit_code}
                                                    </text>
                                                    {/* Nama Tenant di bawah kode unit */}
                                                    {unit.tenant?.name && (
                                                        <text
                                                            x={cx}
                                                            y={cy + 34}
                                                            textAnchor="middle"
                                                            fontSize="11"
                                                            fontWeight="600"
                                                            fill="#334155"
                                                            style={{
                                                                paintOrder: 'stroke',
                                                                stroke: '#ffffff',
                                                                strokeWidth: '2.5px',
                                                                strokeLinejoin: 'round',
                                                            }}
                                                        >
                                                            {unit.tenant.name.length > 15
                                                                ? `${unit.tenant.name.slice(0, 13)}…`
                                                                : unit.tenant.name}
                                                        </text>
                                                    )}
                                                </g>
                                            ) : (
                                                <g className="pointer-events-none select-none">
                                                    {/* Unit tanpa logo: Teks kode unit & nama tenant tebal & terbaca */}
                                                    <text
                                                        x={cx}
                                                        y={cy - 1}
                                                        textAnchor="middle"
                                                        fontSize="15"
                                                        fontWeight="800"
                                                        fill="#0f172a"
                                                        style={{
                                                            paintOrder: 'stroke',
                                                            stroke: '#ffffff',
                                                            strokeWidth: '4px',
                                                            strokeLinejoin: 'round',
                                                        }}
                                                    >
                                                        {unit.unit_code}
                                                    </text>

                                                    {unit.tenant?.name && (
                                                        <text
                                                            x={cx}
                                                            y={cy + 18}
                                                            textAnchor="middle"
                                                            fontSize="11.5"
                                                            fontWeight="600"
                                                            fill="#334155"
                                                            style={{
                                                                paintOrder: 'stroke',
                                                                stroke: '#ffffff',
                                                                strokeWidth: '2.5px',
                                                                strokeLinejoin: 'round',
                                                            }}
                                                        >
                                                            {unit.tenant.name.length > 15
                                                                ? `${unit.tenant.name.slice(0, 13)}…`
                                                                : unit.tenant.name}
                                                        </text>
                                                    )}
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            {/* Empty state: tidak ada unit terpetakan / tidak ada hasil filter */}
            {mappedUnits.length === 0 ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
                    <div className="pointer-events-auto max-w-sm text-center bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-6 py-5 shadow-lg">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Belum Ada Unit Terpetakan
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Lantai {currentPlan?.floor || '-'} belum memiliki poligon unit. Petakan area unit lewat editor denah.
                        </p>
                        <Link
                            href={`/floor-plans/editor/${currentPlan?.floor || ''}`}
                            className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0F1E36] text-white hover:bg-[#1a2f52] transition-colors"
                        >
                            Buka Editor Denah
                        </Link>
                    </div>
                </div>
            ) : (
                isFiltered && matchCount === 0 && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
                        <div className="pointer-events-auto max-w-sm text-center bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-6 py-5 shadow-lg">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Tidak Ada Unit yang Cocok
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Tidak ada unit di Lantai {currentPlan?.floor || '-'} yang cocok dengan filter atau pencarian Anda.
                            </p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                            >
                                Bersihkan Filter
                            </button>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}