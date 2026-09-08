import PortalLayout from '@/Layouts/PortalLayout';
import PermitFormFields from './Partials/PermitFormFields';
import { useForm } from '@inertiajs/react';
import Button from '@/Components/Form/Button';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        permit_number: '',
        activity_types: [],
        request_date: '',
        pic_name: '',
        pic_phone: '',
        is_external: false,
        contractor_company: '',
        contractor_pic: '',
        contractor_address: '',
        contractor_phone: '',
        job_type: '',
        work_start_date: '',
        work_end_date: '',
        work_start_time: '',
        work_end_time: '',
        access_route: '',
        notes: '',
        workers: [{ name: '' }],
        goods: [{ description: '', quantity_note: '' }],
        accompanying_department_ids: [],
    });

    const submit = (e) => {
        e.preventDefault();
        post('/portal/permits');
    };

    return (
        <PortalLayout>
            <div className="px-6 sm:px-8 py-6 flex-1 max-w-3xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Ajukan Surat Izin</h1>
                <p className="text-sm text-gray-500 mb-6">Isi form di bawah untuk mengajukan izin baru</p>

                <form onSubmit={submit}>
                    <PermitFormFields data={data} setData={setData} errors={errors} departments={departments} />
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Mengirim...' : 'Ajukan'}
                    </Button>
                </form>
            </div>
        </PortalLayout>
    );
}