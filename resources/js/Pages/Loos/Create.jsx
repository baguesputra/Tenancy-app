import AppLayout from '@/Layouts/AppLayout';
import { Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import SearchableSelect from '@/Components/Form/SearchableSelect';
import DateInput from '@/Components/Form/DateInput';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';
import Checkbox from '@/Components/Form/Checkbox';
import Badge from '@/Components/Badge';
import FilePreviewModal from '@/Components/Loo/FilePreviewModal';
import { formatBytes } from '@/utils/format';

const MAX_KB = 10240;

const ERROR_LABELS = {
    branch_id: 'Cabang',
    tenant_id: 'Tenant existing',
    prospective_tenant_name: 'Nama tenant baru',
    loo_received_date: 'Tanggal terima LOO',
    cover_file: 'Cover LOO',
    isi_file: 'Isi LOO',
    attachments: 'Dokumen pendukung',
    removed_attachments: 'Dokumen pendukung',
};

const ERROR_SECTION = {
    branch_id: 'info',
    tenant_id: 'info',
    prospective_tenant_name: 'info',
    loo_received_date: 'info',
    cover_file: 'files',
    isi_file: 'files',
    attachments: 'attach',
    removed_attachments: 'attach',
};

let rowCounter = 0;
const nextUid = () => `row-${++rowCounter}`;

export default function Create({ loo = null, branches, tenants, attachments = [] }) {
    const isEdit = !!loo;

    const { data, setData, post, processing, errors, transform } = useForm({
        branch_id: loo?.branch_id ?? '',
        tenant_id: loo?.tenant_id ?? '',
        prospective_tenant_name: loo?.prospective_tenant_name ?? '',
        loo_received_date: loo?.loo_received_date ?? '',
        cover_file: null,
        isi_file: null,
    });

    const [hasExistingTenant, setHasExistingTenant] = useState(!!loo?.tenant_id);
    const [rows, setRows] = useState(() => attachments.map((a) => ({
        uid: nextUid(),
        id: a.id,
        name: a.original_name,
        label: a.label,
        size: a.size ?? null,
        type: a.type ?? 'image',
        url: a.url,
        description: a.description ?? '',
        file: null,
        removed: false,
    })));
    const [preview, setPreview] = useState(null);

    const infoRef = useRef(null);
    const filesRef = useRef(null);
    const attachRef = useRef(null);
    const sectionRefs = { info: infoRef, files: filesRef, attach: attachRef };

    // Baris yang benar-benar dikirim: punya file baru atau file tersimpan.
    const kept = rows.filter((r) => !r.removed && (r.file || r.id));

    const hasCover = !!data.cover_file || !!loo?.cover_file_path;
    const hasIsi = !!data.isi_file || !!loo?.isi_file_path;
    const infoDone = !!data.branch_id && (!!data.tenant_id || !!data.prospective_tenant_name.trim());

    const setFile = (name) => (e) => setData(name, e.target.files[0] ?? null);

    const patchRow = (uid, patch) =>
        setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

    const addRow = () =>
        setRows((prev) => [...prev, { uid: nextUid(), id: null, name: null, label: null, size: null, type: 'image', url: null, description: '', file: null, removed: false }]);

    // Baris tersimpan → tandai hapus (masih bisa dibatalkan); baris baru → buang.
    const removeRow = (row) =>
        row.id ? patchRow(row.uid, { removed: true }) : setRows((prev) => prev.filter((r) => r.uid !== row.uid));

    const submit = (e) => {
        e.preventDefault();

        transform((form) => ({
            ...form,
            attachments: kept.map((r) => ({
                id: r.id ?? undefined,
                description: r.description || null,
                file: r.file ?? undefined,
            })),
            removed_attachments: rows.filter((r) => r.removed && r.id).map((r) => r.id),
        }));

        isEdit
            ? post(`/loos/${loo.id}`, { forceFormData: true, preserveScroll: true })
            : post('/loos/store', { forceFormData: true });
    };

    const jumpTo = (key) => sectionRefs[ERROR_SECTION[key]]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-8 sm:py-6">
                <header className="mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-semibold text-gray-900">
                            {isEdit ? `Edit ${loo.loo_number}` : 'Buat LOO Baru'}
                        </h1>
                        <Badge color={isEdit ? 'blue' : 'gray'}>{isEdit ? 'Perubahan header' : 'Draft baru'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        Cover LOO hanya untuk internal divisi, Isi LOO untuk Legal + Accounting. Tiap dokumen pendukung boleh diberi keterangan.
                    </p>
                </header>

                <form onSubmit={submit} noValidate aria-busy={processing}>
                    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
                        {/* Kolom kiri */}
                        <div>
                            {Object.keys(errors).length > 0 && <ErrorSummary errors={errors} onJump={jumpTo} />}

                            <div ref={infoRef}>
                                <FormSection title="Informasi Dasar & Tenant" description="Cabang dan calon tenant untuk LOO ini.">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <FormField label="Cabang" error={errors.branch_id} required id="loo-branch">
                                            <SelectInput
                                                id="loo-branch"
                                                name="branch_id"
                                                value={data.branch_id}
                                                onChange={(e) => setData('branch_id', e.target.value)}
                                            >
                                                <option value="">Pilih cabang…</option>
                                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                                            </SelectInput>
                                        </FormField>
                                        <FormField label="Tanggal Terima LOO" error={errors.loo_received_date} id="loo-received">
                                            <DateInput id="loo-received" name="loo_received_date" value={data.loo_received_date} onChange={(e) => setData('loo_received_date', e.target.value)} />
                                        </FormField>
                                    </div>

                                    <div className="mt-5 rounded-xl border border-[#E2E5EA] bg-gray-50/60 p-4">
                                        <Checkbox
                                            label="Tenant sudah ada di master"
                                            checked={hasExistingTenant}
                                            onChange={(e) => {
                                                const on = e.target.checked;
                                                setHasExistingTenant(on);
                                                if (!on) setData('tenant_id', '');
                                            }}
                                        />
                                        <p className="mt-1 pl-7 text-xs text-gray-500">
                                            Centang bila tenant sudah terdaftar. Jika belum, cukup isi nama tenant baru.
                                        </p>

                                        {hasExistingTenant && (
                                            <FormField label="Pilih tenant existing" error={errors.tenant_id} className="mt-4" hint="Nama tenant akan diambil dari master.">
                                                <SearchableSelect
                                                    name="tenant_id"
                                                    value={data.tenant_id}
                                                    onChange={(e) => setData('tenant_id', e.target.value)}
                                                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                                                    placeholder="Ketik untuk mencari tenant…"
                                                    error={errors.tenant_id}
                                                />
                                            </FormField>
                                        )}

                                        <FormField
                                            label="Nama Tenant Baru (prospektif)"
                                            error={errors.prospective_tenant_name}
                                            required={!hasExistingTenant}
                                            className="mt-4"
                                            id="loo-new-tenant"
                                            hint={hasExistingTenant
                                                ? 'Opsional — diisi bila ingin mencatat nama brand baru.'
                                                : 'Wajib diisi karena tenant belum ada di master.'}
                                        >
                                            <TextInput
                                                id="loo-new-tenant"
                                                name="prospective_tenant_name"
                                                value={data.prospective_tenant_name}
                                                onChange={(e) => setData('prospective_tenant_name', e.target.value)}
                                                placeholder="cth. Kopi Kenangan — Mall Lantai 1"
                                            />
                                        </FormField>
                                    </div>
                                </FormSection>
                            </div>

                            <div ref={filesRef}>
                                <FormSection title="File LOO Utama" description="Cover dan isi LOO (PDF, maks 10 MB).">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <FormField label="Cover LOO" error={errors.cover_file} id="loo-cover">
                                            <FileInput
                                                id="loo-cover"
                                                name="cover_file"
                                                accept=".pdf"
                                                maxSize={MAX_KB}
                                                onChange={setFile('cover_file')}
                                                currentFile={isEdit && loo.cover_file_path ? { name: 'Cover LOO', type: 'pdf', url: `/loos/${loo.id}/files/cover_file` } : null}
                                                onPreview={() => setPreview({ label: 'Cover LOO', url: `/loos/${loo.id}/files/cover_file`, type: 'pdf' })}
                                                onClear={() => setData('cover_file', null)}
                                            />
                                        </FormField>
                                        <FormField label="Isi LOO" error={errors.isi_file} id="loo-isi">
                                            <FileInput
                                                id="loo-isi"
                                                name="isi_file"
                                                accept=".pdf"
                                                maxSize={MAX_KB}
                                                onChange={setFile('isi_file')}
                                                currentFile={isEdit && loo.isi_file_path ? { name: 'Isi LOO', type: 'pdf', url: `/loos/${loo.id}/files/isi_file` } : null}
                                                onPreview={() => setPreview({ label: 'Isi LOO', url: `/loos/${loo.id}/files/isi_file`, type: 'pdf' })}
                                                onClear={() => setData('isi_file', null)}
                                            />
                                        </FormField>
                                    </div>
                                </FormSection>
                            </div>

                            <div ref={attachRef}>
                                <FormSection
                                    title="Dokumen Pendukung"
                                    description="Opsional. Bisa lebih dari satu file; keterangan per file juga opsional."
                                    action={kept.length > 0 ? <Badge color="gray" size="sm">{kept.length} dokumen</Badge> : null}
                                >
                                    {rows.length === 0 ? (
                                        <label
                                            htmlFor="loo-attach-empty"
                                            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-[#0F1E36] hover:bg-gray-100"
                                        >
                                            <input
                                                id="loo-attach-empty"
                                                type="file"
                                                className="sr-only"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (!f) return;
                                                    setRows([{ uid: nextUid(), id: null, name: null, label: null, size: null, type: 'image', url: null, description: '', file: f, removed: false }]);
                                                }}
                                            />
                                            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-400">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            </span>
                                            <span className="text-sm font-medium text-gray-700">Tambahkan dokumen pendukung</span>
                                            <span className="mt-1 text-xs text-gray-500">PDF, JPG, PNG · maks 10 MB per file</span>
                                        </label>
                                    ) : (
                                        <div className="space-y-3">
                                            {rows.map((row) => {
                                                const idx = kept.indexOf(row);
                                                const fileError = idx >= 0 ? errors[`attachments.${idx}.file`] : null;

                                                return (
                                                    <div
                                                        key={row.uid}
                                                        className={`rounded-xl border p-3 transition-colors ${row.removed ? 'border-red-200 bg-red-50/50' : 'border-[#E2E5EA] bg-white'}`}
                                                    >
                                                        {row.removed ? (
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-sm text-gray-500 line-through">{row.name ?? row.label}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => patchRow(row.uid, { removed: false })}
                                                                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#0F1E36] hover:bg-[#0F1E36]/10"
                                                                >
                                                                    Batalkan hapus
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {row.id ? (
                                                                    <div className="mb-3 flex items-center gap-3">
                                                                        <FileBadge type={row.type} />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-sm font-medium text-gray-900">{row.name ?? row.label}</p>
                                                                            <p className="text-xs text-gray-500">{row.size ? formatBytes(row.size) : 'File tersimpan'}</p>
                                                                        </div>
                                                                        {row.url && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPreview({ label: row.label ?? row.name, url: row.url, type: row.type })}
                                                                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                                                                            >
                                                                                Lihat
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeRow(row)}
                                                                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mb-3">
                                                                        <FileInput
                                                                            compact
                                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                                            maxSize={MAX_KB}
                                                                            file={row.file}
                                                                            error={fileError}
                                                                            onChange={(e) => patchRow(row.uid, { file: e.target.files?.[0] ?? null })}
                                                                            onClear={() => patchRow(row.uid, { file: null })}
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="flex items-end gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <label
                                                                            htmlFor={`attach-desc-${row.uid}`}
                                                                            className="mb-1 block text-xs font-medium text-gray-700"
                                                                        >
                                                                            Keterangan (opsional)
                                                                        </label>
                                                                        <TextInput
                                                                            id={`attach-desc-${row.uid}`}
                                                                            value={row.description}
                                                                            onChange={(e) => patchRow(row.uid, { description: e.target.value })}
                                                                            placeholder="cth. Surat LOO, NPWP, Denah"
                                                                        />
                                                                    </div>
                                                                    {!row.id && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeRow(row)}
                                                                            aria-label="Buang baris dokumen"
                                                                            className="mb-0.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                                                        >
                                                                            Hapus baris
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {rows.length > 0 && (
                                        <div className="mt-3">
                                            <Button type="button" variant="secondary" onClick={addRow}>
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                Tambah file
                                            </Button>
                                        </div>
                                    )}
                                </FormSection>
                            </div>

                            {/* Aksi: sticky di layar kecil agar selalu terjangkau */}
                            <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-[#E2E5EA] bg-[#F7F8FA]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
                                <div className="flex justify-end gap-2">
                                    <Link href={isEdit ? `/loos/${loo.id}` : '/loos'}>
                                        <Button variant="secondary" type="button">Batal</Button>
                                    </Link>
                                    <Button type="submit" loading={processing} className="min-w-[150px]">
                                        {isEdit ? 'Simpan Perubahan' : 'Simpan LOO'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Kolom kanan: peta form */}
                        <FormMap infoDone={infoDone} hasCover={hasCover} hasIsi={hasIsi} attachCount={kept.length} isEdit={isEdit} />
                    </div>
                </form>

                <FilePreviewModal
                    open={!!preview}
                    onClose={() => setPreview(null)}
                    label={preview?.label ?? ''}
                    url={preview?.url ?? ''}
                    type={preview?.type ?? 'pdf'}
                />
            </div>
        </AppLayout>
    );
}

function FileBadge({ type = 'image' }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F1E36]/5 text-[#0F1E36]">
            {type === 'pdf' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V6A1.5 1.5 0 0020.25 4.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                </svg>
            )}
        </span>
    );
}

function MapRow({ label, state, detail }) {
    const tone = state === 'done'
        ? 'bg-emerald-100 text-emerald-600'
        : state === 'optional' ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600';

    return (
        <li className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                {state === 'done' ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800">{label}</span>
                {detail && <span className="block text-[11px] text-gray-500">{detail}</span>}
            </span>
        </li>
    );
}

function FormMap({ infoDone, hasCover, hasIsi, attachCount, isEdit }) {
    return (
        <aside className="lg:sticky lg:top-[72px]" aria-label="Peta form">
            <div className="rounded-2xl border border-[#E2E5EA] bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Peta Form</p>
                <ul className="space-y-3.5">
                    <MapRow label="Informasi & Tenant" state={infoDone ? 'done' : 'pending'} detail={infoDone ? 'Lengkap' : 'Pilih cabang & tenant'} />
                    <MapRow label="File LOO Utama" state={hasCover && hasIsi ? 'done' : 'pending'} detail={`Cover ${hasCover ? '✓' : '—'} · Isi ${hasIsi ? '✓' : '—'}`} />
                    <MapRow label="Dokumen Pendukung" state={attachCount > 0 ? 'done' : 'optional'} detail={attachCount > 0 ? `${attachCount} dokumen` : 'Opsional'} />
                </ul>
                <div className="mt-4 border-t border-[#E2E5EA] pt-3">
                    <p className="text-[11px] leading-relaxed text-gray-500">
                        File LOO Utama boleh ditambahkan menyusul bila belum tersedia. {isEdit ? 'Perubahan header tidak mengubah tahap LOO.' : 'LOO tersimpan sebagai draft dan menunggu pengisian divisi.'}
                    </p>
                </div>
            </div>
        </aside>
    );
}

function ErrorSummary({ errors, onJump }) {
    const boxRef = useRef(null);
    const entries = Object.entries(errors);

    useEffect(() => {
        boxRef.current?.focus();
        boxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    return (
        <div
            ref={boxRef}
            tabIndex={-1}
            role="alert"
            aria-label="Ringkasan kesalahan input"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
        >
            <p className="mb-1 font-medium">Ada {entries.length} input yang perlu diperbaiki:</p>
            <ul className="list-inside list-disc space-y-0.5">
                {entries.map(([key, message]) => {
                    const base = key.split('.')[0];
                    return (
                        <li key={key}>
                            <button
                                type="button"
                                onClick={() => onJump(base)}
                                className="rounded underline underline-offset-2 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-red-400"
                            >
                                {ERROR_LABELS[base] ?? base}: {message}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}