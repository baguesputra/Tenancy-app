import { useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { calculateCentroid, STATUS_COLORS } from '../utils/geometry';

export default function FloorMap2D({ currentPlan, units = [] }) {
    const {
        selectedUnitId,
        hoveredUnitId,
        filterStatus,
        searchQuery,
        setSelectedUnitId,
        setHoveredUnitId,
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

    return (
        <div className="relative w-full h-[620px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 select-none">
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
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur border border-slate-200/80 rounded-xl p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => zoomIn()}
                                title="Perbesar"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold text-sm"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={() => zoomOut()}
                                title="Perkecil"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold text-sm"
                            >
                                -
                            </button>
                            <button
                                type="button"
                                onClick={() => resetTransform()}
                                title="Pas Layar"
                                className="px-2.5 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-medium text-xs border-l border-slate-200"
                            >
                                Reset
                            </button>
                        </div>

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

                                    const matchesFilter = filterStatus === 'all' || unit.status === filterStatus;
                                    const matchesSearch =
                                        !searchQuery ||
                                        unit.unit_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        unit.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase());

                                    const isDimmed = !matchesFilter || !matchesSearch;

                                    const pointsString = unit.polygon_points
                                        .map((p) => `${p[0]},${p[1]}`)
                                        .join(' ');

                                    const [cx, cy] = calculateCentroid(unit.polygon_points);

                                    return (
                                        <g
                                            key={unit.id}
                                            className="cursor-pointer transition-opacity duration-200"
                                            opacity={isDimmed ? 0.25 : 1}
                                            onClick={() => {
                                                setSelectedUnitId(unit.id);
                                                setTarget3D([(cx - width / 2) * 0.04, 0, (cy - height / 2) * 0.04]);
                                            }}
                                            onMouseEnter={() => setHoveredUnitId(unit.id)}
                                            onMouseLeave={() => setHoveredUnitId(null)}
                                        >
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
        </div>
    );
}

