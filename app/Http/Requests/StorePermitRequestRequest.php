<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePermitRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // otorisasi akses sudah dihandle middleware auth di route
    }

    public function rules(): array
    {
        $isRoleMarketing = $this->user('web')?->hasRole('marketing');
        // ponytail: mode ikut form, bukan cuma role — marketing paksa pameran, staff bebas pilih
        $isExhibition = $isRoleMarketing || $this->input('form_mode') === 'pameran';
        $isKegiatan = ! $isExhibition && $this->input('form_mode') === 'kegiatan';
        $isParkir = ! $isExhibition && ! $isKegiatan && $this->input('form_mode') === 'parkir';

        return [
            'form_mode' => 'nullable|in:umum,kerja,kegiatan,pameran,parkir',
            // Marketing terkunci: field non-pameran di-exclude (diabaikan), bukan ditolak,
            // karena form selalu kirim string kosong untuk field tak terpakai.
            'tenant_id' => ($isExhibition || $isKegiatan || $isParkir) ? 'required|exists:tenants,id' : 'nullable|exists:tenants,id',
            'store_name_snapshot' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|required_without_all:tenant_id,contractor_company|string|min:3|max:255',
            'floor_snapshot' => 'nullable|string|max:50',
            'block_snapshot' => 'nullable|string|max:50',
            'unit_number_snapshot' => 'nullable|string|max:50',

            'permit_number' => 'prohibited',
            'activity_types' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'required|array|min:1',
            'activity_types.*' => 'in:kerja,lembur,masuk_barang,keluar_barang,masuk_alat,keluar_alat,fit_out,pull_out,renovasi,pameran,event,meeting_internal,stock_opname,langganan_parkir',
            'kegiatan_type' => $isKegiatan ? 'required|in:event,meeting_internal,stock_opname' : 'exclude',
            'event_name' => $isKegiatan ? 'required|string|min:3|max:255' : 'exclude',
            'event_area' => $isKegiatan ? 'required|string|min:3|max:255' : 'exclude',
            'request_date' => 'required|date',
            'pic_name' => $isExhibition ? 'required|string|max:255' : ($isKegiatan || $isParkir ? 'required|string|min:3|max:255' : 'nullable|string|max:255'),
            'pic_phone' => $isExhibition ? 'required|string|max:30' : 'nullable|string|max:30',
            'is_external' => $isParkir ? 'exclude' : 'boolean',
            'contractor_company' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|string|min:3|max:255',
            'contractor_pic' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|string|max:255',
            'contractor_address' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|string',
            'contractor_phone' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|string|max:30',
            'job_type' => ($isKegiatan || $isParkir) ? 'exclude' : 'nullable|string|max:255',
            'work_start_date' => ($isExhibition || $isKegiatan) ? 'required|date' : ($isParkir ? 'exclude' : 'nullable|date'),
            'work_end_date' => ($isExhibition || $isKegiatan) ? 'required|date|after_or_equal:work_start_date' : ($isParkir ? 'exclude' : 'nullable|date'),
            'work_start_time' => $isParkir ? 'exclude' : 'nullable|date_format:H:i',
            'work_end_time' => $isParkir ? 'exclude' : 'nullable|date_format:H:i',
            'access_route' => ($isKegiatan || $isParkir) ? 'exclude' : 'nullable|string',
            'notes' => 'nullable|string',
            'needs_manager_approval' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'boolean',
            'worker_count' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'required|integer|min:1|max:500',
            'stand_name' => $isExhibition ? 'required|string|max:255' : 'exclude',
            'vehicle_plate' => $isParkir ? 'required|string|max:20' : 'exclude',
            'vehicle_type' => $isParkir ? 'required|in:mobil,motor' : 'exclude',
            'applicant_name' => $isParkir ? 'required|string|min:3|max:255' : 'exclude',
            'applicant_position' => $isParkir ? 'required|string|min:3|max:255' : 'exclude',
            'goods_light' => $isExhibition ? 'nullable|array' : 'exclude',
            'goods_light.*.description' => 'nullable|string|max:255',
            'goods_light.*.quantity_note' => 'nullable|string|max:100',
            'goods_light.*.unit' => 'nullable|string|max:30',
            'goods_heavy' => $isExhibition ? 'nullable|array' : 'exclude',
            'goods_heavy.*.description' => 'nullable|string|max:255',
            'goods_heavy.*.quantity_note' => 'nullable|string|max:100',
            'goods_heavy.*.unit' => 'nullable|string|max:30',
            'goods' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'nullable|array',
            'goods.*.description' => 'nullable|string|max:255',
            'goods.*.quantity_note' => 'nullable|string|max:100',
            'goods.*.unit' => 'nullable|string|max:30',
            'accompanying_department_ids' => ($isKegiatan || $isParkir) ? 'exclude' : 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'permit_number.prohibited' => 'Nomor surat dibuat otomatis oleh sistem.',
        ];
    }
}
