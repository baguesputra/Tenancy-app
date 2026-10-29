<?php

namespace App\Http\Requests;

use App\Services\PermitRequestVisibilityService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class StorePermitRequestRequest extends FormRequest
{
    private const MAX_PERMIT_DAYS = 7;

    public function authorize(): bool
    {
        $user = $this->user('web');

        if (! $user) {
            return false;
        }

        $visibility = app(PermitRequestVisibilityService::class);
        $isPameran = $this->input('form_mode') === 'pameran'
            || in_array('pameran', (array) $this->input('activity_types', []), true);

        return ! $isPameran || $visibility->canCreatePameran($user);
    }

    public function rules(): array
    {
        $user = $this->user('web');
        $visibility = app(PermitRequestVisibilityService::class);
        // ponytail: mode ikut form, bukan cuma role — marketing paksa pameran, staff bebas pilih
        $isExhibition = ($user && $visibility->isMarketingLocked($user)) || $this->input('form_mode') === 'pameran';
        $isKegiatan = ! $isExhibition && $this->input('form_mode') === 'kegiatan';
        $isParkir = ! $isExhibition && ! $isKegiatan && $this->input('form_mode') === 'parkir';
        $isCustomerForm = ! $isExhibition && ! $isKegiatan && ! $isParkir && $this->input('form_mode') === 'customer';
        $isSpecialForm = $this->isSpecialForm();

        return [
            'form_mode' => 'nullable|in:umum,kerja,kegiatan,pameran,parkir,customer',
            // Marketing terkunci: field non-pameran di-exclude (diabaikan), bukan ditolak,
            // karena form selalu kirim string kosong untuk field tak terpakai.
            'tenant_id' => ($isExhibition || $isKegiatan || $isParkir) ? 'required|exists:tenants,id' : 'nullable|exists:tenants,id',
            'store_name_snapshot' => $isSpecialForm ? 'exclude' : 'nullable|required_without_all:tenant_id,contractor_company|string|min:3|max:255',
            'floor_snapshot' => 'nullable|string|max:50',
            'block_snapshot' => 'nullable|string|max:50',
            'unit_number_snapshot' => 'nullable|string|max:50',

            'permit_number' => 'prohibited',
            'activity_types' => $isSpecialForm ? 'exclude' : 'required|array|min:1',
            'activity_types.*' => 'in:kerja,lembur,masuk_barang,keluar_barang,masuk_alat,keluar_alat,fit_out,pull_out,renovasi,pameran,event,meeting_internal,stock_opname,langganan_parkir,customer_form',
            'kegiatan_type' => $isKegiatan ? 'required|in:event,meeting_internal,stock_opname' : 'exclude',
            'event_name' => $isKegiatan ? 'required|string|min:3|max:255' : 'exclude',
            'event_area' => $isKegiatan ? 'required|string|min:3|max:255' : 'exclude',
            'request_date' => $isCustomerForm ? 'exclude' : 'required|date',
            'pic_name' => $isCustomerForm ? 'exclude' : ($isExhibition ? 'required|string|max:255' : ($isKegiatan || $isParkir ? 'required|string|min:3|max:255' : 'nullable|string|max:255')),
            'pic_phone' => $isExhibition ? 'required|string|max:30' : 'nullable|string|max:30',
            'is_external' => $isParkir ? 'exclude' : 'boolean',
            'contractor_company' => $isSpecialForm ? 'exclude' : 'nullable|string|min:3|max:255',
            'contractor_pic' => $isSpecialForm ? 'exclude' : 'nullable|string|max:255',
            'contractor_address' => $isSpecialForm ? 'exclude' : 'nullable|string',
            'contractor_phone' => $isSpecialForm ? 'exclude' : 'nullable|string|max:30',
            'job_type' => ($isKegiatan || $isParkir) ? 'exclude' : 'nullable|string|max:255',
            'work_start_date' => ($isExhibition || $isKegiatan) ? 'required|date' : ($isParkir ? 'exclude' : 'nullable|date'),
            'work_end_date' => ($isExhibition || $isKegiatan) ? 'required|date|after_or_equal:work_start_date' : ($isParkir ? 'exclude' : 'nullable|date'),
            'work_start_time' => $isParkir ? 'exclude' : 'nullable|date_format:H:i',
            'work_end_time' => $isParkir ? 'exclude' : 'nullable|date_format:H:i',
            'access_route' => ($isKegiatan || $isParkir) ? 'exclude' : 'nullable|string',
            'notes' => 'nullable|string',
            'needs_manager_approval' => ($isExhibition || $isKegiatan || $isParkir) ? 'exclude' : 'boolean',
            'worker_count' => $isSpecialForm ? 'exclude' : 'required|integer|min:1|max:500',
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
            'goods' => $isSpecialForm ? 'exclude' : 'nullable|array',
            'goods.*.description' => 'nullable|string|max:255',
            'goods.*.quantity_note' => 'nullable|string|max:100',
            'goods.*.unit' => 'nullable|string|max:30',
            'accompanying_department_ids' => ($isKegiatan || $isParkir || $isCustomerForm) ? 'exclude' : 'nullable|array',
            'customer_company_name' => $isCustomerForm ? 'required|string|min:3|max:255' : 'exclude',
            'customer_invoice_address' => $isCustomerForm ? 'required|string|max:1000' : 'exclude',
            'customer_company_phone' => $isCustomerForm ? 'required|string|max:50' : 'exclude',
            'customer_npwp_number' => $isCustomerForm ? 'nullable|string|max:50' : 'exclude',
            'customer_npwp_name' => $isCustomerForm ? 'nullable|string|max:255' : 'exclude',
            'customer_npwp_address' => $isCustomerForm ? 'nullable|string|max:1000' : 'exclude',
            'customer_pic_name' => $isCustomerForm ? 'required|string|min:3|max:255' : 'exclude',
            'customer_pic_position' => $isCustomerForm ? 'required|string|max:255' : 'exclude',
            'customer_pic_ktp' => $isCustomerForm ? 'required|string|max:50' : 'exclude',
            'customer_pic_phone' => $isCustomerForm ? 'required|string|max:50' : 'exclude',
            'customer_pic_email' => $isCustomerForm ? 'required|email|max:255' : 'exclude',
            'customer_tenant_relation' => $isCustomerForm ? 'nullable|string|max:255' : 'exclude',
            'customer_billing_description' => $isCustomerForm ? 'required|string|max:1000' : 'exclude',
            'customer_amount' => $isCustomerForm ? 'required|numeric|min:0|max:999999999999.99' : 'exclude',
            'customer_city' => $isCustomerForm ? 'required|string|max:100' : 'exclude',
            'customer_notes' => $isCustomerForm ? 'nullable|string|max:2000' : 'exclude',
            'customer_request_date' => $isCustomerForm ? 'required|date' : 'exclude',
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $types = $this->input('activity_types');

                if (is_array($types) && in_array('fit_out', $types, true) && in_array('pull_out', $types, true)) {
                    $validator->errors()->add('activity_types', 'Fit Out dan Pull Out hanya bisa dipilih salah satu.');
                }

                if ($this->isSpecialForm()
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

    private function isSpecialForm(): bool
    {
        $user = $this->user('web');

        return ($user && app(PermitRequestVisibilityService::class)->isMarketingLocked($user))
            || in_array($this->input('form_mode'), ['pameran', 'kegiatan', 'parkir', 'customer'], true);
    }

    public function messages(): array
    {
        return [
            'permit_number.prohibited' => 'Nomor surat dibuat otomatis oleh sistem.',
        ];
    }
}
