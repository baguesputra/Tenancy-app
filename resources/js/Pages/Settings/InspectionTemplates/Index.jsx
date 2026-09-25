import AppLayout from '@/Layouts/AppLayout';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import SlideOver from '@/Components/SlideOver';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Checkbox from '@/Components/Form/Checkbox';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import DataTable from '@/Components/DataTable';
import { IconClipboard, IconEdit } from '@/Components/Icons';

export default function Index({ templates = [], productCategories = [] }) {
    const { errors } = usePage().props;
    const [panelOpen, setPanelOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const { data, setData, put, processing, clearErrors } = useForm({
        name: '',
        is_active: true,
        product_category_ids: [],
    });

    const openEdit = (template) => {
        setEditing(template);
        setData({
            name: template.name,
            is_active: template.is_active,
            product_category_ids: (template.product_categories ?? []).map((c) => c.id),
        });
        clearErrors();
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setEditing(null);
        clearErrors();
    };

    const toggleCategory = (id) => {
        const ids = data.product_category_ids.map(String);
        setData(
            'product_category_ids',
            ids.includes(String(id))
                ? data.product_category_ids.filter((c) => String(c) !== String(id))
                : [...data.product_category_ids, id]
        );
    };

    const submit = (e) => {
        e.preventDefault();
        put(`/settings/inspection-templates/${editing.id}`, { preserveScroll: true, onSuccess: closePanel });
    };

    const columns = [
        { key: 'name', label: 'Template' },
        { key: 'categories', label: 'Berlaku Untuk' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '', className: 'w-20 text-right' },
    ];

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-7xl w-full mx-auto">
                <div className="mb-5">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Template Inspeksi</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Atur nama template dan kategori produk yang memakai tiap template</p>
                </div>

                <div className="hidden sm:block">
                <DataTable columns={columns}>
                    {templates.map((t) => (
                        <tr
                            key={t.id}
                            onClick={() => openEdit(t)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(t); } }}
                            tabIndex={0}
                            className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                editing?.id === t.id ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
                            }`}
                        >
                            <td className="px-5 py-3.5">
                                <p className="font-medium text-gray-900">{t.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{t.sections_count} section · {t.items_count} item</p>
                            </td>
                            <td className="px-5 py-3.5">
                                <span className="flex flex-wrap gap-1">
                                    {(t.product_categories ?? []).length === 0 && (
                                        <Badge color="gray">Tak dipakai tenant mana pun</Badge>
                                    )}
                                    {(t.product_categories ?? []).map((c) => (
                                        <Badge key={c.id} color="blue">{c.name}</Badge>
                                    ))}
                                </span>
                            </td>
                            <td className="px-5 py-3.5">
                                <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                <span aria-hidden="true" className="p-2 inline-flex items-center justify-center rounded-lg text-gray-300">
                                    <IconEdit className="w-4 h-4" />
                                </span>
                            </td>
                        </tr>
                    )                    )}
                </DataTable>
                </div>

                <div className="sm:hidden space-y-2.5">
                    {templates.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => openEdit(t)}
                            className="bg-white rounded-2xl border border-[#E2E5EA] p-4 shadow-sm active:bg-gray-50 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{t.sections_count} section · {t.items_count} item</p>
                                </div>
                                <Badge color={t.is_active ? 'green' : 'gray'} size="sm">{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                            </div>
                            {(t.product_categories ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(t.product_categories ?? []).map((c) => (
                                        <Badge key={c.id} color="blue" size="sm">{c.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="bg-white rounded-2xl border border-[#E2E5EA] px-5 py-12 text-center">
                            <p className="text-sm text-gray-400">Belum ada template.</p>
                        </div>
                    )}
                </div>
            </div>

            <SlideOver
                open={panelOpen}
                onClose={closePanel}
                title="Edit Template"
                subtitle={editing?.name}
                icon={<IconClipboard className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={closePanel} className="shrink-0">Batal</Button>
                        <Button type="submit" form="template-form" loading={processing} className="flex-1 justify-center">
                            Simpan Perubahan
                        </Button>
                    </div>
                }
            >
                <form id="template-form" onSubmit={submit}>
                    <FormSection variant="drawer" title="Identitas" description="Nama dan status template">
                        <FormField compact label="Nama Template" error={errors.name} required>
                            <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </FormField>
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-gray-700">Status template</span>
                            <Checkbox label={data.is_active ? 'Aktif' : 'Nonaktif'} checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />
                        </div>
                    </FormSection>

                    <FormSection variant="drawer" title="Berlaku Untuk" description="Kategori produk yang memakai template ini saat sidak">
                        <div className="grid grid-cols-1 gap-1">
                            {productCategories.map((c) => (
                                <Checkbox
                                    key={c.id}
                                    label={c.name}
                                    checked={data.product_category_ids.map(String).includes(String(c.id))}
                                    onChange={() => toggleCategory(c.id)}
                                />
                            ))}
                        </div>
                        {errors.product_category_ids && (
                            <p className="text-xs text-red-600 mt-1">{errors.product_category_ids}</p>
                        )}
                    </FormSection>
                </form>
            </SlideOver>
        </AppLayout>
    );
}
