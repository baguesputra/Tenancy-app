import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { STATUS_COLORS } from '../utils/geometry';

// Scale factor: memetakan koordinat 1000px ke 40 unit di 3D world space
const SCALE = 0.04;
const UNIT_HEIGHT = 1.35;

// Helper: buat tekstur label atap unit tenant secara offline & ringan
function createRoofLabelTexture(unitCode, tenantName) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Kotak background putih semi-transparan dengan border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(4, 4, 248, 120, 16);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.stroke();
    } else {
        ctx.fillRect(4, 4, 248, 120);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 120);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.fillText(unitCode || '', 128, tenantName ? 54 : 76);

    if (tenantName) {
        ctx.fillStyle = '#475569';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        const display = tenantName.length > 13 ? `${tenantName.slice(0, 11)}…` : tenantName;
        ctx.fillText(display, 128, 98);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export default function FloorMesh3D({
    plan,
    units = [],
    elevationY = 0,
    isActiveFloor = false,
    isSingleFloor = false,
}) {
    const {
        buildingMode,
        selectedUnitId,
        hoveredUnitId,
        filterStatus,
        searchQuery,
        setSelectedUnitId,
        setHoveredUnitId,
    } = useFloorMapStore();

    const isIsolated = buildingMode === 'isolated';
    const isDimmedFloor = !isSingleFloor && isIsolated && !isActiveFloor;

    const imgW = plan?.image_width || 1000;
    const imgH = plan?.image_height || 600;

    // Ground plane ukuran lantai proporsional
    const planeW = imgW * SCALE + 4;
    const planeH = imgH * SCALE + 2;

    const floorUnits = units.filter((u) => u.floor === plan?.floor);

    // Tekstur denah dasar (JPG/PNG/SVG) untuk mode Per-Lantai
    const [floorTexture, setFloorTexture] = useState(null);

    useEffect(() => {
        if (!plan?.image_url) {
            setFloorTexture(null);
            return;
        }

        const loader = new THREE.TextureLoader();
        let isCancelled = false;
        let loadedTex = null;

        loader.load(
            plan.image_url,
            (tex) => {
                if (isCancelled) {
                    tex.dispose();
                    return;
                }
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 4;
                tex.needsUpdate = true;
                loadedTex = tex;
                setFloorTexture(tex);
            },
            undefined,
            () => {
                // Fallback jika gambar gagal dimuat
                setFloorTexture(null);
            }
        );

        return () => {
            isCancelled = true;
            if (loadedTex) {
                loadedTex.dispose();
            }
        };
    }, [plan?.image_url]);

    // Bangun geometri 3D Extrude & Bounding Box Collider dengan useMemo
    const unitGeometries = useMemo(() => {
        return floorUnits
            .filter((u) => Array.isArray(u.polygon_points) && u.polygon_points.length >= 3)
            .map((u) => {
                const pts = u.polygon_points;
                const shape = new THREE.Shape();

                // Hitung koordinat 3D terpusat pada (0, 0)
                const xs = pts.map((pt) => (pt[0] - imgW / 2) * SCALE);
                const zs = pts.map((pt) => (pt[1] - imgH / 2) * SCALE);

                pts.forEach((pt, idx) => {
                    // Balik sumbu Y koordinat SVG agar selaras dengan Three.js
                    const x = (pt[0] - imgW / 2) * SCALE;
                    const y = -(pt[1] - imgH / 2) * SCALE;
                    if (idx === 0) shape.moveTo(x, y);
                    else shape.lineTo(x, y);
                });
                shape.closePath();

                const extrudeSettings = {
                    steps: 1,
                    depth: UNIT_HEIGHT,
                    bevelEnabled: true,
                    bevelThickness: 0.04,
                    bevelSize: 0.03,
                    bevelSegments: 2,
                };

                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                // Putar geometri agar ketebalan naik ke atas (+Y)
                geometry.rotateX(-Math.PI / 2);

                // Hitung Axis-Aligned Bounding Box untuk collider super-ringan O(1)
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minZ = Math.min(...zs);
                const maxZ = Math.max(...zs);

                const boxW = Math.max(maxX - minX, 0.4);
                const boxD = Math.max(maxZ - minZ, 0.4);
                const boxCenterX = (minX + maxX) / 2;
                const boxCenterZ = (minZ + maxZ) / 2;

                const labelTex = createRoofLabelTexture(u.unit_code, u.tenant?.name);

                return {
                    id: u.id,
                    code: u.unit_code,
                    tenantName: u.tenant?.name,
                    status: u.status,
                    customColor: u.custom_color,
                    geometry,
                    labelTex,
                    boxW,
                    boxD,
                    boxCenterX,
                    boxCenterZ,
                };
            });
    }, [floorUnits, imgW, imgH]);

    // Bersihkan memori GPU saat unmount / geometry berubah (Cegah Memory Leak)
    useEffect(() => {
        return () => {
            unitGeometries.forEach((ug) => {
                ug.geometry.dispose();
                if (ug.labelTex) ug.labelTex.dispose();
            });
        };
    }, [unitGeometries]);

    return (
        <group position={[0, elevationY, 0]}>
            {/* Lantai / Slab Dasar */}
            <mesh position={[0, isSingleFloor ? -0.15 : -0.05, 0]} receiveShadow>
                <boxGeometry args={[planeW, isSingleFloor ? 0.3 : 0.1, planeH]} />
                <meshStandardMaterial
                    color={isActiveFloor ? '#f8fafc' : '#e2e8f0'}
                    roughness={0.7}
                    metalness={0.1}
                    transparent={isDimmedFloor}
                    opacity={isDimmedFloor ? 0.2 : 0.9}
                />
            </mesh>

            {/* Tekstur Denah Lantai (Gambar JPG/PNG/SVG yang diunggah) pada mode Single Floor */}
            {isSingleFloor && floorTexture && (
                <mesh
                    position={[0, 0.02, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                    raycast={() => null}
                >
                    <planeGeometry args={[planeW - 2, planeH - 2]} />
                    <meshBasicMaterial map={floorTexture} transparent opacity={0.88} />
                </mesh>
            )}

            {/* Garis Koridor Default jika belum ada gambar denah pada mode Single Floor */}
            {isSingleFloor && !floorTexture && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                    <planeGeometry args={[planeW - 4, 3.2]} />
                    <meshBasicMaterial color="#e2e8f0" transparent opacity={0.6} />
                </mesh>
            )}

            {/* Label Plat Nama Lantai */}
            <mesh position={[-planeW / 2 + 3, 0.4, planeH / 2 + 0.5]}>
                <boxGeometry args={[4, 0.4, 0.1]} />
                <meshBasicMaterial color={isActiveFloor ? '#4f46e5' : '#64748b'} />
            </mesh>

            {/* Unit Tenant 3D: Visual Mesh (raycast di-bypass) + Bounding Box Collider O(1) */}
            {unitGeometries.map((ug) => {
                const isSelected = selectedUnitId === ug.id;
                const isHovered = hoveredUnitId === ug.id;
                const statusCfg = STATUS_COLORS[ug.status] || STATUS_COLORS.Kosong;

                const matchesFilter = filterStatus === 'all' || ug.status === filterStatus;
                const matchesSearch =
                    !searchQuery ||
                    ug.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ug.tenantName?.toLowerCase().includes(searchQuery.toLowerCase());
                const isUnitDimmed = isDimmedFloor || !matchesFilter || !matchesSearch;

                let meshColor = ug.customColor ? ug.customColor : statusCfg.hex;
                if (isSelected) meshColor = 0x4f46e5;
                else if (isHovered) meshColor = 0x1e293b;

                return (
                    <group key={ug.id}>
                        {/* 1. Visual Extruded Polygon Mesh (raycast={() => null} menghemat kalkulasi GPU) */}
                        <mesh
                            geometry={ug.geometry}
                            castShadow={!isUnitDimmed}
                            receiveShadow
                            raycast={() => null}
                        >
                            <meshStandardMaterial
                                color={meshColor}
                                roughness={0.4}
                                metalness={0.2}
                                transparent
                                opacity={isUnitDimmed ? 0.15 : isSelected ? 0.95 : 0.75}
                            />
                        </mesh>

                        {/* 2. Invisible Bounding Box Collider untuk Raycasting Ringan O(1) */}
                        <mesh
                            position={[ug.boxCenterX, UNIT_HEIGHT / 2, ug.boxCenterZ]}
                            userData={{ id: ug.id, code: ug.code }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUnitId(ug.id);
                            }}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                setHoveredUnitId(ug.id);
                            }}
                            onPointerOut={() => {
                                setHoveredUnitId(null);
                            }}
                        >
                            <boxGeometry args={[ug.boxW, UNIT_HEIGHT, ug.boxD]} />
                            <meshBasicMaterial visible={false} />
                        </mesh>

                        {/* 3. Label Atap Unit Tenant */}
                        {ug.labelTex && !isUnitDimmed && (
                            <mesh
                                position={[ug.boxCenterX, UNIT_HEIGHT + 0.015, ug.boxCenterZ]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                raycast={() => null}
                            >
                                <planeGeometry
                                    args={[
                                        Math.min(ug.boxW * 0.85, 3.2),
                                        Math.min(ug.boxD * 0.85, 1.6),
                                    ]}
                                />
                                <meshBasicMaterial
                                    map={ug.labelTex}
                                    transparent
                                    depthWrite={false}
                                />
                            </mesh>
                        )}
                    </group>
                );
            })}
        </group>
    );
}
