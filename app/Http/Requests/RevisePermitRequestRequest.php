<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class RevisePermitRequestRequest extends FormRequest
{
    private const MAX_PERMIT_DAYS = 7;

    private const SPECIAL_ACTIVITY_TYPES = ['pameran', 'event', 'meeting_internal', 'stock_opname', 'langganan_parkir', 'customer_form'];

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

    public function after(): array
    {
        return [
            function ($validator) {
                $permit = $this->route('permitRequest');
                $types = $permit?->activity_types ?? [];

                if (array_intersect($types, self::SPECIAL_ACTIVITY_TYPES)
                    || ! $this->filled('work_start_date')
                    || ! $this->filled('work_end_date')) {
                    return;
                }

                try {
                    $start = Carbon::parse($this->input('work_start_date'));
                    $end = Carbon::parse($this->input('work_end_date'));
                } catch (\Throwable) {
                    return;
                }

                if ($end->lt($start)) {
                    $validator->errors()->add('work_end_date', 'Tanggal selesai tidak boleh sebelum tanggal mulai.');
                } elseif ($end->gt($start->copy()->addDays(self::MAX_PERMIT_DAYS - 1))) {
                    $validator->errors()->add('work_end_date', 'Tanggal selesai maksimal '.self::MAX_PERMIT_DAYS.' hari setelah tanggal mulai.');
                }
            },
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
