<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePermitRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // otorisasi akses sudah dihandle middleware auth/auth:tenant di route
    }

    public function rules(): array
    {
        $isPortal = $this->routeIs('tenant-portal.*');
        $isRoleMarketing = ! $isPortal && $this->user('web')?->hasRole('marketing_staff');
        // ponytail: mode ikut form, bukan cuma role — marketing paksa pameran, staff bebas pilih
        $isExhibition = ! $isPortal && ($isRoleMarketing || $this->input('form_mode') === 'pameran');

        return [
            'form_mode' => 'nullable|in:umum,pameran',
            // Portal (staff toko) tidak perlu isi tenant_id/lokasi — otomatis dari akun login
            // Marketing terkunci: field non-pameran di-exclude (diabaikan), bukan ditolak,
            // karena form selalu kirim string kosong untuk field tak terpakai.
            'tenant_id' => $isPortal ? 'prohibited' : ($isExhibition ? 'required|exists:tenants,id' : 'nullable|exists:tenants,id'),
            'store_name_snapshot' => $isPortal || $isExhibition ? 'exclude' : 'nullable|required_without_all:tenant_id,contractor_company|string|min:3|max:255',
            'floor_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',
            'block_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',
            'unit_number_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',

            'permit_number' => 'prohibited',
            'activity_types' => $isExhibition ? 'exclude' : 'required|array|min:1',
            'activity_types.*' => 'in:kerja,lembur,masuk_keluar_barang,masuk_keluar_alat,fit_out_pull_out_renovasi,pameran',
            'request_date' => 'required|date',
            'pic_name' => $isExhibition ? 'required|string|max:255' : 'nullable|string|max:255',
            'pic_phone' => $isExhibition ? 'required|string|max:30' : 'nullable|string|max:30',
            'is_external' => 'boolean',
            'contractor_company' => $isExhibition ? 'exclude' : 'nullable|string|min:3|max:255',
            'contractor_pic' => $isExhibition ? 'exclude' : 'nullable|string|max:255',
            'contractor_address' => $isExhibition ? 'exclude' : 'nullable|string',
            'contractor_phone' => $isExhibition ? 'exclude' : 'nullable|string|max:30',
            'job_type' => 'nullable|string|max:255',
            'work_start_date' => $isExhibition ? 'required|date' : 'nullable|date',
            'work_end_date' => $isExhibition ? 'required|date|after_or_equal:work_start_date' : 'nullable|date',
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
            'access_route' => 'nullable|string',
            'notes' => 'nullable|string',
            'stand_name' => $isExhibition ? 'required|string|max:255' : 'exclude',
            'goods_light' => $isExhibition ? 'nullable|array' : 'exclude',
            'goods_light.*.description' => 'nullable|string|max:255',
            'goods_light.*.quantity_note' => 'nullable|string|max:100',
            'goods_heavy' => $isExhibition ? 'nullable|array' : 'exclude',
            'goods_heavy.*.description' => 'nullable|string|max:255',
            'goods_heavy.*.quantity_note' => 'nullable|string|max:100',
            'workers' => 'nullable|array',
            'workers.*.name' => 'nullable|string|max:255',
            'goods' => $isExhibition ? 'exclude' : 'nullable|array',
            'goods.*.description' => 'nullable|string|max:255',
            'goods.*.quantity_note' => 'nullable|string|max:100',
            'accompanying_department_ids' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'tenant_id.prohibited' => 'Field ini tidak berlaku untuk pengajuan dari portal tenant.',
            'permit_number.prohibited' => 'Nomor surat dibuat otomatis oleh sistem.',
        ];
    }
}
