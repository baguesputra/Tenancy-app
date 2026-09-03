import AppLayout from '@/Layouts/AppLayout';
import PermitFormFields from '@/Pages/TenantPortal/Permits/Partials/PermitFormFields';
import { useForm } from '@inertiajs/react';

export default function Create({ tenants, departments }) {
    const { data, setData, post, processing, errors } = useForm({
        tenant_id: '',
        store_name_snapshot: '',
        floor_snapshot: '',
        block_snapshot: '',
        unit_number_snapshot: '',
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
        post('/permit-requests');
    };

    const toggleDept = (id) => {
        const current = data.accompanying_department_ids;
        setData('accompanying_department_ids', current.includes(id)
            ? current.filter((d) => d !== id)
            : [...current, id]);
    };

    return (
        <AppLayout>
            <div className="p-6 max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Ajukan Surat Izin Atas Nama Tenant</h1>
                <form onSubmit={submit}>
                    <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Tenant</label>
                        <select
                            value={data.tenant_id}
                            onChange={(e) => setData('tenant_id', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">-- Area Umum Mall (bukan tenant spesifik) --</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {!data.tenant_id && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Nama Lokasi/Area"
                                    value={data.store_name_snapshot}
                                    onChange={(e) => setData('store_name_snapshot', e.target.value)}
                                    className="border rounded px-3 py-2 text-sm col-span-2"
                                />
                                <input
                                    placeholder="Lantai"
                                    value={data.floor_snapshot}
                                    onChange={(e) => setData('floor_snapshot', e.target.value)}
                                    className="border rounded px-3 py-2 text-sm"
                                />
                                <input
                                    placeholder="Blok"
                                    value={data.block_snapshot}
                                    onChange={(e) => setData('block_snapshot', e.target.value)}
                                    className="border rounded px-3 py-2 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <PermitFormFields data={data} setData={setData} errors={errors} />

                    {data.is_external && (
                        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                            <h2 className="font-semibold text-gray-700 mb-3">Departemen Pendampingan</h2>
                            <div className="flex flex-wrap gap-3">
                                {departments.map((d) => (
                                    <label key={d.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={data.accompanying_department_ids.includes(d.id)}
                                            onChange={() => toggleDept(d.id)}
                                        />
                                        {d.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={processing} className="bg-blue-600 text-white px-6 py-2 rounded font-medium">
                        Ajukan
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}