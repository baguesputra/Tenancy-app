import AppLayout from '@/Layouts/AppLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';
import Checkbox from '@/Components/Form/Checkbox';

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
    const [rows, setRows] = useState(
        attachments.map((a) => ({
            id: a.id,
            label: a.label,
            description: a.description ?? '',
            file: null,
            removed: false,
        }))
    );

    const file = (name) => (e) => setData(name, e.target.files[0] ?? null);

    const updateRow = (index, key, value) =>
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

    const addRow = () => setRows((prev) => [...prev, { id: null, label: null, description: '', file: null, removed: false }]);

    const toggleRemoved = (index) => updateRow(index, 'removed', !rows[index].removed);

    const submit = (e) => {
        e.preventDefault();

        // Baris kosong (tanpa file & tanpa id) tidak perlu dikirim.
        const kept = rows.filter((row) => !row.removed && (row.file || row.id));

        transform((form) => ({
            ...form,
            attachments: kept.map((row) => ({
                id: row.id ?? undefined,
                description: row.description || null,
                file: row.file ?? undefined,
            })),
            removed_attachments: rows.filter((row) => row.removed && row.id).map((row) => row.id),
        }));

        isEdit
            ? post(`/loos/${loo.id}`, { forceFormData: true, preserveScroll: true })
            : post('/loos/store', { forceFormData: true });
    };

    const files = [
        { input: 'cover_file', column: 'cover_file_path', label: 'Cover LOO (PDF)', accept: '.pdf' },
        { input: 'isi_file', column: 'isi_file_path', label: 'Isi LOO (PDF)', accept: '.pdf' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-3xl w-full mx-auto">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                    {isEdit ? `Edit ${loo.loo_number}` : 'Buat LOO Baru'}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                    Cover LOO hanya untuk internal divisi, Isi LOO untuk Legal + Accounting.
                </p>

                <form onSubmit={submit}>
                    <FormSection title="Informasi Dasar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField label="Tgl Terima LOO" error={errors.loo_received_date}>
                                <DateInput value={data.loo_received_date} onChange={(e) => setData('loo_received_date', e.target.value)} />
                            </FormField>
                        </div>

                        <div className="mt-4">
                            <Checkbox
                                label="Tenant sudah ada di master"
                                checked={hasExistingTenant}
                                onChange={(e) => {
                                    const on = e.target.checked;
                                    setHasExistingTenant(on);
                                    if (!on) setData('tenant_id', '');
                                }}
                            />
                        </div>

                        {hasExistingTenant && (
                            <FormField label="Pilih Tenant Existing" error={errors.tenant_id} className="mt-3">
                                <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                    <option value="">— Pilih tenant existing —</option>
                                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </SelectInput>
                            </FormField>
                        )}

                        <FormField label="Nama Tenant Baru (prospektif)" error={errors.prospective_tenant_name} className="mt-3">
                            <TextInput
                                value={data.prospective_tenant_name}
                                onChange={(e) => setData('prospective_tenant_name', e.target.value)}
                                placeholder="Nama tenant baru jika belum ada di master"
                            />
                        </FormField>
                    </FormSection>

                    <FormSection title="File LOO Utama">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {files.map((f) => (
                                <FormField key={f.input} label={f.label} error={errors[f.input]}>
                                    {isEdit && loo[f.column] && (
                                        <a
                                            href={`/loos/${loo.id}/files/${f.input}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-xs text-[#0F1E36] underline mb-1.5"
                                        >
                                            Lihat file saat ini
                                        </a>
                                    )}
                                    <FileInput accept={f.accept} maxSize={10240} onChange={file(f.input)} />
                                </FormField>
                            ))}
                        </div>
                    </FormSection>

                    <FormSection title="Dokumen Pendukung">
                        <p className="text-sm text-gray-500 mb-3">
                            Bisa unggah lebih dari satu file. Keterangan bersifat opsional.
                        </p>

                        <div className="space-y-3">
                            {rows.map((row, index) => (
                                <div
                                    key={row.id ?? `new-${index}`}
                                    className={`rounded-lg border p-3 ${row.removed ? 'border-red-200 bg-red-50/50 opacity-60' : 'border-gray-200'}`}
                                >
                                    {row.id && (
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-sm text-gray-700 truncate">{row.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleRemoved(index)}
                                                className="text-xs text-red-600 hover:text-red-700 shrink-0"
                                            >
                                                {row.removed ? 'Batalkan hapus' : 'Hapus'}
                                            </button>
                                        </div>
                                    )}

                                    {!row.removed && (
                                        <>
                                            <FormField label="Keterangan (opsional)">
                                                <TextInput
                                                    value={row.description}
                                                    onChange={(e) => updateRow(index, 'description', e.target.value)}
                                                    placeholder="mis. Surat LOO, NPWP, Denah"
                                                />
                                            </FormField>
                                            {!row.id && (
                                                <div className="mt-2">
                                                    <FileInput
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        maxSize={10240}
                                                        onChange={(e) => updateRow(index, 'file', e.target.files[0] ?? null)}
                                                    />
                                                    {row.file && (
                                                        <p className="text-xs text-gray-600 mt-1">{row.file.name}</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-3">
                            <Button type="button" variant="secondary" onClick={addRow}>+ Tambah file</Button>
                        </div>
                    </FormSection>

                    <div className="flex justify-end gap-2 mt-6">
                        <Link href={isEdit ? `/loos/${loo.id}` : '/loos'}>
                            <Button variant="secondary" type="button">Batal</Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="min-w-[140px]">
                            {isEdit ? 'Simpan Perubahan' : 'Simpan LOO'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}