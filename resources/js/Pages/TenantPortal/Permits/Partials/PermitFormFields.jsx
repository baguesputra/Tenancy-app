import { ACTIVITY_TYPES } from '@/Constants/permitActivityTypes';

export default function PermitFormFields({ data, setData, errors }) {
    const toggleActivityType = (value) => {
        const current = data.activity_types || [];
        setData('activity_types', current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value]);
    };

    const updateWorker = (idx, value) => {
        const next = [...data.workers];
        next[idx] = { name: value };
        setData('workers', next);
    };

    const addWorker = () => setData('workers', [...data.workers, { name: '' }]);
    const removeWorker = (idx) => setData('workers', data.workers.filter((_, i) => i !== idx));

    const updateGood = (idx, field, value) => {
        const next = [...data.goods];
        next[idx] = { ...next[idx], [field]: value };
        setData('goods', next);
    };

    const addGood = () => setData('goods', [...data.goods, { description: '', quantity_note: '' }]);
    const removeGood = (idx) => setData('goods', data.goods.filter((_, i) => i !== idx));

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                <h2 className="font-semibold text-gray-700 mb-4">Informasi Umum</h2>

                <Field label="Nomor Surat" error={errors.permit_number}>
                    <input
                        value={data.permit_number}
                        onChange={(e) => setData('permit_number', e.target.value)}
                        placeholder="307/TC/VIII/26"
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <Field label="Jenis Kegiatan" error={errors.activity_types}>
                    <div className="grid grid-cols-2 gap-2">
                        {ACTIVITY_TYPES.map((type) => (
                            <label key={type.value} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.activity_types?.includes(type.value)}
                                    onChange={() => toggleActivityType(type.value)}
                                />
                                {type.label}
                            </label>
                        ))}
                    </div>
                </Field>

                <Field label="Tanggal Pengajuan" error={errors.request_date}>
                    <input
                        type="date"
                        value={data.request_date}
                        onChange={(e) => setData('request_date', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Nama Penanggung Jawab" error={errors.pic_name}>
                        <input
                            value={data.pic_name}
                            onChange={(e) => setData('pic_name', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                    <Field label="Telepon PIC" error={errors.pic_phone}>
                        <input
                            value={data.pic_phone}
                            onChange={(e) => setData('pic_phone', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </Field>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                <label className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        checked={data.is_external}
                        onChange={(e) => setData('is_external', e.target.checked)}
                    />
                    <span className="font-semibold text-gray-700">Melibatkan Vendor/Kontraktor Eksternal</span>
                </label>

                {data.is_external && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nama Perusahaan" error={errors.contractor_company}>
                                <input
                                    value={data.contractor_company}
                                    onChange={(e) => setData('contractor_company', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </Field>
                            <Field label="Penanggung Jawab" error={errors.contractor_pic}>
                                <input
                                    value={data.contractor_pic}
                                    onChange={(e) => setData('contractor_pic', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </Field>
                        </div>
                        <Field label="Alamat" error={errors.contractor_address}>
                            <textarea
                                value={data.contractor_address}
                                onChange={(e) => setData('contractor_address', e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                rows={2}
                            />
                        </Field>
                        <Field label="Telp/HP/Fax" error={errors.contractor_phone}>
                            <input
                                value={data.contractor_phone}
                                onChange={(e) => setData('contractor_phone', e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            />
                        </Field>
                    </>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-gray-700">Daftar Pekerja</h2>
                    <button type="button" onClick={addWorker} className="text-sm text-blue-600">+ Tambah</button>
                </div>
                {data.workers.map((worker, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                        <input
                            value={worker.name}
                            onChange={(e) => updateWorker(idx, e.target.value)}
                            placeholder={`Nama pekerja ${idx + 1}`}
                            className="flex-1 border rounded px-3 py-2 text-sm"
                        />
                        {data.workers.length > 1 && (
                            <button type="button" onClick={() => removeWorker(idx)} className="text-red-500 text-sm">Hapus</button>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-gray-700">Daftar Barang/Peralatan</h2>
                    <button type="button" onClick={addGood} className="text-sm text-blue-600">+ Tambah</button>
                </div>
                {data.goods.map((good, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                        <input
                            value={good.description}
                            onChange={(e) => updateGood(idx, 'description', e.target.value)}
                            placeholder="Nama barang"
                            className="flex-1 border rounded px-3 py-2 text-sm"
                        />
                        <input
                            value={good.quantity_note}
                            onChange={(e) => updateGood(idx, 'quantity_note', e.target.value)}
                            placeholder="Jumlah (misal: 8 koli)"
                            className="w-40 border rounded px-3 py-2 text-sm"
                        />
                        {data.goods.length > 1 && (
                            <button type="button" onClick={() => removeGood(idx)} className="text-red-500 text-sm">Hapus</button>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
                <h2 className="font-semibold text-gray-700 mb-4">Pekerjaan</h2>

                <Field label="Jenis Pekerjaan" error={errors.job_type}>
                    <input
                        value={data.job_type}
                        onChange={(e) => setData('job_type', e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Tanggal Mulai" error={errors.work_start_date}>
                        <input type="date" value={data.work_start_date} onChange={(e) => setData('work_start_date', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                    <Field label="Tanggal Selesai" error={errors.work_end_date}>
                        <input type="date" value={data.work_end_date} onChange={(e) => setData('work_end_date', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Jam Mulai" error={errors.work_start_time}>
                        <input type="time" value={data.work_start_time} onChange={(e) => setData('work_start_time', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                    <Field label="Jam Selesai" error={errors.work_end_time}>
                        <input type="time" value={data.work_end_time} onChange={(e) => setData('work_end_time', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </Field>
                </div>

                <Field label="Akses Masuk/Keluar" error={errors.access_route}>
                    <textarea value={data.access_route} onChange={(e) => setData('access_route', e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
                </Field>

                <Field label="Keterangan" error={errors.notes}>
                    <textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
                </Field>
            </div>
        </>
    );
}

function Field({ label, error, children }) {
    return (
        <div className="mb-3">
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}