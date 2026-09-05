import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import NumberInput from '@/Components/Form/NumberInput';
import SelectInput from '@/Components/Form/SelectInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';

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

    useEffect(() => {
        if (!codeManuallyEdited) {
            setData('unit_code', [data.floor, data.block, data.unit_number].filter(Boolean).join('-'));
        }
    }, [data.floor, data.block, data.unit_number]);

    const submit = (e) => {
        e.preventDefault();
        isEdit ? put(`/units/${unit.id}`) : post('/units');
    };

    return (
        <form onSubmit={submit} className="max-w-lg">
            <FormSection>
                {canPickBranch && (
                    <FormField label="Cabang" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                            <option value="">Pilih...</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </SelectInput>
                    </FormField>
                )}

                <div className="grid grid-cols-3 gap-3">
                    <FormField label="Lantai" error={errors.floor} required>
                        <TextInput value={data.floor} onChange={(e) => setData('floor', e.target.value)} placeholder="GF, 1" />
                    </FormField>
                    <FormField label="Blok" error={errors.block}>
                        <TextInput value={data.block} onChange={(e) => setData('block', e.target.value)} placeholder="A" />
                    </FormField>
                    <FormField label="No. Unit" error={errors.unit_number} required>
                        <TextInput value={data.unit_number} onChange={(e) => setData('unit_number', e.target.value)} placeholder="01" />
                    </FormField>
                </div>

                <FormField label="Kode Unit" error={errors.unit_code} hint="Otomatis dari Lantai-Blok-Nomor, bisa diedit manual.">
                    <TextInput
                        value={data.unit_code}
                        onChange={(e) => { setCodeManuallyEdited(true); setData('unit_code', e.target.value); }}
                    />
                </FormField>

                <FormField label="Luas Unit (m²)" error={errors.size}>
                    <NumberInput step="0.01" value={data.size} onChange={(e) => setData('size', e.target.value)} />
                </FormField>

                <Checkbox
                    label="Unit aktif"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    className="mt-2"
                />
            </FormSection>

            <Button type="submit" disabled={processing}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Unit'}
            </Button>
        </form>
    );
}