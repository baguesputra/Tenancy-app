import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function UnitForm({ unit, branches, canPickBranch }) {
    const isEdit = !!unit;
    const [codeManuallyEdited, setCodeManuallyEdited] = useState(isEdit);

    const { data, setData, post, put, processing, errors } = useForm({
        floor: unit?.floor ?? '',
        block: unit?.block ?? '',
        unit_number: unit?.unit_number ?? '',
        unit_code: unit?.unit_code ?? '',
        size: unit?.size ?? '',
        branch_id: unit?.branch_id ?? '',
        is_active: unit?.is_active ?? true,
    });

    // Auto-suggest unit_code dari floor+block+unit_number, kecuali user sudah edit manual
    useEffect(() => {
        if (!codeManuallyEdited) {
            const suggested = [data.floor, data.block, data.unit_number].filter(Boolean).join('-');
            setData('unit_code', suggested);
        }
    }, [data.floor, data.block, data.unit_number]);

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(`/units/${unit.id}`);
        } else {
            post('/units');
        }
    };

    return (
        <form onSubmit={submit} className="max-w-lg space-y-4 bg-white rounded-lg shadow-sm p-5">
            {canPickBranch && (
                <Field label="Cabang" error={errors.branch_id}>
                    <select
                        value={data.branch_id}
                        onChange={(e) => setData('branch_id', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="">Pilih...</option>
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </Field>
            )}

            <div className="grid grid-cols-3 gap-3">
                <Field label="Lantai" error={errors.floor}>
                    <input
                        value={data.floor}
                        onChange={(e) => setData('floor', e.target.value)}
                        placeholder="GF, LG, 1, dst"
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>
                <Field label="Blok" error={errors.block}>
                    <input
                        value={data.block}
                        onChange={(e) => setData('block', e.target.value)}
                        placeholder="A, B, dst"
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>
                <Field label="Nomor Unit" error={errors.unit_number}>
                    <input
                        value={data.unit_number}
                        onChange={(e) => setData('unit_number', e.target.value)}
                        placeholder="01, 05, dst"
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>
            </div>

            <Field label="Kode Unit" error={errors.unit_code}>
                <input
                    value={data.unit_code}
                    onChange={(e) => {
                        setCodeManuallyEdited(true);
                        setData('unit_code', e.target.value);
                    }}
                    className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                    Otomatis dibuat dari Lantai-Blok-Nomor, bisa diedit manual kalau perlu format lain.
                </p>
            </Field>

            <Field label="Luas Unit (m²)" error={errors.size}>
                <input
                    type="number"
                    step="0.01"
                    value={data.size}
                    onChange={(e) => setData('size', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                />
            </Field>

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                />
                <span className="text-sm text-gray-600">Unit aktif</span>
            </label>

            <button
                type="submit"
                disabled={processing}
                className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
            >
                {isEdit ? 'Simpan Perubahan' : 'Tambah Unit'}
            </button>
        </form>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}