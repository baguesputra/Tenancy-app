import { useEffect, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Form/Button';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import ElevatorNav from './Partials/ElevatorNav';
import FloorMap2D from './Partials/FloorMap2D';
import FloorScene3D from './Partials/FloorScene3D';
import TenantDrawer from './Partials/TenantDrawer';

export default function Index({
    branches = [],
    activeBranchId,
    canPickBranch,
    floorPlans = [],
    activeFloor: initialFloor,
    units = [],
    summary = {},
}) {
    const {
        activeFloor,
        setActiveFloor,
        viewMode,
        setViewMode,
        view3DType,
        setView3DType,
        cameraMode3D,
        setCameraMode3D,
        buildingMode,
        setBuildingMode,
        explodedGap,
        setExplodedGap,
        filterStatus,
        setFilterStatus,
        searchQuery,
        setSearchQuery,
    } = useFloorMapStore();

    // Inisialisasi lantai aktif dari prop
    useEffect(() => {
        if (initialFloor) {
            setActiveFloor(initialFloor);
        }
    }, [initialFloor, setActiveFloor]);

    const currentPlan = floorPlans.find((fp) => fp.floor === activeFloor) || floorPlans[0];

    const [showUploadModal, setShowUploadModal] = useState(false);
    const { data: uploadData, setData: setUploadData, post: postUpload, processing: uploading } = useForm({
        floor_plan_id: currentPlan?.id || '',
        image: null,
    });

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!uploadData.image) {
            alert('Silakan pilih file denah terlebih dahulu.');
            return;
        }
        postUpload('/floor-plans/upload', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowUploadModal(false);
                setUploadData('image', null);
            },
            onError: (err) => {
                const msg = Object.values(err).flat().join('\n');
                alert('Gagal mengunggah denah:\n' + (msg || 'Periksa format file.'));
            },
        });
    };

    const handleBranchChange = (e) => {
        const branchId = e.target.value;
        router.get('/floor-plans', { branch_id: branchId }, { preserveState: true });
    };

    return (
        <AppLayout>
            <Head title="Denah Lantai - Floor Map View" />

            <div className="space-y-4">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Denah Lantai (Floor Map View)
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                5 Lantai Terhubung
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Visualisasi spasial unit tenant mall terhubung data realtime kontrak &amp; okupansi
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {canPickBranch && (
                            <select
                                value={activeBranchId}
                                onChange={handleBranchChange}
                                className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            >
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        Cabang: {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Upload Denah */}
                        <button
                            type="button"
                            onClick={() => {
                                setUploadData('floor_plan_id', currentPlan?.id || '');
                                setUploadData('image', null);
                                setShowUploadModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                        >
                            📤 Upload Denah
                        </button>

                        {/* Link ke Editor Poligon & CAD Tool */}
                        <Link
                            href={`/floor-plans/editor/${activeFloor}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editor Poligon &amp; CAD
                        </Link>
                    </div>
                </div>

                {/* Toolbar & Filters */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Switcher 2D / 3D */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setViewMode('2D')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === '2D'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🗺️ Denah 2D
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('3D')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === '3D'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                🏢 View 3D
                            </button>
                        </div>

                        {/* Kontrol Khusus Mode 3D */}
                        {viewMode === '3D' && (
                            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 flex-wrap">
                                {/* Level: Lantai Saja vs Gedung 5 Lantai */}
                                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setView3DType('single')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                            view3DType === 'single'
                                                ? 'bg-white font-bold text-indigo-700 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        📍 Lantai {activeFloor} Saja
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView3DType('building')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                            view3DType === 'building'
                                                ? 'bg-white font-bold text-indigo-700 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        🏢 Gedung 5 Lantai
                                    </button>
                                </div>

                                {/* Jika mode Lantai Saja: Pilih Orbit vs Mode Jalan */}
                                {view3DType === 'single' && (
                                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setCameraMode3D('orbit')}
                                            className={`px-2 py-1 rounded-md text-[11px] ${
                                                cameraMode3D === 'orbit'
                                                    ? 'bg-white font-bold text-slate-900 shadow-xs'
                                                    : 'hover:text-slate-900'
                                            }`}
                                        >
                                            🛰️ Orbit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCameraMode3D('walk')}
                                            className={`px-2 py-1 rounded-md text-[11px] ${
                                                cameraMode3D === 'walk'
                                                    ? 'bg-emerald-600 font-bold text-white shadow-xs'
                                                    : 'hover:text-slate-900'
                                            }`}
                                        >
                                            🚶 Mode Jalan
                                        </button>
                                    </div>
                                )}

                                {/* Jika mode Gedung 5 Lantai: Pilih Bentuk Gedung */}
                                {view3DType === 'building' && (
                                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setBuildingMode('stacked')}
                                            className={`px-2 py-1 rounded-md text-[11px] ${
                                                buildingMode === 'stacked'
                                                    ? 'bg-white font-bold text-slate-900 shadow-xs'
                                                    : 'hover:text-slate-900'
                                            }`}
                                        >
                                            Gedung Utuh
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBuildingMode('exploded')}
                                            className={`px-2 py-1 rounded-md text-[11px] ${
                                                buildingMode === 'exploded'
                                                    ? 'bg-white font-bold text-indigo-700 shadow-xs'
                                                    : 'hover:text-slate-900'
                                            }`}
                                        >
                                            Exploded
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBuildingMode('isolated')}
                                            className={`px-2 py-1 rounded-md text-[11px] ${
                                                buildingMode === 'isolated'
                                                    ? 'bg-white font-bold text-indigo-700 shadow-xs'
                                                    : 'hover:text-slate-900'
                                            }`}
                                        >
                                            Fokus Lantai
                                        </button>
                                    </div>
                                )}

                                {view3DType === 'building' && buildingMode === 'exploded' && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <span className="text-[10px] text-slate-400">Jarak:</span>
                                        <input
                                            type="range"
                                            min="2"
                                            max="12"
                                            step="0.5"
                                            value={explodedGap}
                                            onChange={(e) => setExplodedGap(parseFloat(e.target.value))}
                                            className="w-16 accent-indigo-600 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Status Legend & Search */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari unit atau tenant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pl-8 w-44 sm:w-56 focus:ring-2 focus:ring-indigo-500"
                            />
                            <svg
                                className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-1 text-xs">
                            {[
                                { key: 'all', label: 'Semua', count: summary.total },
                                { key: 'Aktif', label: 'Aktif', count: summary.occupied, dot: 'bg-emerald-500' },
                                { key: 'LOO', label: 'LOO', count: summary.loo, dot: 'bg-amber-500' },
                                { key: 'Fitout', label: 'Fitout', count: summary.fitout, dot: 'bg-sky-500' },
                                { key: 'Kosong', label: 'Kosong', count: summary.vacant, dot: 'bg-slate-400' },
                            ].map((st) => (
                                <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => setFilterStatus(st.key)}
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                        filterStatus === st.key
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                                    }`}
                                >
                                    {st.dot && <span className={`w-2 h-2 rounded-full ${st.dot}`} />}
                                    <span>{st.label}</span>
                                    <span className="text-[10px] opacity-75">({st.count ?? 0})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Viewport Container */}
                <div className="relative">
                    {/* Elevator Navigation on side */}
                    <div className="absolute top-4 left-4 z-20">
                        <ElevatorNav floorPlans={floorPlans} units={units} />
                    </div>

                    {/* Viewport: 2D SVG vs 3D Three.js Scene */}
                    {viewMode === '2D' ? (
                        <FloorMap2D currentPlan={currentPlan} units={units} />
                    ) : (
                        <FloorScene3D floorPlans={floorPlans} units={units} />
                    )}
                </div>

                {/* Tenant Detail SlideOver Drawer */}
                <TenantDrawer units={units} />

                {/* Modal Upload Denah Dasar */}
                <Modal
                    open={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    title={`Upload Denah Lantai ${activeFloor} (${currentPlan?.name || ''})`}
                >
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <input type="hidden" name="floor_plan_id" value={currentPlan?.id || ''} />
                        <p className="text-xs text-slate-500">
                            Unggah gambar denah arsitektur format SVG, PNG, JPG, JPEG, atau WebP (maks. 30MB) untuk lantai {activeFloor}. File SVG akan disanitasi otomatis demi keamanan.
                        </p>

                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                            <input
                                type="file"
                                accept=".svg,.png,.jpg,.jpeg,.webp"
                                required
                                onChange={(e) => {
                                    setUploadData('floor_plan_id', currentPlan?.id || '');
                                    setUploadData('image', e.target.files[0]);
                                }}
                                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            />
                            {uploadData.image && (
                                <div className="text-[11px] text-emerald-600 font-semibold mt-2">
                                    File terpilih: {uploadData.image.name} ({(uploadData.image.size / 1024).toFixed(1)} KB)
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={uploading || !uploadData.image}>
                                {uploading ? 'Mengunggah...' : 'Upload &amp; Simpan'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </AppLayout>
    );
}

