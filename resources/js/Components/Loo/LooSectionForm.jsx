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
        case 'checklist_table':
            return <ChecklistTable field={field} value={value} onChange={onChange} />;
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

function ChecklistTable({ field, value, onChange, editableDepartments = null }) {
    const v = value ?? {};

    const isDeptEditable = (deptKey) => !editableDepartments || editableDepartments.includes(deptKey);

    const updateItem = (deptKey, itemKey, patch) => {
        const dept = v[deptKey] ?? {};
        const items = dept.items ?? {};
        onChange({
            ...v,
            [deptKey]: { ...dept, items: { ...items, [itemKey]: { ...(items[itemKey] ?? {}), ...patch } } },
        });
    };

    const updateSignoff = (deptKey, patch) => {
        const dept = v[deptKey] ?? {};
        onChange({ ...v, [deptKey]: { ...dept, signoff: { ...(dept.signoff ?? {}), ...patch } } });
    };

    const updateFooter = (patch) => onChange({ ...v, footer: { ...(v.footer ?? {}), ...patch } });

    return (
        <div className="space-y-4">
            {(field.departments ?? []).map((dept) => {
                const data = v[dept.key] ?? {};
                const signoff = data.signoff ?? {};
                const deptEditable = isDeptEditable(dept.key);
                return (
                    <div key={dept.key} inert={!deptEditable} className={`border border-[#E2E5EA] rounded-xl overflow-hidden ${deptEditable ? '' : 'opacity-70'}`}>
                        <p className="px-3 py-2 bg-gray-50 text-xs font-semibold text-[#0F1E36] uppercase tracking-wide flex items-center justify-between gap-2">
                            <span>{dept.label}</span>
                            {!deptEditable && <span className="normal-case font-medium text-gray-400">🔒 Lihat saja</span>}
                        </p>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                    <th className="px-3 py-2 font-medium">Uraian</th>
                                    <th className="px-2 py-2 font-medium text-center w-14">Ok</th>
                                    <th className="px-2 py-2 font-medium text-center w-16">Tidak</th>
                                    <th className="px-3 py-2 font-medium">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(dept.items ?? {}).map(([itemKey, label]) => {
                                    const item = data.items?.[itemKey] ?? {};
                                    const radio = `${field.name}-${dept.key}-${itemKey}`;
                                    return (
                                        <tr key={itemKey} className="border-b border-gray-100 last:border-0">
                                            <td className="px-3 py-2 text-gray-800">{label}</td>
                                            <td className="px-2 py-2 text-center">
                                                <input
                                                    type="radio"
                                                    name={radio}
                                                    checked={item.status === 'Ok'}
                                                    onChange={() => updateItem(dept.key, itemKey, { status: 'Ok' })}
                                                    className="h-4 w-4 accent-[#0F1E36]"
                                                    aria-label={`${label} Ok`}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <input
                                                    type="radio"
                                                    name={radio}
                                                    checked={item.status === 'Tidak'}
                                                    onChange={() => updateItem(dept.key, itemKey, { status: 'Tidak' })}
                                                    className="h-4 w-4 accent-red-500"
                                                    aria-label={`${label} Tidak`}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <TextInput
                                                    value={item.keterangan ?? ''}
                                                    onChange={(e) => updateItem(dept.key, itemKey, { keterangan: e.target.value })}
                                                    placeholder="Keterangan"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-3 py-2.5 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100">
                            <TextInput value={signoff.day ?? ''} onChange={(e) => updateSignoff(dept.key, { day: e.target.value })} placeholder="Hari" aria-label={`Diterima oleh hari ${dept.label}`} />
                            <DateInput value={signoff.date ?? ''} onChange={(e) => updateSignoff(dept.key, { date: e.target.value })} aria-label={`Diterima oleh tanggal ${dept.label}`} />
                            <TextInput value={signoff.name ?? ''} onChange={(e) => updateSignoff(dept.key, { name: e.target.value })} placeholder="Nama" aria-label={`Diterima oleh nama ${dept.label}`} />
                        </div>
                    </div>
                );
            })}

            <div inert={editableDepartments && editableDepartments.length === 0} className={`border border-[#E2E5EA] rounded-xl p-3 space-y-3 ${editableDepartments && editableDepartments.length === 0 ? 'opacity-70' : ''}`}>
                <p className="text-xs font-semibold text-[#0F1E36] uppercase tracking-wide">Mengetahui</p>
                <DateInput
                    value={v.footer?.date ?? ''}
                    onChange={(e) => updateFooter({ date: e.target.value })}
                    aria-label="Tanggal Mengetahui"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextInput
                        value={v.footer?.tenant_name ?? ''}
                        onChange={(e) => updateFooter({ tenant_name: e.target.value })}
                        placeholder="Pihak Penyewa"
                        aria-label="Nama Pihak Penyewa"
                    />
                    <TextInput
                        value={v.footer?.gm_name ?? ''}
                        onChange={(e) => updateFooter({ gm_name: e.target.value })}
                        placeholder="Deputy General Manager"
                        aria-label="Nama Deputy General Manager"
                    />
                </div>
            </div>
        </div>
    );
}

export default function LooSectionForm({ looId, sectionKey, config, section, options, submitting, onSubmit, readOnly = false, editableDepartments = null }) {
    const initial = section?.data ?? {};
    const [data, setData] = useState(initial);
    const [files, setFiles] = useState({});

    useEffect(() => setData(section?.data ?? {}), [section?.id]);

    // Kunci per field: TTD `signature_{dept}` hanya milik dept-nya;
    // field bersama ikut terkunci kalau user tak pegang dept manapun.
    const isFieldLocked = (field) => {
        if (readOnly) return true;
        if (!editableDepartments) return false;
        const m = field.name.match(/^signature_(legal|finance|tenancy|engineering|kontraktor)$/);
        if (m) return !editableDepartments.includes(m[1]);
        return editableDepartments.length === 0;
    };

    const wideTypes = ['textarea', 'repeater', 'group', 'checklist_table'];
    const spanClass = (field) => (wideTypes.includes(field.type) || field.type.startsWith('file') ? 'sm:col-span-2' : '');

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
                {(config.fields ?? []).map((field) => {
                    const locked = isFieldLocked(field);
                    return (
                        <div key={field.name} inert={locked} className={`${spanClass(field)} ${locked ? 'opacity-70' : ''}`}>
                            <FormField
                                label={field.label}
                                error={missingRequired.includes(field) ? 'Wajib diisi.' : null}
                                required={field.required}
                            >
                                {field.type === 'checklist_table' ? (
                                    <ChecklistTable
                                        field={field}
                                        value={data[field.name]}
                                        onChange={(v) => setValue(field.name, v)}
                                        editableDepartments={locked ? [] : editableDepartments}
                                    />
                                ) : (
                                    <Field field={field} value={data[field.name]} onChange={(v) => setValue(field.name, v)} options={options} />
                                )}
                            </FormField>
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" onClick={() => onSubmit({ data, files }, false)} loading={submitting}>
                        Simpan Draft
                    </Button>
                    <Button type="button" variant="success" onClick={() => onSubmit({ data, files }, true)} loading={submitting}>
                        Submit Section
                    </Button>
                </div>
            )}
        </div>
    );
}
