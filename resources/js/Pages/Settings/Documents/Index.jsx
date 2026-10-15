import AppLayout from '@/Layouts/AppLayout';
import { useForm } from '@inertiajs/react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

function UploadRow({ docKey, scope, record }) {
    const form = useForm({ key: docKey, branch_id: scope.id ?? '', file: null });

    const submit = (e) => {
        e.preventDefault();
        if (!form.data.file) return;
        form.post('/settings/documents', { forceFormData: true, preserveScroll: true });
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-gray-100 last:border-0">
            <div className="sm:w-44 shrink-0">
                <p className="text-sm font-medium text-gray-900">{scope.name}</p>
                {record ? (
                    <div className="mt-1">
                        <Badge color="green">Unggahan</Badge>
                        <p className="text-xs text-gray-500 mt-1 truncate" title={record.original_name}>{record.original_name}</p>
                        <p className="text-[11px] text-gray-400">{record.size_kb} KB · {record.uploaded_by ?? '—'} · {record.updated_at ?? '—'}</p>
                    </div>
                ) : (
                    <div className="mt-1">
                        <Badge color="gray">Bawaan</Badge>
                        <p className="text-[11px] text-gray-400 mt-1">Pakai template sistem</p>
                    </div>
                )}
            </div>
            <form onSubmit={submit} className="flex flex-1 items-center gap-2 min-w-0">
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
            </form>
            {form.errors.file && <p className="text-xs text-red-600">{form.errors.file}</p>}
        </div>
    );
}

export default function Index({ docs = [], branches = [], records = {} }) {
    const scopes = [{ id: null, name: 'Semua Branch' }, ...branches];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto">
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Dokumen Statis</h1>
                <p className="text-sm text-gray-500 mt-0.5 mb-5">
                    File unggahan dipakai saat tombol unduh diklik (docx tetap docx). Urutan: file branch → file semua branch → template bawaan.
                </p>
                <div className="space-y-4">
                    {docs.map((doc) => (
                        <div key={doc.key} className="bg-white rounded-xl border border-[#E2E5EA] p-4 sm:p-5">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h2 className="text-sm font-semibold text-gray-900">{doc.label}</h2>
                                <Badge color="blue">{doc.trigger}</Badge>
                            </div>
                            <div>
                                {scopes.map((scope) => (
                                    <UploadRow
                                        key={`${doc.key}-${scope.id ?? 'all'}`}
                                        docKey={doc.key}
                                        scope={scope}
                                        record={(records[`${doc.key}|${scope.id ?? 'all'}`] ?? [])[0] ?? null}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
