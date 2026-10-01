import AppLayout from '@/Layouts/AppLayout';
import { Link, router, useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';

export default function Create({ loo = null, branches, tenantCategories, tenants }) {
    const isEdit = !!loo;

    const { data, setData, post, processing, errors } = useForm({
        branch_id: loo?.branch_id ?? '',
        tenant_id: loo?.tenant_id ?? '',
        tenant_category_id: loo?.tenant_category_id ?? '',
        prospective_tenant_name: loo?.prospective_tenant_name ?? '',
        loo_received_date: loo?.loo_received_date ?? '',
        loo_distributor: loo?.loo_distributor ?? '',
        cover_file: null,
        isi_file: null,
        loo_letter_file: null,
        loo_proposal_file: null,
    });

    const file = (name) => (e) => setData(name, e.target.files[0] ?? null);

    const submit = (e) => {
        e.preventDefault();
        isEdit
            ? post(`/loos/${loo.id}`, { forceFormData: true, preserveScroll: true })
            : post('/loos/store', { forceFormData: true });
    };

    const files = [
        { input: 'cover_file', column: 'cover_file_path', label: 'Cover LOO (PDF)', accept: '.pdf' },
        { input: 'isi_file', column: 'isi_file_path', label: 'Isi LOO (PDF)', accept: '.pdf' },
    ];

    const docs = [
        { input: 'loo_letter_file', column: 'loo_letter_file_path', label: 'File Surat LOO', accept: '.pdf,.jpg,.jpeg,.png' },
        { input: 'loo_proposal_file', column: 'loo_proposal_file_path', label: 'File Penawaran LOO', accept: '.pdf,.jpg,.jpeg,.png' },
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
                            <FormField label="Tenant Existing (opsional)" error={errors.tenant_id}>
                                <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                    <option value="">— Pilih tenant existing —</option>
                                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </SelectInput>
                                <p className="text-xs text-gray-500 mt-1">Kosongkan bila tenant masih prospektif.</p>
                            </FormField>
                            <FormField label="Kategori Tenant" error={errors.tenant_category_id}>
                                <SelectInput value={data.tenant_category_id} onChange={(e) => setData('tenant_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>

                        <FormField label="Nama Tenant Baru (prospektif)" error={errors.prospective_tenant_name}>
                            <TextInput
                                value={data.prospective_tenant_name}
                                onChange={(e) => setData('prospective_tenant_name', e.target.value)}
                                placeholder="Nama tenant baru jika belum ada di master"
                            />
                        </FormField>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <FormField label="Tgl Terima LOO" error={errors.loo_received_date}>
                                <DateInput value={data.loo_received_date} onChange={(e) => setData('loo_received_date', e.target.value)} />
                            </FormField>
                            <FormField label="Pendistribusi LOO" error={errors.loo_distributor}>
                                <TextInput value={data.loo_distributor} onChange={(e) => setData('loo_distributor', e.target.value)} />
                            </FormField>
                        </div>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {docs.map((f) => (
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
