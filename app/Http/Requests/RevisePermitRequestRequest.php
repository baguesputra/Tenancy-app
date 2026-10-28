<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RevisePermitRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $permit = $this->route('permitRequest');
        if (in_array('customer_form', $permit?->activity_types ?? [], true)) {
            return [
                'customer_company_name' => 'required|string|min:3|max:255',
                'customer_invoice_address' => 'required|string|max:1000',
                'customer_company_phone' => 'required|string|max:50',
                'customer_npwp_number' => 'nullable|string|max:50',
                'customer_npwp_name' => 'nullable|string|max:255',
                'customer_npwp_address' => 'nullable|string|max:1000',
                'customer_pic_name' => 'required|string|min:3|max:255',
                'customer_pic_position' => 'required|string|max:255',
                'customer_pic_ktp' => 'required|string|max:50',
                'customer_pic_phone' => 'required|string|max:50',
                'customer_pic_email' => 'required|email|max:255',
                'customer_tenant_relation' => 'nullable|string|max:255',
                'customer_billing_description' => 'required|string|max:1000',
                'customer_amount' => 'required|numeric|min:0|max:999999999999.99',
                'customer_city' => 'required|string|max:100',
                'customer_notes' => 'nullable|string|max:2000',
                'customer_request_date' => 'required|date',
                'reason' => 'required|string|min:10|max:1000',
            ];
        }

        return [
            'work_start_date' => 'required|date',
            'work_end_date' => 'required|date|after_or_equal:work_start_date',
            'work_end_time' => 'nullable|date_format:H:i',
            'access_route' => 'nullable|string',
            'reason' => 'required|string|min:10|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan revisi wajib diisi.',
            'reason.min' => 'Alasan revisi minimal 10 karakter.',
        ];
    }
}
