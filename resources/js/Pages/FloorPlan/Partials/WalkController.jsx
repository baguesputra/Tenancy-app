import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';

const SCALE = 0.04;
const EYE_HEIGHT = 1.6;

// Helper: Cek apakah posisi (x, z) berada di koridor terbuka (tidak menabrak unit & tidak keluar denah)
function canWalkTo(x, z, boxes, bounds) {
    const r = 0.45; // radius collision pemain
    // Cek batas denah lantai
    if (Math.abs(x) > bounds.halfW - r || Math.abs(z) > bounds.halfH - r) {
        return false;
    }
    // Cek tabrakan dengan bounding box tiap unit
    for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (
            x >= b.minX - r &&
            x <= b.maxX + r &&
            z >= b.minZ - r &&
            z <= b.maxZ + r
        ) {
            return false;
        }
    }
    return true;
}

// Helper: Cari posisi awal jalan yang bebas hambatan di koridor
function findWalkableStart(boxes, bounds, preferredTarget = [0, 0, 0]) {
    const [px, , pz] = preferredTarget;
    if (canWalkTo(px, pz, boxes, bounds)) {
        return [px, pz];
    }
    if (canWalkTo(0, 0, boxes, bounds)) {
        return [0, 0];
    }
    // Cari spiral melingkar dari pusat koridor
    const maxR = Math.max(bounds.halfW, bounds.halfH);
    for (let r = 1; r < maxR; r += 1.2) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            if (canWalkTo(x, z, boxes, bounds)) {
                return [x, z];
            }
        }
    }
    return [0, 0];
}

export default function WalkController({ currentPlan, units = [], onLockChange }) {
    const { camera } = useThree();
    const { target3D, setSelectedUnitId } = useFloorMapStore();
    const controlsRef = useRef(null);
    const keysRef = useRef({});
    const [isLocked, setIsLocked] = useState(false);

    const imgW = currentPlan?.image_width || 1000;
    const imgH = currentPlan?.image_height || 600;

    const planeW = imgW * SCALE + 4;
    const planeH = imgH * SCALE + 2;
    const bounds = useMemo(() => ({ halfW: planeW / 2, halfH: planeH / 2 }), [planeW, planeH]);

    // Bounding box unit untuk collision detection cepat
    const planFloor = currentPlan?.floor;
    const floorUnits = useMemo(
        () => units.filter((u) => u.floor === planFloor),
        [units, planFloor]
    );
    const boxes = useMemo(() => {
        return floorUnits
            .filter((u) => Array.isArray(u.polygon_points) && u.polygon_points.length >= 3)
            .map((u) => {
                const xs = u.polygon_points.map((p) => (p[0] - imgW / 2) * SCALE);
                const zs = u.polygon_points.map((p) => (p[1] - imgH / 2) * SCALE);
                return {
                    id: u.id,
                    code: u.unit_code,
                    minX: Math.min(...xs),
                    maxX: Math.max(...xs),
                    minZ: Math.min(...zs),
                    maxZ: Math.max(...zs),
                };
            });
    }, [floorUnits, imgW, imgH]);

    // Posisi awal kamera saat masuk mode jalan
    useEffect(() => {
        const start = findWalkableStart(boxes, bounds, target3D);
        camera.position.set(start[0], EYE_HEIGHT, start[1]);
        // Hadapkan kamera ke tengah koridor
        const lookDir = new THREE.Vector3(0, EYE_HEIGHT, 0);
        if (Math.hypot(start[0], start[1]) < 2) {
            lookDir.set(0, EYE_HEIGHT, -5);
        }
        camera.lookAt(lookDir);
    }, [currentPlan?.id]);

    // Event listener keyboard untuk WASD + Shift
    useEffect(() => {
        const handleKeyDown = (e) => {
            keysRef.current[e.code] = true;
        };
        const handleKeyUp = (e) => {
            keysRef.current[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Loop animasi per frame untuk pergerakan & sliding collision
    useFrame((state, delta) => {
        if (!controlsRef.current || !controlsRef.current.isLocked) return;

        const dt = Math.min(delta, 0.05);
        const isSprinting = keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'];
        const speed = (isSprinting ? 9.5 : 4.8) * dt;

        const fwd =
            (keysRef.current['KeyW'] || keysRef.current['ArrowUp'] ? 1 : 0) -
            (keysRef.current['KeyS'] || keysRef.current['ArrowDown'] ? 1 : 0);
        const side =
            (keysRef.current['KeyD'] || keysRef.current['ArrowRight'] ? 1 : 0) -
            (keysRef.current['KeyA'] || keysRef.current['ArrowLeft'] ? 1 : 0);

        if (fwd !== 0 || side !== 0) {
            const x0 = camera.position.x;
            const z0 = camera.position.z;

            // Simulasikan pergerakan lokal kamera
            controlsRef.current.moveForward(fwd * speed);
            controlsRef.current.moveRight(side * speed);

            const nx = camera.position.x;
            const nz = camera.position.z;

            // Kembalikan ke posisi awal sebelum collision test
            camera.position.x = x0;
            camera.position.z = z0;

            // Sliding collision: Uji sumbu X dan Z secara independen agar pemain dapat meluncur di sepanjang dinding
            if (canWalkTo(nx, z0, boxes, bounds)) {
                camera.position.x = nx;
            }
            if (canWalkTo(camera.position.x, nz, boxes, bounds)) {
                camera.position.z = nz;
            }
        }

        // Kunci ketinggian mata konstan (1.6 meter)
        camera.position.y = EYE_HEIGHT;
    });

    const handleLock = () => {
        setIsLocked(true);
        if (onLockChange) onLockChange(true);
    };

    const handleUnlock = () => {
        setIsLocked(false);
        if (onLockChange) onLockChange(false);
    };

    return (
        <PointerLockControls
            ref={controlsRef}
            selector="#floor-scene-container"
            onLock={handleLock}
            onUnlock={handleUnlock}
        />
    );
}

