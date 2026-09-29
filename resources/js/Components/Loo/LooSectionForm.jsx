import { useEffect, useState } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import FileInput from '@/Components/Form/FileInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';

function Field({ field, value, error, onChange, options }) {
    const common = { error };

    switch (field.type) {
        case 'textarea':
            return <Textarea {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} />;
        case 'select':
            return (
                <SelectInput {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
                    <option value="">Pilih...</option>
                    {(field.options ?? []).map((o) => (
                        <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>
                    ))}
                </SelectInput>
            );
        case 'date':
            return <DateInput {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
        case 'time':
            return <TextInput {...common} type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
        case 'number':
            return <TextInput {...common} type="number" step={field.step ?? 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
        case 'email':
            return <TextInput {...common} type="email" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
        case 'checkbox':
            return <Checkbox {...common} label={field.label} checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
        case 'multiselect':
            return (
                <div className="flex flex-wrap gap-2">
                    {(options?.[field.source] ?? []).map((o) => {
                        const list = Array.isArray(value) ? value : [];
                        const on = list.includes(o.id);
                        return (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => onChange(on ? list.filter((v) => v !== o.id) : [...list, o.id])}
                                className={`px-2.5 py-1.5 rounded-full text-xs font-medium border ${on ? 'bg-[#0F1E36] text-white border-[#0F1E36]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                            >
                                {o.name}
                            </button>
                        );
                    })}
                </div>
            );
        case 'group':
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {field.fields.map((sub) => (
                        <FormField key={sub.name} label={sub.label} compact>
                            <TextInput
                                value={value?.[sub.name] ?? ''}
                                onChange={(e) => onChange({ ...(value ?? {}), [sub.name]: e.target.value })}
                            />
                        </FormField>
                    ))}
                </div>
            );
        case 'repeater':
            return <Repeater field={field} rows={value ?? []} onChange={onChange} />;
        case 'file':
            return <FileField field={field} value={value} onChange={onChange} />;
        case 'file_multiple':
            return <FileMultipleField field={field} value={value} onChange={onChange} />;
        default:
            return <TextInput {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    }
}

function FileField({ field, value, onChange }) {
    return (
        <div className="space-y-1.5">
            {value && (
                <a href={`/storage/${value}`} target="_blank" rel="noreferrer" className="block text-xs text-[#0F1E36] underline">
                    Lihat file saat ini
                </a>
            )}
            <FileInput accept={field.accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </div>
    );
}

function FileMultipleField({ field, value, onChange }) {
    const [previews, setPreviews] = useState(value ?? []);

    useEffect(() => setPreviews(value ?? []), [value]);

    return (
        <div className="space-y-2">
            {previews.length > 0 && (
                <ul className="space-y-1">
                    {previews.map((p, i) => (
                        <li key={p} className="flex items-center justify-between gap-2 text-xs">
                            <a href={`/storage/${p}`} target="_blank" rel="noreferrer" className="text-[#0F1E36] underline truncate">{p.split('/').pop()}</a>
                            <button type="button" className="text-red-500 shrink-0" onClick={() => onChange(previews.filter((_, j) => j !== i))}>Hapus</button>
                        </li>
                    ))}
                </ul>
            )}
            <FileInput
                multiple
                accept={field.accept}
                onChange={(e) => onChange([...previews, ...Array.from(e.target.files ?? [])])}
            />
        </div>
    );
}

function Repeater({ field, rows, onChange }) {
    const update = (idx, name, val) => {
        const next = [...rows];
        next[idx] = { ...next[idx], [name]: val };
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
                    {field.fields.map((sub) => (
                        <div key={sub.name} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                            <span className="text-xs text-gray-600">{sub.label}</span>
                            <div className="sm:col-span-2">
                                {sub.type === 'select' ? (
                                    <SelectInput value={row[sub.name] ?? ''} onChange={(e) => update(idx, sub.name, e.target.value)}>
                                        <option value="">Pilih...</option>
                                        {(sub.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                                    </SelectInput>
                                ) : sub.type === 'textarea' ? (
                                    <TextInput value={row[sub.name] ?? ''} onChange={(e) => update(idx, sub.name, e.target.value)} />
                                ) : sub.type === 'file' ? (
                                    <FileField field={sub} value={row[sub.name]} onChange={(v) => update(idx, sub.name, v)} />
                                ) : sub.type === 'checkbox' ? (
                                    <Checkbox label={sub.label} checked={!!row[sub.name]} onChange={(e) => update(idx, sub.name, e.target.checked)} />
                                ) : (
                                    <TextInput value={row[sub.name] ?? ''} onChange={(e) => update(idx, sub.name, e.target.value)} />
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" className="text-xs text-red-500" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>Hapus item</button>
                </div>
            ))}
            <Button type="button" variant="secondary" className="text-xs" onClick={() => onChange([...rows, {}])}>+ Tambah Item</Button>
        </div>
    );
}

export default function LooSectionForm({ looId, sectionKey, config, section, options, submitting, onSubmit }) {
    const initial = section?.data ?? {};
    const [data, setData] = useState(initial);
    const [files, setFiles] = useState({});

    useEffect(() => setData(section?.data ?? {}), [section?.id]);

    const setValue = (name, value) => {
        setData((prev) => ({ ...prev, [name]: value }));
        if (value instanceof File || Array.isArray(value) && value[0] instanceof File) {
            setFiles((prev) => ({ ...prev, [name]: value }));
        }
    };

    const missingRequired = (config.fields ?? []).filter(
        (f) => f.required && !f.type.match(/file|checkbox|repeater/) && !data[f.name]
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(config.fields ?? []).map((field) => (
                    <FormField
                        key={field.name}
                        label={field.label}
                        error={missingRequired.includes(field) ? 'Wajib diisi.' : null}
                        required={field.required}
                        className={field.type === 'textarea' || field.type === 'repeater' || field.type === 'group' || field.type.startsWith('file') ? 'sm:col-span-2' : ''}
                    >
                        <Field field={field} value={data[field.name]} onChange={(v) => setValue(field.name, v)} options={options} />
                    </FormField>
                ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button type="button" onClick={() => onSubmit({ data, files }, false)} loading={submitting}>
                    Simpan Draft
                </Button>
                <Button type="button" variant="success" onClick={() => onSubmit({ data, files }, true)} loading={submitting}>
                    Submit & Lanjut
                </Button>
            </div>
        </div>
    );
}
