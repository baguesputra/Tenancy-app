import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { STATUS_COLORS } from '../utils/geometry';

// Scale factor: memetakan koordinat 1000px ke 40 unit di 3D world space
const SCALE = 0.04;
const UNIT_HEIGHT = 1.35;

// Helper: buat tekstur papan nama / signboard billboard 3D dengan logo & teks unit
function createSignboardTexture(unitCode, tenantName, logoUrl) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const renderCard = (img = null) => {
        ctx.clearRect(0, 0, 512, 256);

        // Card background putih bersih dengan border rounded
        ctx.fillStyle = '#ffffff';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(8, 8, 496, 240, 24);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 6;
            ctx.stroke();
        } else {
            ctx.fillRect(8, 8, 496, 240);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 6;
            ctx.strokeRect(8, 8, 496, 240);
        }

        if (img) {
            // Gambar logo tenant di bagian atas card
            const maxLogoW = 320;
            const maxLogoH = 120;
            const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height || 1);
            let drawW = maxLogoW;
            let drawH = drawW / aspect;
            if (drawH > maxLogoH) {
                drawH = maxLogoH;
                drawW = drawH * aspect;
            }
            const drawX = 256 - drawW / 2;
            const drawY = 22 + (maxLogoH - drawH) / 2;

            try {
                ctx.drawImage(img, drawX, drawY, drawW, drawH);
            } catch (e) {}

            // Kode Unit tebal & besar di bawah logo
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
            ctx.fillText(unitCode || '', 256, 186);

            // Nama Tenant di baris terbawah
            if (tenantName) {
                ctx.fillStyle = '#475569';
                ctx.font = '600 24px system-ui, -apple-system, sans-serif';
                const display = tenantName.length > 20 ? `${tenantName.slice(0, 18)}…` : tenantName;
                ctx.fillText(display, 256, 224);
            }
        } else {
            // Unit tanpa logo: Teks kode unit ekstra besar & nama tenant
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
            ctx.fillText(unitCode || '', 256, 108);

            ctx.fillStyle = '#334155';
            ctx.font = '600 32px system-ui, -apple-system, sans-serif';
            const display = tenantName && tenantName !== '-' ? tenantName : 'Unit Kosong';
            const truncated = display.length > 22 ? `${display.slice(0, 20)}…` : display;
            ctx.fillText(truncated, 256, 172);

            // Garis aksen bawah
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(100, 200, 312, 6);
        }
    };

    renderCard(null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    if (logoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            renderCard(img);
            texture.needsUpdate = true;
        };
        img.onerror = () => {
            // Tetap gunakan layout teks jika logo gagal dimuat
        };
        img.src = logoUrl;
    }

    return texture;
}

// Helper: buat tekstur label atap datar
function createRoofLabelTexture(unitCode, tenantName) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

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

    // Bangun geometri 3D Extrude & Signboard Billboard dengan useMemo
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
                geometry.rotateX(-Math.PI / 2);

                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minZ = Math.min(...zs);
                const maxZ = Math.max(...zs);

                const boxW = Math.max(maxX - minX, 0.4);
                const boxD = Math.max(maxZ - minZ, 0.4);
                const boxCenterX = (minX + maxX) / 2;
                const boxCenterZ = (minZ + maxZ) / 2;

                const signboardTex = createSignboardTexture(
                    u.unit_code,
                    u.tenant?.name,
                    u.tenant?.logo_url
                );

                const roofTex = createRoofLabelTexture(u.unit_code, u.tenant?.name);

                return {
                    id: u.id,
                    code: u.unit_code,
                    tenantName: u.tenant?.name,
                    status: u.status,
                    customColor: u.custom_color,
                    geometry,
                    signboardTex,
                    roofTex,
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
                if (ug.signboardTex) ug.signboardTex.dispose();
                if (ug.roofTex) ug.roofTex.dispose();
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

            {/* Unit Tenant 3D: Visual Extruded Polygon + Invisible Collider + Interactive Billboard Signboard */}
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

                        {/* 2. Invisible Bounding Box Collider O(1) untuk klik & hover badan unit */}
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

                        {/* 3. Tiang Penyangga Papan Signboard */}
                        {!isUnitDimmed && (
                            <mesh
                                position={[ug.boxCenterX, UNIT_HEIGHT + 0.5, ug.boxCenterZ]}
                                raycast={() => null}
                            >
                                <boxGeometry args={[0.04, 1.0, 0.04]} />
                                <meshBasicMaterial color="#64748b" />
                            </mesh>
                        )}

                        {/* 4. Interactive Billboard Signboard (Sprite): Selalu menghadap kamera baik Orbit maupun Walk Mode */}
                        {ug.signboardTex && !isUnitDimmed && (
                            <sprite
                                position={[ug.boxCenterX, UNIT_HEIGHT + 1.15, ug.boxCenterZ]}
                                scale={[2.8, 1.4, 1]}
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
                                <spriteMaterial
                                    map={ug.signboardTex}
                                    transparent={true}
                                    depthWrite={false}
                                    opacity={isSelected ? 1 : 0.94}
                                />
                            </sprite>
                        )}

                        {/* 5. Label Atap Datar (Tampak atas pada mode Orbit) */}
                        {ug.roofTex && !isUnitDimmed && (
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
                                    map={ug.roofTex}
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
