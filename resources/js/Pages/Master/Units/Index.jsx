import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import NumberInput from '@/Components/Form/NumberInput';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { IconPlus, IconEdit, IconTrash } from '@/Components/Icons';

export default function Index({ units, filters, branches, canPickBranch }) {
    const [editingUnit, setEditingUnit] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        floor: '',
        block: '',
        unit_number: '',
        unit_code: '',
        size: '',
        branch_id: '',
        is_active: true,
    });

    // Auto-suggest kode unit dari Lantai-Blok-Nomor, HANYA saat mode Tambah.
    // Saat mode Edit, unit_code tidak pernah diubah otomatis.
    useEffect(() => {
        if (editingUnit) return;
        setData('unit_code', [data.floor, data.block, data.unit_number].filter(Boolean).join('-'));
    }, [data.floor, data.block, data.unit_number, editingUnit]);

    const startEdit = (unit) => {
        setEditingUnit(unit);
        setData({
            floor: unit.floor,
            block: unit.block ?? '',
            unit_number: unit.unit_number,
            unit_code: unit.unit_code,
            size: unit.size ?? '',
            branch_id: unit.branch_id,
            is_active: unit.is_active,
        });
        clearErrors();
    };

    const cancelEdit = () => {
        setEditingUnit(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUnit(null);
                reset();
            },
        };

        if (editingUnit) {
            put(`/units/${editingUnit.id}`, options);
        } else {
            post('/units', options);
        }
    };

    const handleDelete = (id) => {
        if (confirm('Hapus unit ini?')) {
            router.delete(`/units/${id}`, { preserveScroll: true });
        }
    };

    const updateFilter = (value) => {
        router.get('/units', { search: value }, { preserveState: true });
    };

    const columns = [
        { key: 'code', label: 'Kode Unit' },
        { key: 'branch', label: 'Cabang' },
        { key: 'tenant', label: 'Tenant Saat Ini' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'w-10' },
    ];

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">Master Unit</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{units.total} unit terdaftar</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
                    {/* Panel form — sticky di kiri, dipakai bareng untuk Tambah & Edit */}
                    <form
                        onSubmit={submit}
                        className="bg-white rounded-xl border border-[#E2E5EA] p-5 lg:sticky lg:top-6"
                    >
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#0F1E36]/5 flex items-center justify-center shrink-0">
                                {editingUnit ? <IconEdit /> : <IconPlus />}
                            </div>
                            <h2 className="text-sm font-semibold text-gray-800">
                                {editingUnit ? 'Edit Unit' : 'Tambah Unit'}
                            </h2>
                        </div>

                        {canPickBranch && (
                            <FormField label="Cabang" error={errors.branch_id} required>
                                <SelectInput
                                    value={data.branch_id}
                                    onChange={(e) => setData('branch_id', e.target.value)}
                                >
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </SelectInput>
                            </FormField>
                        )}

                        <div className="grid grid-cols-3 gap-2.5">
                            <FormField label="Lantai" error={errors.floor} required>
                                <TextInput
                                    value={data.floor}
                                    onChange={(e) => setData('floor', e.target.value)}
                                    placeholder="GF"
                                />
                            </FormField>
                            <FormField label="Blok" error={errors.block}>
                                <TextInput
                                    value={data.block}
                                    onChange={(e) => setData('block', e.target.value)}
                                    placeholder="A"
                                />
                            </FormField>
                            <FormField label="No. Unit" error={errors.unit_number} required>
                                <TextInput
                                    value={data.unit_number}
                                    onChange={(e) => setData('unit_number', e.target.value)}
                                    placeholder="01"
                                />
                            </FormField>
                        </div>

                        <FormField
                            label="Kode Unit"
                            error={errors.unit_code}
                            hint="Otomatis dari Lantai-Blok-Nomor, bisa diedit manual."
                        >
                            <TextInput
                                value={data.unit_code}
                                onChange={(e) => setData('unit_code', e.target.value)}
                            />
                        </FormField>

                        <FormField label="Luas Unit (m²)" error={errors.size}>
                            <NumberInput
                                step="0.01"
                                value={data.size}
                                onChange={(e) => setData('size', e.target.value)}
                            />
                        </FormField>

                        <Checkbox
                            label="Unit aktif"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="mt-1 mb-4"
                        />

                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing} className="flex-1 justify-center">
                                {editingUnit ? 'Simpan Perubahan' : '+ Tambah Unit'}
                            </Button>
                            {editingUnit && (
                                <Button type="button" variant="secondary" onClick={cancelEdit}>
                                    Batal
                                </Button>
                            )}
                        </div>
                    </form>

                    {/* Tabel — mengisi sisa lebar */}
                    <div>
                        <TextInput
                            placeholder="Cari kode unit / lantai / blok..."
                            defaultValue={filters.search}
                            onChange={(e) => updateFilter(e.target.value)}
                            className="max-w-xs mb-4"
                        />

                        <DataTable columns={columns} footer={<Pagination meta={units} links={units.links} />}>
                            {units.data.map((unit) => (
                                <tr
                                    key={unit.id}
                                    onClick={() => startEdit(unit)}
                                    className={`group cursor-pointer transition-colors ${
                                        editingUnit?.id === unit.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
                                    }`}
                                >
                                    <td className="px-5 py-3.5 font-medium text-gray-900">
                                        {unit.unit_code}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-500">
                                        {unit.branch.name}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-500">
                                        {unit.active_tenancy?.tenant?.name ?? '—'}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <Badge color={unit.is_occupied ? 'blue' : 'gray'}>
                                            {unit.is_occupied ? 'Terisi' : 'Kosong'}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(unit.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                            aria-label="Hapus"
                                        >
                                            <IconTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {units.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                                        {filters.search
                                            ? 'Tidak ada unit yang cocok dengan pencarian ini.'
                                            : 'Belum ada unit.'}
                                    </td>
                                </tr>
                            )}
                        </DataTable>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}