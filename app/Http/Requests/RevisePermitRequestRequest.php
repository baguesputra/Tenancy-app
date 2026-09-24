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
