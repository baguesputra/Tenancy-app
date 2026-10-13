import AppLayout from '@/Layouts/AppLayout';
import { Link, useForm } from '@inertiajs/react';
import FormSection from '@/Components/Form/FormSection';
import FormField from '@/Components/Form/FormField';
import Textarea from '@/Components/Form/Textarea';
import MultiSelect from '@/Components/Form/MultiSelect';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

export default function Create({ picName, staffByDepartment }) {
    const departments = Object.keys(staffByDepartment ?? {});
    const { data, setData, post, processing, errors } = useForm({
        participant_ids: [],
        notes: '',
    });

    const setDeptSelection = (dept, ids) => {
        const deptIds = new Set((staffByDepartment[dept] ?? []).map((u) => u.id));
        const kept = data.participant_ids.filter((id) => !deptIds.has(id));
        setData('participant_ids', [...kept, ...ids]);
    };

    const submit = (e) => {
        e.preventDefault();
        post('/inspection-sessions');
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 w-full max-w-2xl mx-auto">
                <div className="mb-5">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Mulai Sesi Sidak Baru</h1>
                    <p className="text-sm text-gray-500 mt-0.5">PIC otomatis = pembuat sesi, pilih tim yang ikut serta</p>
                </div>

                <form onSubmit={submit}>
                    <FormSection title="Penanggung Jawab (PIC)" description="Otomatis terisi nama pembuat sesi">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{picName}</span>
                            <Badge color="blue">PIC</Badge>
                        </div>
                    </FormSection>

                    <FormSection title="Tim Sidak" description="Pilih minimal 1 orang dari Building Service, Engineering, atau Security">
                        {departments.map((dept) => {
                            const options = (staffByDepartment[dept] ?? []).map((u) => ({ value: u.id, label: u.name }));
                            const deptIds = new Set(options.map((o) => o.value));
                            return (
                                <FormField key={dept} label={dept} error={errors.participant_ids}>
                                    {options.length > 0 ? (
                                        <MultiSelect
                                            value={data.participant_ids.filter((id) => deptIds.has(id))}
                                            onChange={(ids) => setDeptSelection(dept, ids)}
                                            options={options}
                                            placeholder={`Pilih dari ${dept}...`}
                                        />
                                    ) : (
                                        <p className="text-xs text-gray-400">Tidak ada staff aktif {dept} di cabang ini.</p>
                                    )}
                                </FormField>
                            );
                        })}
                        {errors.participant_ids && (
                            <p className="text-xs text-red-600 mt-1">{errors.participant_ids}</p>
                        )}
                    </FormSection>

                    <FormSection title="Catatan Sesi">
                        <FormField label="Catatan" error={errors.notes}>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                placeholder="cth. Sidak rutin mingguan area GF..."
                            />
                        </FormField>
                    </FormSection>

                    <div className="flex gap-2 mt-4">
                        <Link href="/inspection-sessions" className="flex-1">
                            <Button type="button" variant="secondary" className="w-full justify-center !py-3 min-h-[48px]">
                                Batal
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="flex-1 justify-center !py-3 min-h-[48px]">
                            {processing ? 'Memulai...' : 'Mulai Sesi'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
