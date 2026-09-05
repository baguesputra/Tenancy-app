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

        return [
            // Portal (staff toko) tidak perlu isi tenant_id/lokasi — otomatis dari akun login
            'tenant_id' => $isPortal ? 'prohibited' : 'nullable|exists:tenants,id',
            'store_name_snapshot' => $isPortal ? 'prohibited' : 'nullable|required_without:tenant_id|string|max:255',
            'floor_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',
            'block_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',
            'unit_number_snapshot' => $isPortal ? 'prohibited' : 'nullable|string|max:50',

            'permit_number' => 'required|string|max:100',
            'activity_types' => 'required|array|min:1',
            'request_date' => 'required|date',
            'pic_name' => 'nullable|string|max:255',
            'pic_phone' => 'nullable|string|max:30',
            'is_external' => 'boolean',
            'contractor_company' => 'nullable|string|max:255',
            'contractor_pic' => 'nullable|string|max:255',
            'contractor_address' => 'nullable|string',
            'contractor_phone' => 'nullable|string|max:30',
            'job_type' => 'nullable|string|max:255',
            'work_start_date' => 'nullable|date',
            'work_end_date' => 'nullable|date',
            'work_start_time' => 'nullable',
            'work_end_time' => 'nullable',
            'access_route' => 'nullable|string',
            'notes' => 'nullable|string',
            'workers' => 'nullable|array',
            'workers.*.name' => 'nullable|string|max:255',
            'goods' => 'nullable|array',
            'goods.*.description' => 'nullable|string|max:255',
            'goods.*.quantity_note' => 'nullable|string|max:100',
            'accompanying_department_ids' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'tenant_id.prohibited' => 'Field ini tidak berlaku untuk pengajuan dari portal tenant.',
        ];
    }
}