import { useEffect, useState } from 'react';
import Badge from '@/Components/Badge';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import SearchableSelect from '@/Components/Form/SearchableSelect';
import DateInput from '@/Components/Form/DateInput';
import FileInput from '@/Components/Form/FileInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';

function Field({ field, value, error, onChange, options, looId }) {
    const common = { error };
    const sourceOptions = field.source ? (options?.[field.source] ?? []) : null;

    switch (field.type) {
        case 'textarea':
            return <Textarea {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} />;
        case 'select':
            return (
                <SelectInput {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
                    <option value="">Pilih...</option>
                    {sourceOptions
                        ? sourceOptions.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))
                        : (field.options ?? []).map((o) => (
                            <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>
                        ))}
                </SelectInput>
            );
        case 'searchable_select':
            return (
                <SearchableSelect
                    {...common}
                    value={value ?? ''}
                    options={(sourceOptions ?? []).map((o) => ({ value: o.id, label: o.name }))}
                    onChange={(e) => onChange(e.target.value)}
                    fetchOptions={field.source === 'units' && looId
                        ? async (q) => {
                            const res = await fetch(`/loos/${looId}/units?search=${encodeURIComponent(q)}`, {
                                headers: { Accept: 'application/json' },
                            });
                            if (!res.ok) return [];
                            return (await res.json()).map((o) => ({ value: o.id, label: o.name }));
                        }
                        : null}
                />
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
            <FileInput accept={field.accept} maxSize={(field.max_kb ?? 0) * 1024} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
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

function ChecklistTable({ field, value, onChange, editableDepartments = null, signatures = {}, signatureValues = {}, onSignatureChange = null, idPrefix = '', focusMode = false }) {
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
                const sig = signatures[dept.key];
                const sigValue = signatureValues[dept.key];
                const blockId = idPrefix !== '' ? `${idPrefix}-${dept.key}` : null;
                const focusFirstControl = () => {
                    if (!blockId) return;
                    const el = document.getElementById(blockId);
                    if (!el) return;
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.setTimeout(() => {
                        el.querySelector('input, textarea, select')?.focus({ preventScroll: true });
                    }, 450);
                };
                return (
                    <div
                        key={dept.key}
                        id={blockId ?? undefined}
                        inert={!deptEditable}
                        className={`border border-[#E2E5EA] rounded-xl overflow-hidden scroll-mt-24 ${deptEditable
                            ? ''
                            : `opacity-70 grayscale cursor-not-allowed${focusMode ? ' opacity-40' : ''}`}`}
                    >
                        <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide flex items-center justify-between gap-2 border-b ${deptEditable ? 'bg-emerald-50 text-emerald-900 border-emerald-100' : 'bg-gray-50 text-[#0F1E36] border-gray-100'}`}>
                            <span>{dept.label}</span>
                            {deptEditable
                                ? (
                                    <span className="flex items-center gap-2">
                                        <Badge color="green" size="sm">Dapat diisi</Badge>
                                        <button
                                            type="button"
                                            onClick={focusFirstControl}
                                            className="normal-case font-medium text-xs text-emerald-700 hover:text-emerald-900 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                                        >
                                            Isi sekarang ↓
                                        </button>
                                    </span>
                                )
                                : (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <Badge color="gray" size="sm">Lihat saja</Badge>
                                    </span>
                                )}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_230px]">
                            <div className="min-w-0">
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
                            {sig && onSignatureChange && (
                                <div className="border-t lg:border-t-0 lg:border-l border-gray-100 p-3 bg-gray-50/50 space-y-2">
                                    <p className="text-[11px] font-semibold text-[#0F1E36] uppercase tracking-wide">Tanda tangan</p>
                                    {typeof sigValue === 'string' && sigValue !== '' && (
                                        <a href={`/storage/${sigValue}`} target="_blank" rel="noreferrer" className="block text-xs text-[#0F1E36] underline truncate">
                                            Lihat file saat ini
                                        </a>
                                    )}
                                    <label className="block cursor-pointer">
                                        <input
                                            type="file"
                                            className="sr-only"
                                            accept={sig.accept}
                                            onChange={(e) => onSignatureChange(dept.key, e.target.files?.[0] ?? null)}
                                        />
                                        <span className="flex items-center justify-center gap-1.5 px-3 min-h-9 rounded-lg border border-dashed border-gray-300 bg-white text-xs font-medium text-gray-600 hover:border-[#0F1E36] hover:text-[#0F1E36] transition-colors">
                                            {sigValue ? 'Ganti file' : 'Upload file'}
                                        </span>
                                    </label>
                                    <p className="text-[11px] text-gray-400">PNG/JPG</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {field.show_footer !== false && (
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
            )}
        </div>
    );
}

/**
 * Tampilan nilai read-only (tanpa input) untuk sebagian field section —
 * dipakai mis. role tenant yang boleh melihat data badan hukum Legal tapi
 * tidak boleh mengisi. Link file tetap bisa diklik.
 */
function PreviewField({ field, value }) {
    if (field.type === 'file') {
        return (
            <FormField label={field.label}>
                {value
                    ? <a href={`/storage/${value}`} target="_blank" rel="noreferrer" className="text-sm text-[#0F1E36] underline">Lihat file</a>
                    : <span className="text-sm text-gray-400">—</span>}
            </FormField>
        );
    }

    if (field.type === 'file_multiple') {
        const list = Array.isArray(value) ? value : [];
        return (
            <FormField label={field.label}>
                {list.length
                    ? (
                        <ul className="space-y-1">
                            {list.map((p) => (
                                <li key={p}>
                                    <a href={`/storage/${p}`} target="_blank" rel="noreferrer" className="text-sm text-[#0F1E36] underline">{p.split('/').pop()}</a>
                                </li>
                            ))}
                        </ul>
                    )
                    : <span className="text-sm text-gray-400">—</span>}
            </FormField>
        );
    }

    if (field.type === 'checkbox') {
        return <FormField label={field.label}><span className="text-sm text-gray-900">{value ? 'Ya' : 'Tidak'}</span></FormField>;
    }

    if (field.type === 'select') {
        const label = value == null || value === '' ? '—' : String(value).replaceAll('_', ' ');
        return <FormField label={field.label}><span className="text-sm text-gray-900">{label}</span></FormField>;
    }

    const text = value == null || value === '' ? '—' : String(value);
    return <FormField label={field.label}><span className="text-sm text-gray-900 whitespace-pre-line">{text}</span></FormField>;
}

export default function LooSectionForm({ looId, sectionKey, config, section, options, submitting, onSubmit, readOnly = false, editableDepartments = null, focusMode = false, previewFields = null }) {
    const initial = section?.data ?? {};
    const [data, setData] = useState(initial);
    const [files, setFiles] = useState({});

    useEffect(() => setData(section?.data ?? {}), [section?.id]);

    // Mode preview: hanya field terpilih, tampil sebagai nilai statis.
    if (Array.isArray(previewFields)) {
        const previewList = (config.fields ?? []).filter((f) => previewFields.includes(f.name));
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {previewList.map((field) => (
                    <PreviewField key={field.name} field={field} value={initial[field.name]} />
                ))}
            </div>
        );
    }

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

    // TTD per departemen dirender di dalam blok dept masing-masing
    // (panel kanan), bukan sebagai field terpisah di bawah.
    const DEPT_SIG_RE = /^signature_(legal|finance|tenancy|engineering|kontraktor)$/;
    const hasChecklistTable = (config.fields ?? []).some((f) => f.type === 'checklist_table');
    const deptSignatures = {};
    (config.fields ?? []).forEach((f) => {
        if (hasChecklistTable && DEPT_SIG_RE.test(f.name)) {
            deptSignatures[f.name.replace('signature_', '')] = f;
        }
    });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(config.fields ?? []).map((field) => {
                    if (hasChecklistTable && DEPT_SIG_RE.test(field.name)) return null;
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
                                        signatures={deptSignatures}
                                        signatureValues={Object.fromEntries(
                                            Object.keys(deptSignatures).map((k) => [k, data[`signature_${k}`]])
                                        )}
                                        onSignatureChange={(deptKey, file) => setValue(`signature_${deptKey}`, file)}
                                        idPrefix={sectionKey}
                                        focusMode={focusMode}
                                    />
                                ) : (
                                    <Field field={field} value={data[field.name]} onChange={(v) => setValue(field.name, v)} options={options} looId={looId} />
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
