import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import NumberInput from '@/Components/Form/NumberInput';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Pagination from '@/Components/Pagination';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import UnitQrModal from '@/Components/Master/UnitQrModal';
import { IconPlus, IconEdit, IconTrash, IconQr, IconDownload, IconDoor, IconSearch } from '@/Components/Icons';
import useCan from '@/hooks/useCan';

function StatusLabel({ unit }) {
    const map = !unit.is_active
        ? { dot: 'bg-slate-300', text: 'text-slate-400', label: 'Nonaktif' }
        : unit.is_occupied
            ? { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Terisi' }
            : { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Kosong' };

    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} aria-hidden="true" />
            <span className={map.text}>{map.label}</span>
        </span>
    );
}

function OccupancyMeter({ total, occupied, className = '' }) {
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span className="h-1 w-20 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-[11px] font-medium tabular-nums text-slate-500">{pct}%</span>
        </span>
    );
}

function SummaryStrip({ summary, activeStatus, onSelect }) {
    const cells = [
        { key: '', label: 'Total Unit', value: summary.total },
        { key: 'occupied', label: 'Terisi', value: summary.occupied },
        { key: 'vacant', label: 'Kosong', value: summary.vacant },
        { key: 'inactive', label: 'Nonaktif', value: summary.inactive },
    ];

    return (
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E2E5EA] bg-[#E2E5EA] sm:grid-cols-4">
            {cells.map((cell) => {
                const active = activeStatus === cell.key;
                return (
                    <button
                        key={cell.label}
                        type="button"
                        onClick={() => onSelect(cell.key)}
                        aria-pressed={active}
                        className={`px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36] ${active ? 'bg-slate-50 shadow-[inset_0_-2px_0_0_#0F1E36]' : 'bg-white hover:bg-slate-50/60'}`}
                    >
                        <span className={`block text-[11px] font-medium uppercase tracking-wider ${active ? 'text-[#0F1E36]' : 'text-slate-400'}`}>
                            {cell.label}
                        </span>
                        <span className={`mt-1 block text-xl font-semibold tabular-nums ${active ? 'text-[#0F1E36]' : 'text-slate-900'}`}>
                            {cell.value}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function UnitsEmpty({ filtered, onReset, onCreate, canCreate }) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E2E5EA] text-slate-400" aria-hidden="true">
                {filtered ? <IconSearch className="h-5 w-5" /> : <IconDoor className="h-5 w-5" />}
            </span>
            <p className="mt-3 text-sm font-medium text-slate-900">
                {filtered ? 'Tidak ada unit yang cocok' : 'Belum ada unit'}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                {filtered ? 'Ubah kata kunci atau reset filter untuk melihat unit lain.' : 'Tambahkan unit pertama untuk mulai mencatat okupansi.'}
            </p>
            {(filtered || canCreate) && (
                <button
                    type="button"
                    onClick={filtered ? onReset : onCreate}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-[#0F1E36] px-4 text-xs font-semibold text-[#0F1E36] transition-colors hover:bg-[#0F1E36] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36]"
                >
                    {filtered ? 'Reset filter' : 'Tambah Unit'}
                </button>
            )}
        </div>
    );
}

export default function Index({ units, summary = { total: 0, occupied: 0, vacant: 0, inactive: 0 }, floorSummary = [], filters = {}, floors = [], blocks = [], unitNumbers = [], branches, canPickBranch }) {
    const { can } = useCan();
    const canCreate = can('units.create');
    const canEdit = can('units.edit');
    const canDelete = can('units.delete');
    const canWrite = canCreate || canEdit;
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [qrUnit, setQrUnit] = useState(null);

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
        if (!canEdit) return;
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

    const askDelete = (unit) => setConfirmDelete(unit);

    const confirmDeleteUnit = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/units/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
            },
        });
    };

    const updateFilter = (key, value, resetKeys = []) => {
        const next = { ...filters, [key]: value || undefined };
        resetKeys.forEach((k) => { next[k] = undefined; });
        router.get('/units', next, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) updateFilter('search', searchText);
        }, 400);
        return () => clearTimeout(t);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasFilter = filters.search || filters.status || filters.floor || filters.block || filters.unit_number;
    const resetFilters = () => {
        setSearchText('');
        router.get('/units', {}, { preserveScroll: true, replace: true });
    };

    const qrParams = new URLSearchParams(
        Object.fromEntries(Object.entries({ search: filters.search, status: filters.status, floor: filters.floor, block: filters.block, unit_number: filters.unit_number }).filter(([, v]) => v))
    ).toString();
    const bulkQrHref = `/units-qr/bulk${qrParams ? `?${qrParams}` : ''}`;

    // Lantai sudah jadi header grup, jadi urutan baris dari server (floor, block, unit_number)
    // cukup dipotong per perubahan nilai floor.
    const groups = useMemo(() => {
        const result = [];
        units.data.forEach((unit) => {
            const last = result[result.length - 1];
            if (last && last.floor === unit.floor) last.items.push(unit);
            else result.push({ floor: unit.floor, items: [unit] });
        });
        return result;
    }, [units.data]);

    const floorStats = useMemo(() => Object.fromEntries(floorSummary.map((row) => [row.floor, row])), [floorSummary]);

    const statsFor = (group) => floorStats[group.floor] ?? {
        total: group.items.length,
        occupied: group.items.filter((u) => u.is_active && u.is_occupied).length,
        vacant: group.items.filter((u) => u.is_active && !u.is_occupied).length,
        inactive: group.items.filter((u) => !u.is_active).length,
    };

    const occupancyPct = summary.total > 0 ? Math.round((summary.occupied / summary.total) * 100) : 0;

    const renderActions = (unit) => (
        <div className="flex justify-end gap-1">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setQrUnit(unit); }}
                aria-label={`Pratinjau QR ${unit.unit_code}`}
                title="Pratinjau QR"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
            >
                <IconQr className="h-4 w-4" />
            </button>
            {canDelete && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); askDelete(unit); }}
                    aria-label={`Hapus ${unit.unit_code}`}
                    title="Hapus"
                    className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500"
                >
                    <IconTrash className="h-4 w-4" />
                </button>
            )}
        </div>
    );

    const renderLocation = (unit) => (
        <>
            <span className="block text-slate-700">
                {unit.block ? `Blok ${unit.block} · ` : ''}No. {unit.unit_number}
            </span>
            {canPickBranch && unit.branch?.name && (
                <span className="block text-[11px] text-slate-400">{unit.branch.name}</span>
            )}
        </>
    );

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Master Data</p>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Master Unit</h1>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <p className="text-sm text-slate-500">
                                {summary.total} unit · {summary.occupied} terisi · {summary.vacant} kosong
                            </p>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${occupancyPct}%` }} />
                                </span>
                                <span className="text-[11px] font-medium tabular-nums text-slate-500">{occupancyPct}% okupansi</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <a
                            href={bulkQrHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                                setExporting(true);
                                setTimeout(() => setExporting(false), 10000);
                            }}
                            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E5EA] bg-white px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${exporting ? 'pointer-events-none border-slate-100 bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <IconDownload className="h-4 w-4" aria-hidden="true" />
                            {exporting ? 'Menyiapkan PDF…' : 'Export QR'}
                        </a>
                        {canCreate && (
                            <Button onClick={openCreate} iconLeft={<IconPlus className="h-4 w-4" />} className="min-h-[44px] !py-2.5">
                                Tambah Unit
                            </Button>
                        )}
                    </div>
                </div>

                <SummaryStrip summary={summary} activeStatus={filters.status ?? ''} onSelect={(key) => updateFilter('status', key)} />

                <div className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white">
                    <div className="flex flex-col gap-2 border-b border-[#E2E5EA] p-2.5 sm:p-3 lg:flex-row">
                        <div className="relative flex-1">
                            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <TextInput
                                placeholder="Cari kode / nomor unit…"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="!pl-9"
                                aria-label="Cari unit"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <SelectInput
                                value={filters.floor ?? ''}
                                onChange={(e) => updateFilter('floor', e.target.value, ['block', 'unit_number'])}
                                className="lg:w-36"
                                aria-label="Filter lantai"
                            >
                                <option value="">Semua Lantai</option>
                                {floors.map((f) => <option key={f} value={f}>Lt. {f}</option>)}
                            </SelectInput>
                            <SelectInput
                                value={filters.block ?? ''}
                                onChange={(e) => updateFilter('block', e.target.value, ['unit_number'])}
                                className="lg:w-36"
                                aria-label="Filter blok"
                            >
                                <option value="">Semua Blok</option>
                                {blocks.map((b) => <option key={b} value={b}>Blok {b}</option>)}
                            </SelectInput>
                            <SelectInput
                                value={filters.unit_number ?? ''}
                                onChange={(e) => updateFilter('unit_number', e.target.value)}
                                className="lg:w-36"
                                aria-label="Filter nomor unit"
                            >
                                <option value="">Semua Nomor</option>
                                {unitNumbers.map((n) => <option key={n} value={n}>No. {n}</option>)}
                            </SelectInput>
                        </div>
                        {hasFilter && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full text-sm">
                            <caption className="sr-only">Daftar unit per lantai</caption>
                            <thead className="bg-slate-50">
                                <tr className="border-b border-[#E2E5EA]">
                                    <th scope="col" className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Kode Unit</th>
                                    <th scope="col" className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Lokasi</th>
                                    <th scope="col" className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Luas</th>
                                    <th scope="col" className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Tenant Saat Ini</th>
                                    <th scope="col" className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Status</th>
                                    <th scope="col" className="w-20 px-5 py-2.5"><span className="sr-only">Aksi</span></th>
                                </tr>
                            </thead>
                            {groups.map((group) => {
                                const stats = statsFor(group);
                                return (
                                    <tbody key={group.floor} className="divide-y divide-[#E2E5EA]">
                                        <tr className="bg-slate-50/70">
                                            <th scope="colgroup" colSpan={6} className="px-5 py-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Lantai {group.floor}</span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-[11px] tabular-nums text-slate-400">{stats.total} unit</span>
                                                        <OccupancyMeter total={stats.total} occupied={stats.occupied} />
                                                    </span>
                                                </div>
                                            </th>
                                        </tr>
                                        {group.items.map((unit) => (
                                            <tr
                                                key={unit.id}
                                                onClick={() => openEdit(unit)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(unit); } }}
                                                tabIndex={canEdit ? 0 : -1}
                                                className={`transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1E36] ${
                                                    editingUnit?.id === unit.id ? 'bg-[#0F1E36]/[0.04]' : canEdit ? 'cursor-pointer hover:bg-slate-50/70' : ''
                                                }`}
                                            >
                                                <td className="whitespace-nowrap px-5 py-3.5 font-medium tabular-nums text-slate-900">{unit.unit_code}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-sm">{renderLocation(unit)}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm tabular-nums text-slate-600">{unit.size ? `${unit.size} m²` : '—'}</td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600">{unit.active_tenancy?.tenant?.name ?? <span className="text-slate-300">—</span>}</td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right"><StatusLabel unit={unit} /></td>
                                                <td className="px-5 py-3.5">{renderActions(unit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                );
                            })}
                            {units.data.length === 0 && (
                                <tbody>
                                    <tr>
                                        <td colSpan={6}>
                                            <UnitsEmpty filtered={hasFilter} onReset={resetFilters} onCreate={openCreate} canCreate={canCreate} />
                                        </td>
                                    </tr>
                                </tbody>
                            )}
                        </table>
                    </div>

                    {units.last_page > 1 && (
                        <div className="hidden border-t border-[#E2E5EA] sm:block">
                            <Pagination meta={units} links={units.links} />
                        </div>
                    )}

                    <div className="divide-y divide-[#E2E5EA] sm:hidden">
                        {groups.map((group) => {
                            const stats = statsFor(group);
                            return (
                                <section key={group.floor}>
                                    <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-4 py-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Lantai {group.floor}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-[11px] tabular-nums text-slate-400">{stats.total} unit</span>
                                            <OccupancyMeter total={stats.total} occupied={stats.occupied} />
                                        </span>
                                    </div>
                                    {group.items.map((unit) => (
                                        <div
                                            key={unit.id}
                                            onClick={() => openEdit(unit)}
                                            className={`border-t border-[#E2E5EA] px-4 py-3.5 ${canEdit ? 'cursor-pointer hover:bg-slate-50/70 active:bg-slate-50' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold tabular-nums text-slate-900">{unit.unit_code}</p>
                                                <StatusLabel unit={unit} />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {renderLocation(unit)}
                                            </p>
                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                <p className="truncate text-xs text-slate-500">{unit.active_tenancy?.tenant?.name ?? 'Belum ada tenant'}</p>
                                                <span className="shrink-0 text-xs tabular-nums text-slate-400">{unit.size ? `${unit.size} m²` : '—'}</span>
                                            </div>
                                            <div className={`mt-3 grid gap-2 ${canDelete ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setQrUnit(unit); }}
                                                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E5EA] bg-white text-xs font-medium text-slate-700 transition-colors active:bg-slate-50"
                                                >
                                                    <IconQr className="h-4 w-4" aria-hidden="true" />
                                                    Cetak QR
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); askDelete(unit); }}
                                                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E5EA] bg-white text-xs font-medium text-red-600 transition-colors active:bg-red-50"
                                                    >
                                                        <IconTrash className="h-4 w-4" aria-hidden="true" />
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            );
                        })}
                        {units.data.length === 0 && (
                            <UnitsEmpty filtered={hasFilter} onReset={resetFilters} onCreate={openCreate} canCreate={canCreate} />
                        )}
                    </div>

                    {units.last_page > 1 && (
                        <div className="border-t border-[#E2E5EA] sm:hidden">
                            <Pagination meta={units} links={units.links} />
                        </div>
                    )}
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editingUnit ? 'Edit Unit' : 'Tambah Unit'}
                subtitle={editingUnit ? editingUnit.unit_code : 'Lengkapi lokasi dan identitas unit'}
                icon={editingUnit ? <IconEdit className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
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
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-slate-700">Status unit</span>
                            <Checkbox label={data.is_active ? 'Aktif' : 'Nonaktif'} checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        </div>
                    </FormSection>
                </form>
            </SlideOver>

            <UnitQrModal open={!!qrUnit} onClose={() => setQrUnit(null)} unit={qrUnit} />

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteUnit}
                loading={deleting}
                title="Hapus Unit?"
                confirmLabel="Ya, Hapus"
                confirmVariant="danger"
                note={confirmDelete?.active_tenancy?.tenant?.name
                    ? `Unit masih ditempati "${confirmDelete.active_tenancy.tenant.name}". Unit dengan riwayat tenancy akan ditolak server.`
                    : 'Unit terhapus permanen dan tidak bisa dibatalkan.'}
            >
                <ConfirmRow label="Kode" value={confirmDelete?.unit_code} />
                <ConfirmRow label="Tenant" value={confirmDelete?.active_tenancy?.tenant?.name} />
            </ConfirmModal>
        </AppLayout>
    );
}