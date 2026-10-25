import { useEffect, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { IconCube, IconEdit, IconMap, IconSearch, IconUpload, IconX } from '@/Components/Icons';
import ElevatorNav from './Partials/ElevatorNav';
import FloorMap2D from './Partials/FloorMap2D';
import FloorScene3D from './Partials/FloorScene3D';
import TenantDrawer from './Partials/TenantDrawer';
import { STATUS_LEGEND } from './utils/geometry';

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
    const [uploadError, setUploadError] = useState('');
    const { data: uploadData, setData: setUploadData, post: postUpload, processing: uploading, errors, clearErrors } = useForm({
        floor_plan_id: currentPlan?.id || '',
        image: null,
    });

    // Jumlah unit di lantai yang sedang dilihat, dipakai untuk umpan balik hasil filter
    const floorUnits = units.filter((u) => u.floor === currentPlan?.floor);
    const query = searchQuery.trim().toLowerCase();
    const matchingUnits = floorUnits.filter((u) => {
        const matchesFilter = filterStatus === 'all' || u.status === filterStatus;
        const matchesSearch =
            !query ||
            u.unit_code?.toLowerCase().includes(query) ||
            u.tenant?.name?.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    });
    const hasLocalFilter = filterStatus !== 'all' || query.length > 0;

    const resetFilters = () => {
        setFilterStatus('all');
        setSearchQuery('');
    };

    const occupiedPct = summary.total ? Math.round((summary.occupied / summary.total) * 100) : 0;
    const kpis = [
        { key: 'total', label: 'Total Unit', value: summary.total ?? 0 },
        { key: 'occupied', label: 'Terisi', value: `${occupiedPct}%`, hint: `${summary.occupied ?? 0} unit` },
        { key: 'loo', label: 'LOO', value: summary.loo ?? 0 },
        { key: 'fitout', label: 'Fitout', value: summary.fitout ?? 0 },
        { key: 'vacant', label: 'Kosong', value: summary.vacant ?? 0 },
    ];

    const openUploadModal = () => {
        clearErrors();
        setUploadError('');
        setUploadData({ floor_plan_id: currentPlan?.id || '', image: null });
        setShowUploadModal(true);
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        setUploadError('');
        postUpload('/floor-plans/upload', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowUploadModal(false);
                setUploadData('image', null);
            },
            onError: (err) => {
                setUploadError(Object.values(err).flat().join(' ') || 'Periksa kembali file denah yang diunggah.');
            },
        });
    };

    const handleBranchChange = (e) => {
        const branchId = e.target.value;
        router.get('/floor-plans', { branch_id: branchId }, { preserveState: true });
    };

    const secondaryAction =
        'inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]';

    return (
        <AppLayout>
            <Head title="Denah Lantai" />

            <div className="space-y-4">
                {/* Header: identitas halaman + navigasi cabang + aksi utama */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                                Denah Lantai
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Visualisasi spasial unit tenant terhubung data kontrak &amp; okupansi.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {canPickBranch && (
                                <select
                                    value={activeBranchId}
                                    onChange={handleBranchChange}
                                    aria-label="Pilih cabang"
                                    className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20 focus:border-[#0F1E36]"
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            Cabang: {b.name} ({b.code})
                                        </option>
                                    ))}
                                </select>
                            )}

                            <button type="button" onClick={openUploadModal} className={secondaryAction}>
                                <IconUpload className="w-4 h-4" aria-hidden="true" />
                                Upload Denah
                            </button>

                            <Link href={`/floor-plans/editor/${activeFloor}`} className={secondaryAction}>
                                <IconEdit className="w-4 h-4" aria-hidden="true" />
                                Editor Poligon &amp; CAD
                            </Link>
                        </div>
                    </div>

                    {/* Ringkasan okupansi gedung (seluruh lantai cabang terpilih) */}
                    <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-200 rounded-lg border border-slate-200 overflow-hidden">
                        {kpis.map((k) => (
                            <div key={k.key} className="bg-white px-4 py-3">
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                    {k.label}
                                </dt>
                                <dd className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl font-semibold text-slate-900 tabular-nums">{k.value}</span>
                                    {k.hint && <span className="text-xs text-slate-400">{k.hint}</span>}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Toolbar: sakelar tampilan, pencarian, dan filter status */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div role="group" aria-label="Mode tampilan denah" className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                aria-pressed={viewMode === '2D'}
                                onClick={() => setViewMode('2D')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                                    viewMode === '2D'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <IconMap className="w-4 h-4" aria-hidden="true" />
                                Denah 2D
                            </button>
                            <button
                                type="button"
                                aria-pressed={viewMode === '3D'}
                                onClick={() => setViewMode('3D')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                                    viewMode === '3D'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <IconCube className="w-4 h-4" aria-hidden="true" />
                                Tampilan 3D
                            </button>
                        </div>

                        <span className="text-xs text-slate-500">
                            Lantai <strong className="font-semibold text-slate-700">{activeFloor}</strong>
                            {currentPlan?.name ? ` · ${currentPlan.name}` : ''}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <IconSearch
                                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                type="text"
                                placeholder="Cari unit atau tenant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Cari unit atau tenant"
                                className="text-xs bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-2 w-48 sm:w-56 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F1E36]/20 focus:border-[#0F1E36]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Bersihkan pencarian"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <IconX className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <div role="group" aria-label="Filter status unit" className="flex items-center gap-1 flex-wrap">
                            {STATUS_LEGEND.map((st) => {
                                const active = filterStatus === st.key;
                                return (
                                    <button
                                        key={st.key}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setFilterStatus(st.key)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                                            active
                                                ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {st.key !== 'all' && (
                                            <span className={`w-2 h-2 rounded-full ${st.dot}`} aria-hidden="true" />
                                        )}
                                        {st.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Umpan balik hasil filter pada lantai aktif */}
                {hasLocalFilter && (
                    <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
                        <span>
                            Menampilkan <strong className="font-semibold text-slate-700">{matchingUnits.length}</strong> dari{' '}
                            {floorUnits.length} unit di Lantai {activeFloor}
                        </span>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="font-semibold text-[#0369A1] hover:text-[#075985] underline underline-offset-2"
                        >
                            Bersihkan filter
                        </button>
                    </div>
                )}

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
                    title={`Upload Denah Lantai ${activeFloor}${currentPlan?.name ? ` (${currentPlan.name})` : ''}`}
                >
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <input type="hidden" name="floor_plan_id" value={currentPlan?.id || ''} />
                        <p className="text-xs text-slate-500">
                            Unggah gambar denah arsitektur untuk Lantai {activeFloor}. File SVG akan disanitasi otomatis demi keamanan.
                        </p>

                        <FileInput
                            name="image"
                            accept=".svg,.png,.jpg,.jpeg,.webp"
                            maxSize={30 * 1024 * 1024}
                            file={uploadData.image}
                            error={errors.image}
                            onClear={() => setUploadData('image', null)}
                            onChange={(e) => setUploadData('image', e.target.files?.[0] ?? null)}
                            hint="Maksimal 30 MB per file."
                        />

                        {uploadError && !errors.image && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                                {uploadError}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" loading={uploading} disabled={uploading || !uploadData.image}>
                                {uploading ? 'Mengunggah...' : 'Upload & Simpan'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </AppLayout>
    );
}