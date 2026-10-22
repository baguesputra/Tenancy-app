import { create } from 'zustand';

export const useFloorMapStore = create((set, get) => ({
    activeFloor: 'GF',
    viewMode: '2D', // '2D' | '3D'
    view3DType: 'single', // 'single' (3D Per-Lantai dengan tekstur denah) | 'building' (3D Gedung 5 Lantai Bertumpuk)
    cameraMode3D: 'orbit', // 'orbit' | 'walk' (First-Person Walkthrough)
    buildingMode: 'stacked', // 'stacked' | 'exploded' | 'isolated'
    explodedGap: 6, // 0 to 15
    selectedUnitId: null,
    hoveredUnitId: null,
    filterStatus: 'all', // 'all' | 'Aktif' | 'LOO' | 'Fitout' | 'Kosong'
    searchQuery: '',
    viewport2D: { x: 0, y: 0, scale: 1 },
    target3D: [0, 0, 0], // Sinkronisasi koordinat 2D -> 3D

    setActiveFloor: (floor) => set({ activeFloor: floor }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setView3DType: (type) => set({ view3DType: type }),
    setCameraMode3D: (mode) => set({ cameraMode3D: mode }),
    setBuildingMode: (mode) => set({ buildingMode: mode }),
    setExplodedGap: (gap) => set({ explodedGap: gap }),
    setSelectedUnitId: (id) => set({ selectedUnitId: id }),
    setHoveredUnitId: (id) => set({ hoveredUnitId: id }),
    setFilterStatus: (status) => set({ filterStatus: status }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setViewport2D: (viewport) => set({ viewport2D: viewport }),
    setTarget3D: (target) => set({ target3D: target }),
    resetSelection: () => set({ selectedUnitId: null, hoveredUnitId: null }),
}));
