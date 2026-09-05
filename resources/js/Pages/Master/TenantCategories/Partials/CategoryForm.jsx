import { useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import FormSection from '@/Components/Form/FormSection';
import TextInput from '@/Components/Form/TextInput';
import Textarea from '@/Components/Form/Textarea';
import Button from '@/Components/Form/Button';

export default function CategoryForm({ category, routePrefix }) {
    const isEdit = !!category;

    const { data, setData, post, put, processing, errors } = useForm({
        name: category?.name ?? '',
        description: category?.description ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        isEdit ? put(`/${routePrefix}/${category.id}`) : post(`/${routePrefix}`);
    };

    return (
        <form onSubmit={submit} className="max-w-lg">
            <FormSection>
                <FormField label="Nama Kategori" error={errors.name} required>
                    <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                </FormField>

                <FormField label="Keterangan" error={errors.description}>
                    <Textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Jelaskan maksud kategori ini..."
                    />
                </FormField>
            </FormSection>

            <Button type="submit" disabled={processing}>
                {isEdit ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
        </form>
    );
}