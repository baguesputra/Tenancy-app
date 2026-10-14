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
import { IconClipboard, IconEdit } from '@/Components/Icons';

const scopeLabel = (section) => {
    const cats = section.scope_product_categories;
    let cat = 'Semua kategori';
    if (Array.isArray(cats)) {
        cat = cats.length === 1 && cats[0] === 'F&B' ? 'F&B' : `Non-F&B (${cats.length} kategori)`;
    }
    const floor = section.floor_scope === 'ground_only'
        ? ' · GF saja'
        : section.floor_scope === 'non_ground' ? ' · di luar GF' : '';
    return cat + floor;
};

export default function Index({ templates = [], productCategories = [] }) {
    const { errors } = usePage().props;
    const [openSections, setOpenSections] = useState({});
    const [tplPanel, setTplPanel] = useState(false);
    const [itemPanel, setItemPanel] = useState(false);

    const tplForm = useForm({ id: null, name: '', is_active: true });
    const itemForm = useForm({ id: null, label: '', type: 'binary_choice', option_positive: '', option_negative: '' });

    const toggleSection = (id) => setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

    const openTplEdit = (template) => {
        tplForm.setData({ id: template.id, name: template.name, is_active: template.is_active });
        tplForm.clearErrors();
        setTplPanel(true);
    };

    const openItemEdit = (item) => {
        itemForm.setData({
            id: item.id,
            label: item.label,
            type: item.type,
            option_positive: item.option_positive ?? '',
            option_negative: item.option_negative ?? '',
        });
        itemForm.clearErrors();
        setItemPanel(true);
    };

    const submitTpl = (e) => {
        e.preventDefault();
        tplForm.put(`/settings/inspection-templates/${tplForm.data.id}`, {
            preserveScroll: true,
            onSuccess: () => setTplPanel(false),
        });
    };

    const submitItem = (e) => {
        e.preventDefault();
        itemForm.put(`/settings/inspection-items/${itemForm.data.id}`, {
            preserveScroll: true,
            onSuccess: () => setItemPanel(false),
        });
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 max-w-5xl w-full mx-auto">
                <div className="mb-5">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Form Sidak</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Satu form untuk semua tenant — section menyesuaikan kategori produk & lantai unit</p>
                </div>

                {templates.length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-8 text-center">
                        <p className="text-sm font-semibold text-red-800">Tidak ada template aktif — sidak tidak bisa dibuat.</p>
                        <p className="text-xs text-red-600 mt-1">Aktifkan kembali template lewat seeder atau database.</p>
                    </div>
                )}

                {templates.map((t) => (
                    <div key={t.id} className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm mb-4 overflow-hidden">
                        <div className="p-4 sm:p-5 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base font-semibold text-gray-900">{t.name}</h2>
                                    <Badge color="green" size="sm">Aktif</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(t.product_categories ?? []).map((c) => (
                                        <Badge key={c.id} color="blue" size="sm">{c.name}</Badge>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openTplEdit(t)}
                                aria-label="Edit template"
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <IconEdit className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="border-t border-gray-100">
                            {(t.sections ?? []).map((s) => {
                                const open = !!openSections[s.id];
                                const count = (s.items ?? []).length;
                                return (
                                    <div key={s.id} className="border-b border-gray-100 last:border-0">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(s.id)}
                                            aria-expanded={open}
                                            className="w-full flex items-center gap-2.5 px-4 sm:px-5 py-3 text-left hover:bg-gray-50/70 transition-colors min-h-[52px]"
                                        >
                                            <span className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">▶</span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-medium text-gray-800 truncate">{s.name}</span>
                                                <span className="block text-[11px] text-gray-400 mt-0.5">{scopeLabel(s)} · {count} item</span>
                                            </span>
                                        </button>
                                        {open && (
                                            <ul className="px-4 sm:px-5 pb-3 space-y-1">
                                                {(s.items ?? []).map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-gray-50 group"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] text-gray-800 truncate">{item.label}</p>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                                {item.type === 'binary_choice'
                                                                    ? `${item.option_positive ?? '—'} / ${item.option_negative ?? '—'}`
                                                                    : 'Teks bebas'}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => openItemEdit(item)}
                                                            aria-label={`Edit item ${item.label}`}
                                                            className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 shrink-0 opacity-0 max-sm:opacity-100 group-hover:opacity-100 focus:opacity-100 transition-opacity min-h-[40px] min-w-[40px] flex items-center justify-center"
                                                        >
                                                            <IconEdit className="w-3.5 h-3.5" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <SlideOver
                open={tplPanel}
                onClose={() => setTplPanel(false)}
                title="Edit Template"
                subtitle={tplForm.data.name}
                icon={<IconClipboard className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setTplPanel(false)} className="shrink-0">Batal</Button>
                        <Button type="submit" form="template-form" loading={tplForm.processing} className="flex-1 justify-center">
                            Simpan Perubahan
                        </Button>
                    </div>
                }
            >
                <form id="template-form" onSubmit={submitTpl}>
                    <FormSection variant="drawer" title="Identitas" description="Nama dan status template">
                        <FormField compact label="Nama Template" error={errors.name} required>
                            <TextInput value={tplForm.data.name} onChange={(e) => tplForm.setData('name', e.target.value)} />
                        </FormField>
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                            <span className="text-xs font-medium text-gray-700">Status template</span>
                            <Checkbox label={tplForm.data.is_active ? 'Aktif' : 'Nonaktif'} checked={tplForm.data.is_active} onChange={(e) => tplForm.setData('is_active', e.target.checked)} />
                        </div>
                        {(errors.is_active || errors.product_category_ids) && (
                            <p className="text-xs text-red-600 mt-1">{errors.is_active ?? errors.product_category_ids}</p>
                        )}
                    </FormSection>
                    <FormSection variant="drawer" title="Berlaku Untuk" description="Kategori produk memakai template ini (read-only, diatur seeder)">
                        <div className="flex flex-wrap gap-1">
                            {productCategories.map((c) => (
                                <Badge key={c.id} color="blue" size="sm">{c.name}</Badge>
                            ))}
                        </div>
                    </FormSection>
                </form>
            </SlideOver>

            <SlideOver
                open={itemPanel}
                onClose={() => setItemPanel(false)}
                title="Edit Item"
                subtitle={itemForm.data.label}
                icon={<IconEdit className="w-4 h-4" />}
                footer={
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setItemPanel(false)} className="shrink-0">Batal</Button>
                        <Button type="submit" form="item-form" loading={itemForm.processing} className="flex-1 justify-center">
                            Simpan Perubahan
                        </Button>
                    </div>
                }
            >
                <form id="item-form" onSubmit={submitItem}>
                    <FormSection variant="drawer" title="Item Checklist" description="Label tampil di form sidak (riwayat lama tidak berubah)">
                        <FormField compact label="Label" error={errors.label} required>
                            <TextInput value={itemForm.data.label} onChange={(e) => itemForm.setData('label', e.target.value)} />
                        </FormField>
                        {itemForm.data.type === 'binary_choice' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <FormField compact label="Opsi positif" error={errors.option_positive} required>
                                    <TextInput value={itemForm.data.option_positive} onChange={(e) => itemForm.setData('option_positive', e.target.value)} />
                                </FormField>
                                <FormField compact label="Opsi negatif" error={errors.option_negative} required>
                                    <TextInput value={itemForm.data.option_negative} onChange={(e) => itemForm.setData('option_negative', e.target.value)} />
                                </FormField>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">Item teks bebas — jawaban berupa catatan.</p>
                        )}
                    </FormSection>
                </form>
            </SlideOver>
        </AppLayout>
    );
}
