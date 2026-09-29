import AppLayout from '@/Layouts/AppLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import SelectInput from '@/Components/Form/SelectInput';
import DateInput from '@/Components/Form/DateInput';
import Button from '@/Components/Form/Button';
import FileInput from '@/Components/Form/FileInput';

export default function Create({ branches, tenantCategories, marketings, tenants }) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        marketing_id: '',
        tenant_id: '',
        tenant_category_id: '',
        prospective_tenant_name: '',
        loo_received_date: '',
        loo_distributor: '',
        cover_file: null,
        isi_file: null,
        loo_letter_file: null,
        loo_proposal_file: null,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/loos/store', { forceFormData: true });
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-3xl w-full mx-auto">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Buat LOO Baru</h1>
                <p className="text-sm text-gray-500 mb-6">Isi informasi LOO dan upload file</p>

                <form onSubmit={submit}>
                    <FormSection title="Informasi Dasar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Cabang" error={errors.branch_id} required>
                                <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                                </SelectInput>
                            </FormField>
                            <FormField label="Marketing" error={errors.marketing_id} required>
                                <SelectInput value={data.marketing_id} onChange={(e) => setData('marketing_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {marketings.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <FormField label="Tenant Existing (opsional)" error={errors.tenant_id}>
                                <SelectInput value={data.tenant_id} onChange={(e) => setData('tenant_id', e.target.value)}>
                                    <option value="">— Pilih tenant existing —</option>
                                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </SelectInput>
                                <p className="text-xs text-gray-500 mt-1">Jika diisi, tenant baru tidak perlu diisi.</p>
                            </FormField>
                            <FormField label="Kategori Tenant" error={errors.tenant_category_id}>
                                <SelectInput value={data.tenant_category_id} onChange={(e) => setData('tenant_category_id', e.target.value)}>
                                    <option value="">Pilih...</option>
                                    {tenantCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </SelectInput>
                            </FormField>
                        </div>

                        <FormField label="Nama Tenant Baru (prospektif)" error={errors.prospective_tenant_name}>
                            <TextInput value={data.prospective_tenant_name} onChange={(e) => setData('prospective_tenant_name', e.target.value)} placeholder="Nama tenant baru jika belum ada di master" />
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

                    <FormSection title="File LOO (2 File Utama)">
                        <p className="text-sm text-gray-500 mb-4">Cover LOO untuk tenant, Isi LOO untuk internal (Legal + Accounting)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Cover LOO (PDF)" error={errors.cover_file}>
                                <FileInput accept=".pdf" maxSize={10240} onChange={(e) => setData('cover_file', e.target.files[0] ?? null)} />
                            </FormField>
                            <FormField label="Isi LOO (PDF)" error={errors.isi_file}>
                                <FileInput accept=".pdf" maxSize={10240} onChange={(e) => setData('isi_file', e.target.files[0] ?? null)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <FormSection title="Dokumen Pendukung">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="File Surat LOO" error={errors.loo_letter_file}>
                                <FileInput accept=".pdf,.jpg,.jpeg,.png" maxSize={10240} onChange={(e) => setData('loo_letter_file', e.target.files[0] ?? null)} />
                            </FormField>
                            <FormField label="File Penawaran LOO" error={errors.loo_proposal_file}>
                                <FileInput accept=".pdf,.jpg,.jpeg,.png" maxSize={10240} onChange={(e) => setData('loo_proposal_file', e.target.files[0] ?? null)} />
                            </FormField>
                        </div>
                    </FormSection>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => router.visit('/loos')}>Batal</Button>
                        <Button type="submit" disabled={processing} className="min-w-[140px]">
                            Simpan LOO
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}