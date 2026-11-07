import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import NumberInput from '@/Components/Form/NumberInput';
import SelectInput from '@/Components/Form/SelectInput';
import MultiSelect from '@/Components/Form/MultiSelect';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import { IconPlus, IconEdit, IconTrash, IconQr } from '@/Components/Icons';
import useCan from '@/hooks/useCan';

function UnitChip({ code }) {
    return (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
            {code}
        </span>
    );
}

// Cermin dari UnitGroupNameService: rentang untuk nomor berurutan (A1-3),
// daftar eksplisit untuk yang berjarak (A2+A4+A6).
function suggestGroupName(units) {
    if (!units || units.length === 0) return '';

    const labelOf = (u) => {
        const number = (u.unit_number ?? '').trim();
        const prefix = (u.block ?? '').trim() || (u.floor ?? '').trim();
        return number ? `${prefix}${number}` : (u.unit_code ?? '');
    };

    let labels = units.map(labelOf);
    if (new Set(labels).size !== labels.length) {
        labels = units.map((u) => u.unit_code ?? '');
    }

    const buckets = new Map();
    const plain = [];

    labels.forEach((label) => {
        const match = label.match(/^(.*?)(\d+)$/);
        if (!match) {
            plain.push(label);
            return;
        }
        const [, prefix, digits] = match;
        if (!buckets.has(prefix)) buckets.set(prefix, []);
        buckets.get(prefix).push({ number: Number(digits), width: digits.length });
    });

    const segments = [...plain];

    [...buckets.keys()].sort().forEach((prefix) => {
        const items = buckets.get(prefix).sort((a, b) => a.number - b.number);
        let start = items[0].number;
        let prev = start;
        let width = items[0].width;

        const flush = () => {
            const pad = (n) => String(n).padStart(width, '0');
            segments.push(start === prev ? `${prefix}${pad(start)}` : `${prefix}${pad(start)}-${pad(prev)}`);
        };

        items.slice(1).forEach((item) => {
            if (item.number === prev + 1) {
                prev = item.number;
                return;
            }
            flush();
            start = prev = item.number;
            width = item.width;
        });

        flush();
    });

    return segments.join('+');
}

