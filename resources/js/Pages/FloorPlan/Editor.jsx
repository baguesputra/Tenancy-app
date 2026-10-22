import { useState, useRef } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Form/Button';

export default function Editor({
    branches = [],
    activeBranchId,
    floorPlans = [],
    activeFloor,
    currentPlan,
    units = [],
}) {
    // State mode: 'draw' | 'select'
    const [editorMode, setEditorMode] = useState('select');
    const [draftPoints, setDraftPoints] = useState([]);
    const [selectedUnitCode, setSelectedUnitCode] = useState(null);
    const [unitList, setUnitList] = useState(units);
    const [saving, setSaving] = useState(false);

    // Modal Upload Denah & Modal Auto-Detect CAD
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCadModal, setShowCadModal] = useState(false);
    const [cadMatches, setCadMatches] = useState([]);
    const [cadLoading, setCadLoading] = useState(false);

    // Form Upload Denah
    const { data: uploadData, setData: setUploadData, post: postUpload, processing: uploading } = useForm({
        floor_plan_id: currentPlan?.id || '',
        image: null,
    });

    const svgRef = useRef(null);

    const width = currentPlan?.image_width || 1000;
    const height = currentPlan?.image_height || 600;
    const viewBox = currentPlan?.viewbox || `0 0 ${width} ${height}`;

    // Konversi koordinat mouse ke koordinat viewBox SVG
    const getSvgCoordinates = (e) => {
        if (!svgRef.current) return [0, 0];
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
        return [Math.round(svgP.x * 10) / 10, Math.round(svgP.y * 10) / 10];
    };

    // Handler klik di SVG saat mode gambar poligon
    const handleSvgClick = (e) => {
        if (editorMode !== 'draw') return;
        const [x, y] = getSvgCoordinates(e);

        // Jika klik dekat titik awal (jarak < 15px) dan ada >= 3 titik, tutup poligon
        if (draftPoints.length >= 3) {
            const [x0, y0] = draftPoints[0];
            const dist = Math.hypot(x - x0, y - y0);
            if (dist < 20) {
                finishPolygon();
                return;
            }
        }

        setDraftPoints((prev) => [...prev, [x, y]]);
    };

    const finishPolygon = () => {
        if (draftPoints.length < 3) {
            alert('Poligon membutuhkan minimal 3 titik sudut.');
            return;
        }

        const unassigned = unitList.find((u) => !u.polygon_points || u.polygon_points.length === 0);
        const targetCode = prompt(
            `Ketik kode unit untuk poligon ini (misal: ${unassigned?.unit_code || 'GF-A-001'}):`,
            unassigned?.unit_code || ''
        );

        if (!targetCode) {
            setDraftPoints([]);
            return;
        }

        const clean = targetCode.trim().toUpperCase();
        const found = unitList.find((u) => u.unit_code.toUpperCase() === clean);

        if (!found) {
            alert(`Unit dengan kode "${clean}" tidak ditemukan di lantai ${activeFloor}.`);
            return;
        }

        setUnitList((prev) =>
            prev.map((u) =>
                u.id === found.id
                    ? { ...u, polygon_points: draftPoints, has_polygon: true }
                    : u
            )
        );

        setSelectedUnitCode(found.unit_code);
        setDraftPoints([]);
        setEditorMode('select');
    };

    const handleHapusPoligon = (unitId) => {
        if (!confirm('Hapus poligon unit ini?')) return;
        setUnitList((prev) =>
            prev.map((u) =>
                u.id === unitId ? { ...u, polygon_points: null, has_polygon: false } : u
            )
        );
        if (selectedUnitCode === unitList.find((u) => u.id === unitId)?.unit_code) {
            setSelectedUnitCode(null);
        }
    };

    const handleSimpanKeDatabase = () => {
        setSaving(true);
        const payload = {
            units: unitList.map((u) => ({
                id: u.id,
                polygon_points: u.polygon_points,
                custom_color: u.custom_color || null,
            })),
        };

        router.post('/floor-plans/polygons', payload, {
            onSuccess: () => {
                setSaving(false);
                alert('Semua koordinat poligon berhasil disimpan ke database!');
            },
            onError: () => {
                setSaving(false);
                alert('Gagal menyimpan poligon.');
            },
        });
    };

    // Upload Background Plan
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

    // Auto-Detect CAD (SVG/DXF)
    const handleCadFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCadLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('branch_id', activeBranchId);
        formData.append('floor', activeFloor);

        try {
            const res = await fetch('/floor-plans/parse-cad', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setCadMatches(data.matches || []);
            } else {
                alert('Gagal memproses file CAD.');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat memproses file CAD.');
        } finally {
            setCadLoading(false);
        }
    };

    const handleApplyCadMatches = () => {
        const matchedItems = cadMatches.filter((m) => m.matched && m.unit_id);
        if (matchedItems.length === 0) {
            alert('Tidak ada unit yang cocok untuk diterapkan.');
            return;
        }

        setUnitList((prev) => {
            const matchMap = new Map(matchedItems.map((m) => [m.unit_id, m.polygon_points]));
            return prev.map((u) => {
                if (matchMap.has(u.id)) {
                    return { ...u, polygon_points: matchMap.get(u.id), has_polygon: true };
                }
                return u;
            });
        });

        setShowCadModal(false);
        setCadMatches([]);
        alert(`Berhasil menerapkan ${matchedItems.length} poligon unit dari CAD! Jangan lupa klik "Simpan ke Database".`);
    };

    return (
        <AppLayout>
            <Head title={`Editor Denah Lantai - ${currentPlan?.name || activeFloor}`} />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/floor-plans"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Kembali ke Peta View"
                        >
                            &larr;
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Editor Poligon &amp; CAD • {currentPlan?.name || activeFloor}
                            </h1>
                            <p className="text-xs text-slate-500">
                                Gambar poligon manual di atas denah atau deteksi otomatis dari AutoCAD (SVG/DXF)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Selector Lantai */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {floorPlans.map((fp) => (
                                <Link
                                    key={fp.id}
                                    href={`/floor-plans/editor/${fp.floor}`}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        activeFloor === fp.floor
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {fp.floor}
                                </Link>
                            ))}
                        </div>

                        {/* Upload Denah */}
                        <button
                            type="button"
                            onClick={() => {
                                setUploadData('floor_plan_id', currentPlan?.id || '');
                                setShowUploadModal(true);
                            }}
                            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                        >
                            📤 Upload Denah
                        </button>

                        {/* Auto Detect CAD */}
                        <button
                            type="button"
                            onClick={() => setShowCadModal(true)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
                        >
                            ⚡ Auto-Detect CAD
                        </button>

                        {/* Simpan ke Database */}
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSimpanKeDatabase}
                            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
                        >
                            {saving ? 'Menyimpan...' : '💾 Simpan ke Database'}
                        </button>
                    </div>
                </div>

                {/* Main Workspace Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Canvas Area (3 Kolom) */}
                    <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                        {/* Toolbar Canvas */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditorMode('select');
                                        setDraftPoints([]);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        editorMode === 'select'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Pilih / Edit Unit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditorMode('draw');
                                        setSelectedUnitCode(null);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        editorMode === 'draw'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    ✏️ Gambar Poligon Baru
                                </button>
                                {editorMode === 'draw' && draftPoints.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setDraftPoints([])}
                                        className="text-xs text-rose-600 hover:underline px-2"
                                    >
                                        Batal Titik
                                    </button>
                                )}
                            </div>

                            <div className="text-xs text-slate-400">
                                {editorMode === 'draw'
                                    ? `Klik di kanvas untuk menambah titik sudut (${draftPoints.length} titik). Klik dekat titik awal untuk menutup.`
                                    : 'Klik poligon unit untuk melihat atau mengedit.'}
                            </div>
                        </div>

                        {/* Interactive SVG Canvas */}
                        <div className="relative w-full h-[580px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                            <svg
                                ref={svgRef}
                                viewBox={viewBox}
                                onClick={handleSvgClick}
                                className={`w-full h-full ${editorMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
                            >
                                <defs>
                                    <pattern id="editorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                                    </pattern>
                                </defs>
                                <rect width={width} height={height} fill="url(#editorGrid)" />

                                {/* Denah Background Image jika ada */}
                                {currentPlan?.image_url && (
                                    <image
                                        href={currentPlan.image_url}
                                        x={0}
                                        y={0}
                                        width={width}
                                        height={height}
                                        preserveAspectRatio="xMidYMid meet"
                                        opacity={0.8}
                                    />
                                )}

                                {/* Poligon Unit yang sudah ada */}
                                {unitList
                                    .filter((u) => Array.isArray(u.polygon_points) && u.polygon_points.length >= 3)
                                    .map((u) => {
                                        const isSel = selectedUnitCode === u.unit_code;
                                        const ptsStr = u.polygon_points.map((p) => `${p[0]},${p[1]}`).join(' ');
                                        const [cx, cy] = [
                                            u.polygon_points.reduce((acc, p) => acc + p[0], 0) / u.polygon_points.length,
                                            u.polygon_points.reduce((acc, p) => acc + p[1], 0) / u.polygon_points.length,
                                        ];

                                        return (
                                            <g key={u.id}>
                                                <polygon
                                                    points={ptsStr}
                                                    fill={isSel ? 'rgba(79, 70, 229, 0.45)' : 'rgba(59, 130, 246, 0.25)'}
                                                    stroke={isSel ? '#4338ca' : '#2563eb'}
                                                    strokeWidth={isSel ? 3 : 1.5}
                                                    className="cursor-pointer hover:fill-indigo-300/50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (editorMode === 'select') setSelectedUnitCode(u.unit_code);
                                                    }}
                                                />
                                                <text
                                                    x={cx}
                                                    y={cy + 4}
                                                    textAnchor="middle"
                                                    fontSize="11"
                                                    fontWeight="700"
                                                    fill="#0f172a"
                                                    className="pointer-events-none select-none"
                                                    style={{
                                                        paintOrder: 'stroke',
                                                        stroke: '#fff',
                                                        strokeWidth: '2px',
                                                    }}
                                                >
                                                    {u.unit_code}
                                                </text>
                                            </g>
                                        );
                                    })}

                                {/* Draft Polygon yang sedang digambar */}
                                {draftPoints.length > 0 && (
                                    <g>
                                        <polyline
                                            points={draftPoints.map((p) => `${p[0]},${p[1]}`).join(' ')}
                                            fill="rgba(239, 68, 68, 0.15)"
                                            stroke="#dc2626"
                                            strokeWidth="2"
                                            strokeDasharray="5 3"
                                        />
                                        {draftPoints.map((p, idx) => (
                                            <circle
                                                key={idx}
                                                cx={p[0]}
                                                cy={p[1]}
                                                r={idx === 0 ? 6 : 4}
                                                fill={idx === 0 ? '#dc2626' : '#ffffff'}
                                                stroke="#dc2626"
                                                strokeWidth="2"
                                            />
                                        ))}
                                    </g>
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Sidebar Daftar Unit (1 Kolom) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[650px]">
                        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-800">
                                Unit Lantai {activeFloor} ({unitList.length})
                            </h3>
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {unitList.filter((u) => u.has_polygon).length} Terplot
                            </span>
                        </div>

                        {/* List Unit */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2 space-y-1 text-xs">
                            {unitList.map((u) => {
                                const isSel = selectedUnitCode === u.unit_code;
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => setSelectedUnitCode(u.unit_code)}
                                        className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
                                            isSel
                                                ? 'bg-indigo-50 border border-indigo-200'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span>{u.unit_code}</span>
                                                {u.has_polygon && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {u.tenant_name ? `Tenant: ${u.tenant_name}` : 'Unit Kosong'}
                                            </div>
                                        </div>

                                        {u.has_polygon && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHapusPoligon(u.id);
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1"
                                                title="Hapus Poligon"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Upload Denah Dasar */}
            <Modal
                open={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                title={`Upload Denah Lantai ${activeFloor} (${currentPlan?.name || ''})`}
            >
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <input type="hidden" name="floor_plan_id" value={currentPlan?.id || ''} />
                    <p className="text-xs text-slate-500">
                        Unggah gambar denah arsitektur format SVG, PNG, JPG, JPEG, atau WebP (maks. 30MB). File SVG akan disanitasi otomatis demi keamanan.
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

            {/* Modal Auto-Detect CAD (SVG/DXF) */}
            <Modal
                open={showCadModal}
                onClose={() => setShowCadModal(false)}
                title={`Auto-Detect Poligon dari AutoCAD (${activeFloor})`}
                maxWidth="max-w-xl"
            >
                <div className="space-y-4 max-h-[85vh] flex flex-col">
                    <p className="text-xs text-slate-500">
                        Sistem membaca koordinat poligon ruangan dan label teks kode unit secara otomatis via algoritma Point-in-Polygon.
                    </p>

                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                        <input
                            type="file"
                            accept=".svg,.dxf"
                            onChange={handleCadFileSelect}
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                        />
                        <div className="text-[11px] text-slate-400 mt-1">
                            Pilih file .svg atau .dxf yang diekspor dari AutoCAD untuk lantai {activeFloor}
                        </div>
                    </div>

                    {cadLoading && (
                        <div className="text-center py-6 text-xs text-slate-500 font-semibold animate-pulse">
                            Sedang mengekstrak poligon &amp; mencocokkan kode unit...
                        </div>
                    )}

                    {cadMatches.length > 0 && (
                        <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b">
                                <span>Hasil Deteksi ({cadMatches.length} Poligon)</span>
                                <span className="text-emerald-600">
                                    {cadMatches.filter((m) => m.matched).length} Cocok dengan Database
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                                {cadMatches.map((m, idx) => (
                                    <div key={idx} className="py-2 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-slate-800">{m.unit_code}</span>
                                            <span className="text-[10px] text-slate-400 ml-2">
                                                ({m.polygon_points?.length || 0} titik)
                                            </span>
                                        </div>
                                        <div>
                                            {m.matched ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                    Cocok
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    Unit Baru / Tidak Ditemukan
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowCadModal(false)}>
                            Tutup
                        </Button>
                        {cadMatches.length > 0 && (
                            <Button type="button" onClick={handleApplyCadMatches}>
                                Terapkan Poligon Terdeteksi
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}

