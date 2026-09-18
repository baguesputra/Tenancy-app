import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import NumberInput from '@/Components/Form/NumberInput';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { IconPlus, IconEdit, IconTrash, IconDocument } from '@/Components/Icons';

const statusOptions = [
    { key: '', label: 'Semua' },
    { key: 'occupied', label: 'Terisi' },
    { key: 'vacant', label: 'Kosong' },
    { key: 'inactive', label: 'Nonaktif' },
];

export default function Index({ units, summary = { total: 0, occupied: 0, vacant: 0, inactive: 0 }, filters = {}, branches, canPickBranch }) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [searchText, setSearchText] = useState(filters.search ?? '');

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        floor: '',
        block: '',
        unit_number: '',
        unit_code: '',
        size: '',
        branch_id: '',
        is_active: true,
    });

    useEffect(() => {
        if (editingUnit) return;
        setData('unit_code', [data.floor, data.block, data.unit_number].filter(Boolean).join('-'));
    }, [data.floor, data.block, data.unit_number, editingUnit]); // eslint-disable-line react-hooks/exhaustive-deps

    const openCreate = () => {
        setEditingUnit(null);
        reset();
        clearErrors();
        setPanelOpen(true);
    };

    const openEdit = (unit) => {
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
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setEditingUnit(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: closePanel };
        editingUnit ? put(`/units/${editingUnit.id}`, options) : post('/units', options);
    };

    const handleDelete = (unit) => {
        const tenant = unit.active_tenancy?.tenant?.name;
        if (!confirm(`Hapus unit ${unit.unit_code}?\n\nTindakan ini tidak bisa dibatalkan.`)) return;
        if (tenant && !confirm(`Unit ${unit.unit_code} masih ditempati "${tenant}".\nUnit dengan riwayat tenancy akan ditolak server.\n\nTetap lanjut hapus?`)) return;
        router.delete(`/units/${unit.id}`, { preserveScroll: true });
    };

    const updateFilter = (key, value) => {
        router.get('/units', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasFilter = filters.search || filters.status;
    const resetFilters = () => {
        setSearchText('');
        router.get('/units', {}, { preserveScroll: true, replace: true });
    };

    const stats = [
        { key: '', label: 'Total Unit', value: summary.total, dot: 'bg-[#0F1E36]' },
        { key: 'occupied', label: 'Terisi', value: summary.occupied, dot: 'bg-emerald-500' },
        { key: 'vacant', label: 'Kosong', value: summary.vacant, dot: 'bg-blue-500' },
        { key: 'inactive', label: 'Nonaktif', value: summary.inactive, dot: 'bg-gray-400' },
    ];

    const columns = [
        { key: 'code', label: 'Kode Unit' },
        { key: 'location', label: 'Lokasi' },
        { key: 'size', label: 'Luas' },
        { key: 'tenant', label: 'Tenant Saat Ini' },
        { key: 'status', label: 'Status', className: 'text-right' },
        { key: 'actions', label: '', className: 'w-20' },
    ];

    const qrParams = new URLSearchParams(
        Object.fromEntries(Object.entries({ search: filters.search, status: filters.status }).filter(([, v]) => v))
    ).toString();
    const bulkQrHref = `/units-qr/bulk${qrParams ? `?${qrParams}` : ''}`;

    const renderActions = (unit) => (
        <div className="flex gap-1 justify-end">
            <a
                href={`/units/${unit.id}/qr`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Cetak QR ${unit.unit_code}`}
                title="Cetak QR"
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-[#0F1E36] hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
            >
                <IconDocument className="w-4 h-4" />
            </a>
            <button
                onClick={(e) => { e.stopPropagation(); handleDelete(unit); }}
                aria-label={`Hapus ${unit.unit_code}`}
                title="Hapus"
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-500"
            >
                <IconTrash className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-5">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Master Unit</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{summary.total} unit terdaftar · {summary.occupied} terisi · {summary.vacant} kosong</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <a
                            href={bulkQrHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                                setExporting(true);
                                setTimeout(() => setExporting(false), 10000);
                            }}
                            className={`inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg border transition-colors ${exporting ? 'text-gray-400 bg-gray-50 border-[#E2E5EA] pointer-events-none' : 'text-gray-700 bg-white border-[#E2E5EA] hover:bg-gray-50'}`}
                        >
                            {exporting ? 'Menyiapkan PDF…' : 'Export QR (ikut filter, maks 50)'}
                        </a>
                        <Button onClick={openCreate} iconLeft={<IconPlus className="w-4 h-4" />} className="!py-2.5 min-h-[44px]">Tambah Unit</Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                    {stats.map((s) => {
                        const active = (filters.status ?? '') === s.key;
                        return (
                            <button
                                key={s.label}
                                onClick={() => updateFilter('status', s.key)}
                                aria-pressed={active}
                                className={`text-left bg-white rounded-xl border px-3.5 sm:px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${active ? 'border-[#0F1E36] ring-1 ring-[#0F1E36]' : 'border-[#E2E5EA] hover:border-gray-300 hover:shadow-sm'}`}
                            >
                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                                    {s.label}
                                </span>
                                <span className="block text-lg sm:text-xl font-semibold text-gray-900 mt-1 tabular-nums">{s.value}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bg-white rounded-xl border border-[#E2E5EA] shadow-sm p-3 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            <TextInput
                                placeholder="Cari kode unit / lantai / blok…"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari unit"
                            />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter status">
                            {statusOptions.map((o) => (
                                <button
                                    key={o.key}
                                    onClick={() => updateFilter('status', o.key)}
                                    aria-pressed={(filters.status ?? '') === o.key}
                                    className={`shrink-0 px-3 py-2 min-h-[40px] rounded-full text-xs font-medium transition-colors ${(filters.status ?? '') === o.key ? 'bg-[#0F1E36] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        {hasFilter && (
                            <button onClick={resetFilters} className="px-3 py-2 min-h-[40px] text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns} footer={<Pagination meta={units} links={units.links} />}>
                        {units.data.map((unit) => (
                            <tr
                                key={unit.id}
                                onClick={() => openEdit(unit)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(unit); } }}
                                tabIndex={0}
                                className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                    editingUnit?.id === unit.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
                                }`}
                            >
                                <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{unit.unit_code}</td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">
                                    Lt. {unit.floor}{unit.block ? ` · Blok ${unit.block}` : ''} · No. {unit.unit_number}
                                </td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm whitespace-nowrap">{unit.size ? `${unit.size} m²` : '—'}</td>
                                <td className="px-5 py-3.5 text-gray-500 text-sm">{unit.active_tenancy?.tenant?.name ?? '—'}</td>
                                <td className="px-5 py-3.5 text-right">
                                    {!unit.is_active ? (
                                        <Badge color="gray">Nonaktif</Badge>
                                    ) : (
                                        <Badge color={unit.is_occupied ? 'green' : 'blue'}>
                                            {unit.is_occupied ? 'Terisi' : 'Kosong'}
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-5 py-3.5">{renderActions(unit)}</td>
                            </tr>
                        ))}
                        {units.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center">
                                    <p className="text-sm font-medium text-gray-700">Belum ada unit ditemukan.</p>
                                    <p className="text-xs text-gray-400 mt-1">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah Unit untuk data pertama.'}</p>
                                    {hasFilter && (
                                        <button onClick={resetFilters} className="mt-3 text-sm text-[#0F1E36] font-medium hover:underline rounded">
                                            Reset filter
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                    </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {units.data.map((unit) => (
                        <div
                            key={unit.id}
                            onClick={() => openEdit(unit)}
                            className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="text-sm font-semibold text-gray-900">{unit.unit_code}</p>
                                {!unit.is_active ? (
                                    <Badge color="gray" size="sm">Nonaktif</Badge>
                                ) : (
                                    <Badge color={unit.is_occupied ? 'green' : 'blue'} size="sm">
                                        {unit.is_occupied ? 'Terisi' : 'Kosong'}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                Lt. {unit.floor}{unit.block ? ` · Blok ${unit.block}` : ''} · No. {unit.unit_number}
                                {unit.size ? ` · ${unit.size} m²` : ''}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {unit.active_tenancy?.tenant?.name ?? 'Belum ada tenant'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <a
                                    href={`/units/${unit.id}/qr`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center"
                                >
                                    Cetak QR
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(unit); }}
                                    className="py-2.5 min-h-[44px] rounded-lg text-xs font-medium text-red-600 bg-red-50 active:bg-red-100 transition-colors"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                    {units.data.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm font-medium text-gray-700">Belum ada unit ditemukan.</p>
                            <p className="text-xs text-gray-400 mt-1 mb-4">{hasFilter ? 'Coba ubah kata kunci atau reset filter.' : 'Klik Tambah Unit untuk data pertama.'}</p>
                            <Button onClick={openCreate} className="justify-center !py-3 min-h-[48px]">Tambah Unit</Button>
                        </div>
                    )}
                    <div className="bg-white rounded-xl border border-[#E2E5EA]">
                        <Pagination meta={units} links={units.links} />
                    </div>
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingUnit ? 'Edit Unit' : 'Tambah Unit'}
                subtitle={editingUnit ? editingUnit.unit_code : 'Lengkapi lokasi dan identitas unit'}
                icon={editingUnit ? <IconEdit className="w-4 h-4" /> : <IconPlus className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="unit-form" loading={processing} className="flex-1 justify-center">
                            {editingUnit ? 'Simpan Perubahan' : 'Tambah Unit'}
                        </Button>
                    </div>
                }
            >
                <form id="unit-form" onSubmit={submit}>
                    <FormSection variant="drawer" title="Lokasi Unit" description="Lantai, blok, dan nomor — kode tersusun otomatis">
                        {canPickBranch && (
                            <FormField compact label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </SelectInput>
                            </FormField>
                        )}
                        <div className="grid grid-cols-3 gap-2.5">
                            <FormField compact label="Lantai" error={errors.floor} required>
                                <TextInput value={data.floor} onChange={(e) => setData('floor', e.target.value)} placeholder="GF" />
                            </FormField>
                            <FormField compact label="Blok" error={errors.block}>
                                <TextInput value={data.block} onChange={(e) => setData('block', e.target.value)} placeholder="A" />
                            </FormField>
                            <FormField compact label="No. Unit" error={errors.unit_number} required>
                                <TextInput value={data.unit_number} onChange={(e) => setData('unit_number', e.target.value)} placeholder="01" />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Identitas & Status" description="Kode final, luas, dan keaktifan unit">
                        <FormField compact label="Kode Unit" error={errors.unit_code} hint="Otomatis dari Lantai-Blok-Nomor, bisa diedit manual.">
                            <TextInput value={data.unit_code} onChange={(e) => setData('unit_code', e.target.value)} />
                        </FormField>
                        <FormField compact label="Luas Unit (m²)" error={errors.size}>
                            <NumberInput step="0.01" value={data.size} onChange={(e) => setData('size', e.target.value)} />
                        </FormField>
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-gray-700">Status unit</span>
                            <Checkbox label={data.is_active ? 'Aktif' : 'Nonaktif'} checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        </div>
                    </FormSection>
                </form>
            </SlideOver>
        </AppLayout>
    );
}
