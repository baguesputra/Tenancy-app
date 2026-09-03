import PortalLayout from '@/Layouts/PortalLayout';
import PermitFormFields from './Partials/PermitFormFields';
import { useForm } from '@inertiajs/react';

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
    });

    const submit = (e) => {
        e.preventDefault();
        post('/portal/permits');
    };

    return (
        <PortalLayout>
            <div className="p-6 max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Ajukan Surat Izin</h1>
                <form onSubmit={submit}>
                    <PermitFormFields data={data} setData={setData} errors={errors} />
                    <button type="submit" disabled={processing} className="bg-blue-600 text-white px-6 py-2 rounded font-medium">
                        Ajukan
                    </button>
                </form>
            </div>
        </PortalLayout>
    );
}