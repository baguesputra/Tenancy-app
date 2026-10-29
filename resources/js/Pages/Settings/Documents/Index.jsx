import SettingsLayout from '@/Layouts/SettingsLayout';
import { useForm } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import PageHeader from '@/Components/Settings/PageHeader';

function UploadRow({ docKey, scope, record }) {
    const form = useForm({ key: docKey, branch_id: scope.id ?? '', file: null });

    const submit = (e) => {
        e.preventDefault();
        if (!form.data.file) return;
        form.post('/settings/documents', { forceFormData: true, preserveScroll: true });
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <div className="sm:w-52 shrink-0">
                <p className="text-sm font-medium text-gray-900">{scope.name}</p>
                {record ? (
                    <div className="mt-1.5">
                        <Badge color="green">Unggahan</Badge>
                        <p className="text-xs text-gray-700 mt-1.5 truncate font-medium" title={record.original_name}>{record.original_name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{record.size_kb} KB · {record.uploaded_by ?? '—'} · {record.updated_at ?? '—'}</p>
                    </div>
                ) : (
                    <div className="mt-1.5">
                        <Badge color="gray">Bawaan</Badge>
                        <p className="text-[11px] text-gray-400 mt-1.5">Pakai template sistem</p>
                    </div>
                )}
            </div>
            <form onSubmit={submit} className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    aria-label={`File ${scope.name}`}
                    onChange={(e) => form.setData('file', e.target.files[0] ?? null)}
                    className="flex-1 min-w-0 text-xs text-gray-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-200 file:bg-white file:text-xs file:font-medium file:text-gray-700 hover:file:border-gray-300"
                />
                <Button type="submit" loading={form.processing} disabled={!form.data.file} className="!px-3 !py-2 text-xs shrink-0">
                    {record ? 'Ganti' : 'Upload'}
                </Button>
                {form.errors.file && <p className="text-xs text-red-600">{form.errors.file}</p>}
            </form>
        </div>
    );
}

export default function Index({ docs = [], branches = [], records = {} }) {
    const scopes = [{ id: null, name: 'Semua Branch' }, ...branches];

    return (
        <SettingsLayout>
            <div>
                <PageHeader
                    title="Dokumen Statis"
                    description="File unggahan dipakai saat tombol unduh diklik (docx tetap docx). Urutan: file branch → file semua branch → template bawaan."
                />
                {docs.length === 0 ? (
                    <EmptyState
                        variant="data"
                        title="Belum ada dokumen"
                        description="Daftar dokumen statis akan muncul di sini setelah dikonfigurasi."
                    />
                ) : (
                    <div className="space-y-4">
                        {docs.map((doc) => (
                            <section key={doc.key} className="rounded-xl border border-[#E2E5EA] bg-white p-4 sm:p-5">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-gray-900">{doc.label}</h3>
                                    <Badge color="blue">{doc.trigger}</Badge>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {scopes.map((scope) => (
                                        <UploadRow
                                            key={`${doc.key}-${scope.id ?? 'all'}`}
                                            docKey={doc.key}
                                            scope={scope}
                                            record={(records[`${doc.key}|${scope.id ?? 'all'}`] ?? [])[0] ?? null}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </SettingsLayout>
    );
}
