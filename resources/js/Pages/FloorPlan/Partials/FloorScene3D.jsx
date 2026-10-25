import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import FloorMesh3D from './FloorMesh3D';
import WalkController from './WalkController';

export default function FloorScene3D({ floorPlans = [], units = [] }) {
    const {
        activeFloor,
        view3DType,
        cameraMode3D,
        buildingMode,
        explodedGap,
        target3D,
        hoveredUnitId,
        setSelectedUnitId,
        setView3DType,
        setCameraMode3D,
        setBuildingMode,
        setExplodedGap,
    } = useFloorMapStore();

    const [isPointerLocked, setIsPointerLocked] = useState(false);

    // Temukan denah lantai aktif saat ini
    const currentPlan = floorPlans.find((fp) => fp.floor === activeFloor) || floorPlans[0];

    // Temukan unit yang sedang di-hover untuk HUD
    const hoveredUnit = units.find((u) => u.id === hoveredUnitId);

    // Pastikan urutan lantai dari GF (paling bawah) ke lantai 5 (paling atas)
    const sortedPlans = [...floorPlans].sort((a, b) => a.floor_order - b.floor_order);

    const baseFloorHeight = 3.6;
    const gap = buildingMode === 'exploded' ? explodedGap : 0;

    // Total ketinggian untuk pilar lift/tangga penghubung vertikal 5 lantai
    const maxOrder = sortedPlans.length > 0 ? sortedPlans[sortedPlans.length - 1].floor_order : 5;
    const totalHeight = (maxOrder - 1) * (baseFloorHeight + gap) + 4;

    const isSingleFloor = view3DType === 'single';
    const isWalkMode = isSingleFloor && cameraMode3D === 'walk';

    // Jika user berpindah ke Gedung 5 Lantai saat dalam mode walk, otomatis kembalikan ke orbit
    useEffect(() => {
        if (view3DType === 'building' && cameraMode3D === 'walk') {
            setCameraMode3D('orbit');
        }
    }, [view3DType, cameraMode3D, setCameraMode3D]);

    return (
        <div
            id="floor-scene-container"
            className="relative w-full h-[620px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner select-none cursor-default"
        >
            {/* Crosshair di tengah layar untuk Mode Jalan (FPS) */}
            {isWalkMode && (
                <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-white/80 shadow-xs" />
                        <div className="h-4 w-0.5 bg-white/80 shadow-xs absolute" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 absolute" />
                    </div>

                    {/* HUD Target Unit di bawah crosshair */}
                    {hoveredUnit && (
                        <div className="absolute top-[54%] bg-slate-900/90 backdrop-blur border border-indigo-500/50 text-white text-[11px] px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
                            <span className="font-bold text-indigo-300">{hoveredUnit.unit_code}</span>
                            <span className="text-slate-300">
                                {hoveredUnit.tenant?.name ? hoveredUnit.tenant.name : 'Unit Kosong'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200">
                                {hoveredUnit.status}
                            </span>
                            <span className="text-[10px] text-slate-400">• Klik untuk detail</span>
                        </div>
                    )}
                </div>
            )}

            {/* Panel kontrol 3D di sudut kanan atas viewport */}
            <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 max-w-[calc(100%-2rem)]">
                {/* Cakupan tampilan: per lantai vs gedung utuh */}
                <div role="group" aria-label="Cakupan tampilan 3D" className="inline-flex p-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg shadow-md text-xs font-semibold">
                    <button
                        type="button"
                        aria-pressed={isSingleFloor}
                        onClick={() => setView3DType('single')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${
                            isSingleFloor
                                ? 'bg-[#0369A1] text-white'
                                : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        Lantai {activeFloor}
                    </button>
                    <button
                        type="button"
                        aria-pressed={!isSingleFloor}
                        onClick={() => setView3DType('building')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${
                            !isSingleFloor
                                ? 'bg-[#0369A1] text-white'
                                : 'text-slate-300 hover:text-white'
                        }`}
                    >
                        Gedung 5 Lantai
                    </button>
                </div>

                {/* Mode kamera (hanya pada tampilan per lantai) */}
                {isSingleFloor && (
                    <div role="group" aria-label="Mode kamera" className="inline-flex p-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg shadow-md text-xs font-semibold">
                        <button
                            type="button"
                            aria-pressed={cameraMode3D === 'orbit'}
                            onClick={() => setCameraMode3D('orbit')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${
                                cameraMode3D === 'orbit'
                                    ? 'bg-slate-600 text-white'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            Orbit
                        </button>
                        <button
                            type="button"
                            aria-pressed={cameraMode3D === 'walk'}
                            onClick={() => setCameraMode3D('walk')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${
                                cameraMode3D === 'walk'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            Mode Jalan
                        </button>
                    </div>
                )}

                {/* Bentuk tampilan gedung (hanya pada mode gedung) */}
                {!isSingleFloor && (
                    <div role="group" aria-label="Bentuk tampilan gedung" className="inline-flex p-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg shadow-md text-xs font-semibold">
                        <button
                            type="button"
                            aria-pressed={buildingMode === 'stacked'}
                            onClick={() => setBuildingMode('stacked')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${
                                buildingMode === 'stacked'
                                    ? 'bg-slate-600 text-white'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            Gedung Utuh
                        </button>
                        <button
                            type="button"
                            aria-pressed={buildingMode === 'exploded'}
                            onClick={() => setBuildingMode('exploded')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${
                                buildingMode === 'exploded'
                                    ? 'bg-slate-600 text-white'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            Exploded
                        </button>
                        <button
                            type="button"
                            aria-pressed={buildingMode === 'isolated'}
                            onClick={() => setBuildingMode('isolated')}
                            className={`px-3 py-1.5 rounded-md transition-colors ${
                                buildingMode === 'isolated'
                                    ? 'bg-slate-600 text-white'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            Fokus Lantai
                        </button>
                    </div>
                )}

                {/* Jarak renggang (hanya pada mode exploded) */}
                {!isSingleFloor && buildingMode === 'exploded' && (
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-md">
                        <label htmlFor="exploded-gap" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Jarak
                        </label>
                        <input
                            id="exploded-gap"
                            type="range"
                            min="2"
                            max="12"
                            step="0.5"
                            value={explodedGap}
                            onChange={(e) => setExplodedGap(parseFloat(e.target.value))}
                            className="w-24 accent-[#38bdf8] cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-300 tabular-nums w-6 text-right" aria-hidden="true">
                            {explodedGap}
                        </span>
                    </div>
                )}
            </div>

            {/* 3D Canvas Scene */}
            <Canvas
                shadows
                camera={{
                    position: isWalkMode ? [0, 1.6, 5] : [34, 28, 44],
                    fov: isWalkMode ? 65 : 42,
                }}
                onPointerMissed={() => setSelectedUnitId(null)}
            >
                {/* Pencahayaan */}
                <ambientLight intensity={isWalkMode ? 0.95 : 0.8} />
                <directionalLight
                    position={[25, 50, 30]}
                    intensity={1.4}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-20, 20, -20]} intensity={0.5} />

                {/* Grid Dasar Tanah */}
                <Grid
                    position={[0, -0.16, 0]}
                    args={[100, 100]}
                    sectionSize={10}
                    cellSize={2}
                    cellColor="#334155"
                    sectionColor="#475569"
                    fadeDistance={80}
                    fadeStrength={1.5}
                />

                {/* Tampilan 1: Mode Per-Lantai Saja (Single Floor View dengan Tekstur Denah) */}
                {isSingleFloor && currentPlan && (
                    <FloorMesh3D
                        key={`single-${currentPlan.id}`}
                        plan={currentPlan}
                        units={units}
                        elevationY={0}
                        isActiveFloor={true}
                        isSingleFloor={true}
                    />
                )}

                {/* Tampilan 2: Mode Gedung 5 Lantai Bertumpuk (Building View) */}
                {!isSingleFloor && (
                    <>
                        {/* 4 Pilar Shaft Lift / Tangga Penghubung Vertikal 5 Lantai */}
                        {[
                            [-20, -11],
                            [20, -11],
                            [-20, 11],
                            [20, 11],
                        ].map(([x, z], idx) => (
                            <mesh key={idx} position={[x, totalHeight / 2 - 0.1, z]}>
                                <boxGeometry args={[1.5, totalHeight, 1.5]} />
                                <meshStandardMaterial
                                    color="#38bdf8"
                                    transparent
                                    opacity={0.35}
                                    metalness={0.8}
                                    roughness={0.2}
                                />
                            </mesh>
                        ))}

                        {/* Model Tiap Lantai (5 Lantai Bertumpuk) */}
                        {sortedPlans.map((fp) => {
                            const elevationY = (fp.floor_order - 1) * (baseFloorHeight + gap);
                            const isActive = activeFloor === fp.floor;

                            return (
                                <FloorMesh3D
                                    key={`building-${fp.id}`}
                                    plan={fp}
                                    units={units}
                                    elevationY={elevationY}
                                    isActiveFloor={isActive}
                                    isSingleFloor={false}
                                />
                            );
                        })}
                    </>
                )}

                {/* Kontrol Kamera: Mode Jalan (First-Person Walk) vs Mode Orbit */}
                {isWalkMode ? (
                    <WalkController
                        currentPlan={currentPlan}
                        units={units}
                        onLockChange={setIsPointerLocked}
                    />
                ) : (
                    <OrbitControls
                        enableDamping
                        dampingFactor={0.08}
                        maxPolarAngle={Math.PI / 2 - 0.05} // cegah kamera tembus ke bawah tanah
                        minDistance={8}
                        maxDistance={120}
                        target={
                            isSingleFloor
                                ? [target3D[0] || 0, 0, target3D[2] || 0]
                                : [0, buildingMode === 'exploded' ? totalHeight / 2 : 7, 0]
                        }
                    />
                )}
            </Canvas>

            {/* Petunjuk Navigasi di Bagian Bawah */}
            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                {isWalkMode ? (
                    <div className="pointer-events-auto text-[11px] bg-slate-900/90 backdrop-blur px-3.5 py-2 rounded-lg border border-emerald-500/40 text-slate-300 shadow-lg flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                            {isPointerLocked ? (
                                <span>
                                    <strong className="text-white">WASD:</strong> Jalan •{' '}
                                    <strong className="text-white">SHIFT:</strong> Lari •{' '}
                                    <strong className="text-white">Mouse:</strong> Menoleh •{' '}
                                    <strong className="text-white">Klik:</strong> Pilih Unit Tenant •{' '}
                                    <strong className="text-white">ESC:</strong> Buka Kursor
                                </span>
                            ) : (
                                <span className="text-emerald-300 font-semibold">
                                    Klik di dalam area denah untuk mengunci mouse &amp; mulai berjalan
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-white font-medium">Navigasi Orbit:</span> Klik kiri + geser untuk memutar • Scroll untuk zoom • Klik kanan untuk pan • Klik unit untuk melihat data tenant
                    </div>
                )}

                {/* Tombol Cepat Kembali ke Orbit saat di Mode Jalan */}
                {isWalkMode && (
                    <button
                        type="button"
                        onClick={() => setCameraMode3D('orbit')}
                        className="pointer-events-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 shadow-md transition"
                    >
                        Kembali ke Orbit
                    </button>
                )}
            </div>
        </div>
    );
}