export default function Groups({ groups = [], units = [], branches = [], canPickBranch = false }) {
    const { can } = useCan();
    const canCreate = can('units.create');
    const canEdit = can('units.edit');
    const canDelete = can('units.delete');

    const [panelOpen, setPanelOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        branch_id: '',
        name: '',
        name_auto: true,
        code: '',
        size: '',
        is_active: true,
        unit_ids: [],
        primary_unit_id: '',
    });

    const openCreate = () => {
        setEditing(null);
        reset();
        clearErrors();
        setData('branch_id', canPickBranch ? '' : (branches[0]?.id ?? ''));
        setPanelOpen(true);
    };

    const openEdit = (group) => {
        if (!canEdit) return;
        setEditing(group);
        setData({
            branch_id: group.branch_id,
            name: group.name,
            name_auto: group.name_auto ?? false,
            code: group.code ?? '',
            size: group.size ?? '',
            is_active: group.is_active,
            unit_ids: (group.units ?? []).map((u) => String(u.id)),
            primary_unit_id: String(group.units?.find((u) => u.pivot?.is_primary)?.id ?? group.units?.[0]?.id ?? ''),
        });
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setEditing(null);
        reset();
        clearErrors();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: closePanel };
        editing ? put(`/unit-groups/${editing.id}`, options) : post('/unit-groups', options);
    };

    const confirmDeleteGroup = () => {
        if (!confirmDelete) return;
        setDeleting(true);
        router.delete(`/unit-groups/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setConfirmDelete(null);
            },
        });
    };

    // Unit yang boleh dipilih: belum masuk area lain (kecuali area yang sedang diedit).
    const availableUnits = useMemo(() => units.filter(
        (u) => !u.group_id || (editing && u.group_id === editing.id)
    ), [units, editing]);

    const branchUnits = useMemo(() => availableUnits.filter(
        (u) => !data.branch_id || String(u.branch_id) === String(data.branch_id)
    ), [availableUnits, data.branch_id]);

    const unitOptions = branchUnits.map((u) => ({
        value: String(u.id),
        label: `${u.unit_code} · Lt. ${u.floor}`,
    }));

    const selectedUnits = branchUnits.filter((u) => data.unit_ids.includes(String(u.id)));
    const totalSize = selectedUnits.reduce((sum, u) => sum + (Number(u.size) || 0), 0);

    // Tenant dengan minimal 2 unit layak dianggap satu paket: memilih satu unit
    // otomatis menarik seluruh unitnya, dan menghapus satu melepas semuanya.
    const tenantPackages = useMemo(() => {
        const byTenant = new Map();

        branchUnits.forEach((u) => {
            if (!u.tenant_id) return;
            const key = String(u.tenant_id);
            if (!byTenant.has(key)) {
                byTenant.set(key, { id: key, name: u.tenant_name ?? 'Tenant', units: [] });
            }
            byTenant.get(key).units.push(u);
        });

        return [...byTenant.values()]
            .filter((t) => t.units.length >= 2)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [branchUnits]);

    const packageFor = (unitId) => {
        const unit = branchUnits.find((u) => String(u.id) === String(unitId));
        if (!unit?.tenant_id) return [];

        const tenant = tenantPackages.find((t) => String(t.id) === String(unit.tenant_id));

        return tenant ? tenant.units.map((u) => String(u.id)) : [];
    };

    const resolvePackages = (next) => {
        const prev = data.unit_ids.map(String);
        const nextIds = [...new Set(next.map(String))];
        const nextSet = new Set(nextIds);
        const removed = prev.filter((id) => !nextSet.has(id));

        // Menghapus satu unit paket melepas seluruh unit tenant tersebut.
        if (removed.length > 0 && nextIds.length < prev.length) {
            let result = [...nextIds];

            removed.forEach((id) => {
                const pkg = packageFor(id);
                if (pkg.length < 2) return;
                const drop = new Set(pkg);
                result = result.filter((v) => !drop.has(v));
            });

            return result;
        }

        const result = [...nextIds];
        nextIds.forEach((id) => {
            const pkg = packageFor(id);
            if (pkg.length < 2) return;
            pkg.forEach((p) => {
                if (!result.includes(p)) result.push(p);
            });
        });

        return result;
    };

    const toggleUnit = (next) => {
        const resolved = resolvePackages(next);
        const nextUnits = branchUnits.filter((u) => resolved.includes(String(u.id)));
        const primaryUnitId = data.primary_unit_id && resolved.includes(String(data.primary_unit_id))
            ? data.primary_unit_id
            : (resolved[0] ?? '');

        setData((prev) => ({
            ...prev,
            unit_ids: resolved,
            primary_unit_id: primaryUnitId,
            name: prev.name_auto ? suggestGroupName(nextUnits) : prev.name,
        }));
    };

    const addTenantPackage = (tenantId) => {
        const tenant = tenantPackages.find((t) => String(t.id) === String(tenantId));
        if (!tenant) return;

        toggleUnit([
            ...new Set([
                ...data.unit_ids.map(String),
                ...tenant.units.map((u) => String(u.id)),
            ]),
        ]);
    };

    const toggleNameAuto = (enabled) => {
        setData((prev) => ({
            ...prev,
            name_auto: enabled,
            name: enabled ? suggestGroupName(selectedUnits) : prev.name,
        }));
    };

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <a href="/units" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-[#0F1E36]">
                            ← Master Unit
                        </a>
                        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Area Gabungan</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Beberapa unit fisik yang disewakan sebagai satu identitas dan satu kontrak.
                        </p>
                    </div>
                    {canCreate && (
                        <Button onClick={openCreate} iconLeft={<IconPlus className="h-4 w-4" />} className="min-h-[44px] !py-2.5">
                            Buat Area
                        </Button>
                    )}
                </div>

                {groups.length === 0 ? (
                    <div className="rounded-xl border border-[#E2E5EA] bg-white px-4 py-14 text-center">
                        <p className="text-sm font-medium text-slate-900">Belum ada area gabungan</p>
                        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                            Buat area gabungan saat satu tenant menyewa beberapa unit sekaligus dan memakai satu nama.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {groups.map((group) => (
                            <div key={group.id} className="rounded-xl border border-[#E2E5EA] bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${group.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {group.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {group.code ? `${group.code} · ` : ''}{group.branch?.name ?? '—'}
                                            {group.size ? ` · ${group.size} m²` : ''}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <a
                                            href={`/unit-groups/${group.id}/qr`}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Unduh QR area"
                                            aria-label={`Unduh QR ${group.name}`}
                                            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F1E36]"
                                        >
                                            <IconQr className="h-4 w-4" />
                                        </a>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => openEdit(group)}
                                                title="Edit area"
                                                aria-label={`Edit ${group.name}`}
                                                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F1E36]"
                                            >
                                                <IconEdit className="h-4 w-4" />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDelete(group)}
                                                title="Hapus area"
                                                aria-label={`Hapus ${group.name}`}
                                                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                            >
                                                <IconTrash className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {(group.units ?? []).map((unit) => (
                                        <UnitChip key={unit.id} code={unit.unit_code} />
                                    ))}
                                    {(group.units ?? []).length === 0 && (
                                        <span className="text-xs text-slate-400">Belum ada unit anggota.</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title={editing ? 'Edit Area Gabungan' : 'Buat Area Gabungan'}
                subtitle={editing ? editing.name : 'Gabungkan beberapa unit menjadi satu identitas'}
                icon={editing ? <IconEdit className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="unit-group-form" loading={processing} className="flex-1 justify-center">
                            {editing ? 'Simpan Perubahan' : 'Buat Area'}
                        </Button>
                    </div>
                }
            >
                <form id="unit-group-form" onSubmit={submit}>
                    <FormSection variant="drawer" title="Identitas Area" description="Nama resmi area dan cabangnya">
                        {canPickBranch && (
                            <FormField compact label="Cabang" error={errors.branch_id} required>
                                <SelectInput
                                    value={data.branch_id}
                                    onChange={(e) => {
                                        setData((prev) => ({
                                            ...prev,
                                            branch_id: e.target.value,
                                            unit_ids: [],
                                            primary_unit_id: '',
                                            name: prev.name_auto ? '' : prev.name,
                                        }));
                                    }}
                                >
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </SelectInput>
                            </FormField>
                        )}
                        <FormField
                            compact
                            label="Nama Area"
                            error={errors.name}
                            required={!data.name_auto}
                            hint={data.name_auto ? 'Dihitung otomatis dari unit anggota, mis. A1-3 atau A2+A4+A6.' : 'Nama manual tidak boleh bentrok dengan kode/nomor unit.'}
                        >
                            <TextInput
                                value={data.name}
                                readOnly={data.name_auto}
                                onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value, name_auto: false }))}
                                placeholder={data.name_auto ? 'Otomatis dari unit anggota' : 'mis. Kopi Senja 3-in-1'}
                                className={data.name_auto ? 'bg-slate-50 text-slate-500' : ''}
                            />
                        </FormField>
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-slate-700">Nama otomatis dari unit</span>
                            <Checkbox
                                label={data.name_auto ? 'Otomatis' : 'Manual'}
                                checked={data.name_auto}
                                onChange={(e) => toggleNameAuto(e.target.checked)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <FormField compact label="Kode Area" error={errors.code}>
                                <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="OPSIONAL" />
                            </FormField>
                            <FormField compact label="Luas (m²)" error={errors.size} hint="Kosongkan untuk menjumlah otomatis.">
                                <NumberInput step="0.01" value={data.size} onChange={(e) => setData('size', e.target.value)} placeholder={totalSize ? String(totalSize) : ''} />
                            </FormField>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-slate-700">Area aktif</span>
                            <Checkbox label={data.is_active ? 'Aktif' : 'Nonaktif'} checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Unit Anggota" description="Satu unit hanya boleh menjadi anggota satu area">
                        {tenantPackages.length > 0 && (
                            <FormField
                                compact
                                label="Pilih dari tenant"
                                hint="Hanya tenant dengan minimal 2 unit yang belum masuk area lain. Memilih tenant menarik seluruh unitnya."
                            >
                                <SelectInput value="" onChange={(e) => addTenantPackage(e.target.value)}>
                                    <option value="">Pilih tenant...</option>
                                    {tenantPackages.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {`${t.name} · ${t.units.map((u) => u.unit_code).join(', ')}`}
                                        </option>
                                    ))}
                                </SelectInput>
                            </FormField>
                        )}
                        <FormField compact label="Unit" error={errors.unit_ids} required>
                            <MultiSelect
                                value={data.unit_ids}
                                onChange={toggleUnit}
                                options={unitOptions}
                                placeholder="Pilih unit anggota..."
                            />
                        </FormField>
                        {selectedUnits.length > 0 && (
                            <div className="rounded-lg border border-[#E2E5EA] bg-slate-50/60 p-3">
                                <p className="text-xs font-medium text-slate-600">
                                    {selectedUnits.length} unit · total {totalSize ? `${totalSize} m²` : '—'}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedUnits.map((u) => <UnitChip key={u.id} code={u.unit_code} />)}
                                </div>
                            </div>
                        )}
                        <FormField compact label="Unit Primary" error={errors.primary_unit_id} hint="Kontrak dan QR area menempel ke unit ini.">
                            <SelectInput value={data.primary_unit_id} onChange={(e) => setData('primary_unit_id', e.target.value)}>
                                <option value="">Otomatis (unit pertama)</option>
                                {selectedUnits.map((u) => (
                                    <option key={u.id} value={u.id}>{u.unit_code}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                    </FormSection>
                </form>
            </SlideOver>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteGroup}
                loading={deleting}
                title="Hapus Area Gabungan?"
                confirmLabel="Ya, Hapus"
                confirmVariant="danger"
                note="Unit anggota dilepas dari area. Riwayat kontrak tetap tersimpan di tenancy."
            >
                <ConfirmRow label="Area" value={confirmDelete?.name} />
                <ConfirmRow label="Unit" value={(confirmDelete?.units ?? []).map((u) => u.unit_code).join(', ')} />
            </ConfirmModal>
        </AppLayout>
    );
}
